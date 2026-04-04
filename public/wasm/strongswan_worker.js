// SPDX-License-Identifier: GPL-3.0-only
// v20260404-1445 — cache bust
//
// strongSwan charon WASM worker — statically linked with softhsmv3 + OpenSSL.
// Custom socket_wasm plugin for network I/O (no libc poll/recvmsg).
// Only network I/O uses SharedArrayBuffer (JS in-memory UDP loopback between workers).

// ── Network inbox SharedArrayBuffer state ────────────────────────────────────
let netInboxSab = null
let netInboxI32 = null
let netInboxBytes = null
let ikeSocketFd = -1
let boundIp = 0
let boundPort = 0

self.addEventListener('unhandledrejection', (event) => {
  self.postMessage({ type: 'LOG', payload: { level: 'error', text: `[WORKER] Unhandled rejection: ${event.reason}` } })
})

self.onmessage = (e) => {
  const { type, payload } = e.data

  // Handle START: call charon _main (blocks forever in receive loop)
  if (type === 'START' && self.Module && self.Module._main) {
    const stackAlloc   = self.Module.stackAlloc
    const stackSave    = self.Module.stackSave
    const stackRestore = self.Module.stackRestore

    const savedSp = stackSave()
    const h8 = () => new Uint8Array(self._wasmMemory.buffer)
    const h32u = () => new Uint32Array(self._wasmMemory.buffer)

    const progNameBytes = new Uint8Array([99, 104, 97, 114, 111, 110, 0])
    const namePtr = stackAlloc(progNameBytes.length)
    h8().set(progNameBytes, namePtr)
    const argvPtr = stackAlloc(8)
    h32u()[argvPtr >> 2]       = namePtr
    h32u()[(argvPtr + 4) >> 2] = 0

    self.postMessage({ type: 'LOG', payload: { level: 'info', text: '[WASM] Starting charon daemon...' } })
    try {
      self.Module._main(1, argvPtr)
    } catch (e) {
      stackRestore(savedSp)
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : typeof e === 'object' ? JSON.stringify(e) : String(e)
      if (e && e.status !== undefined) {
        self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[WASM] charon exited (status=${e.status})` } })
      } else {
        self.postMessage({ type: 'ERROR', payload: `charon crashed: ${msg}` })
      }
    }
    return
  }

  // Handle GEN_KEYS: initialize HSM tokens and generate key pairs
  // algType: 1=RSA, 2=ML-DSA. size: RSA bits (2048/3072/4096) or ML-DSA level (44/65/87)
  if (type === 'GEN_KEYS' && self.Module && self.Module._wasm_hsm_init) {
    const { algType, slot0Size, slot1Size } = payload || { algType: 1, slot0Size: 2048, slot1Size: 2048 }
    const algName = algType === 1 ? 'RSA' : 'ML-DSA'
    self.postMessage({ type: 'LOG', payload: { level: 'info',
      text: `[WORKER] Generating keys: ${algName}-${slot0Size} / ${algName}-${slot1Size}` } })
    const rc = self.Module._wasm_hsm_init(algType, slot0Size, slot1Size)
    if (rc === 0) {
      self.postMessage({ type: 'KEYS_READY', payload: { slot0Size, slot1Size } })
    } else {
      self.postMessage({ type: 'LOG', payload: { level: 'error', text: `[WORKER] wasm_hsm_init failed: rc=${rc}` } })
    }
    return
  }

  if (type !== 'INIT') return

  const initPayload = payload || {}
  const initConfigs = initPayload.configs || {}

  if (initPayload.netSab) {
    netInboxSab   = initPayload.netSab
    netInboxI32   = new Int32Array(netInboxSab, 0, 4)
    netInboxBytes = new Uint8Array(netInboxSab, 0)
    self.postMessage({ type: 'LOG', payload: { level: 'info', text: '[WASM] Network SAB connected' } })
  }

  try {
    self.Module = {
      locateFile: (path) => `/wasm/${path === 'charon.wasm' ? 'strongswan.wasm' : path}`,
      noInitialRun: true,
      noExitRuntime: true,

      preRun: [() => {
        const wasmFS = typeof FS !== 'undefined' ? FS : null // eslint-disable-line no-undef
        if (!wasmFS) return
        for (const dir of ['/usr', '/usr/local', '/usr/local/etc', '/usr/local/etc/strongswan.d',
                           '/var', '/var/run', '/var/lib', '/var/lib/softhsmv3', '/var/lib/softhsmv3/tokens', '/etc']) {
          try { wasmFS.mkdir(dir) } catch (_) {}
        }
        wasmFS.writeFile('/etc/softhsmv3.conf',
          'directories.tokendir = /var/lib/softhsmv3/tokens\nobjectstore.backend = file\nlog.level = DEBUG\n')
        self.postMessage({ type: 'LOG', payload: { level: 'info', text: '[WASM FS] wrote /etc/softhsmv3.conf' } })
        for (const [filename, content] of Object.entries(initConfigs)) {
          const path = filename.startsWith('/') ? filename : `/usr/local/etc/${filename}`
          try {
            wasmFS.writeFile(path, content)
            self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[WASM FS] wrote ${path} (${content.length} chars)` } })
          } catch (err) {
            self.postMessage({ type: 'LOG', payload: { level: 'error', text: `[WASM FS] failed to write ${path}: ${err}` } })
          }
        }
        // Pass config via ENV — bison file parser crashes with EFPC in WASM
        if (typeof ENV !== 'undefined' && initConfigs['strongswan.conf']) { // eslint-disable-line no-undef
          ENV['STRONGSWAN_CONF_DATA'] = initConfigs['strongswan.conf'] // eslint-disable-line no-undef
          self.postMessage({ type: 'LOG', payload: { level: 'info', text: '[WASM ENV] Set STRONGSWAN_CONF_DATA' } })
        }
      }],

      print: (text) => {
        self.postMessage({ type: 'LOG', payload: { level: 'info', text } })
      },
      printErr: (text) => {
        const isCharonLog = /^\d{2}:\d{2}:\d{2}/.test(text) || text.trim() === ''
        self.postMessage({ type: 'LOG', payload: { level: isCharonLog ? 'info' : 'error', text } })
      },

      instantiateWasm: (imports, successCallback) => {
        const env = imports.a
        self.postMessage({ type: 'LOG', payload: { level: 'info',
          text: `[WASM IMPORTS] count: ${env ? Object.keys(env).length : 0}` } })

        // ── Build reverse lookup: Emscripten function name → minified key ────
        // The wasmImports object in strongswan.js maps minified keys to named
        // functions. We parse the JS source to build a name→key map so our
        // overrides work regardless of key shuffling between builds.
        //
        // Alternative: read the wasmImports definition from the evaluated JS.
        // Since strongswan.js sets `var wasmImports = {key: namedFn, ...}`,
        // the named functions are global vars. We can match env[key] === globalFn.
        // But simpler: just build a name→key map from the known import list.
        const nameToKey = {}
        // Match by checking which key maps to which named Emscripten function.
        // In the evaluated JS, each import value is a reference to the named function.
        // We check env[key].name or compare with known globals.
        for (const [key, fn] of Object.entries(env)) {
          if (fn && fn.name) {
            nameToKey[fn.name] = key
          }
        }
        self.postMessage({ type: 'LOG', payload: { level: 'info',
          text: `[WASM] Import name map: socket=${nameToKey['___syscall_socket']}, bind=${nameToKey['___syscall_bind']}, fd_write=${nameToKey['_fd_write']}, fcntl=${nameToKey['___syscall_fcntl64']}, poll=${nameToKey['___syscall_poll']}` } })

        // ── WASM memory access ───────────────────────────────────────────────
        let wasmMemory = null
        const heap8  = () => new Uint8Array(wasmMemory.buffer)
        const heap16 = () => new Int16Array(wasmMemory.buffer)
        const heap32 = () => new Int32Array(wasmMemory.buffer)
        const heap32u = () => new Uint32Array(wasmMemory.buffer)
        const utf8ToString = (ptr) => {
          const h = heap8(); let s = '', i = ptr
          while (h[i]) { s += String.fromCharCode(h[i++]) }
          return s
        }

        // ── Helper: override import by Emscripten function name ──────────────
        const override = (name, fn) => {
          const key = nameToKey[name]
          if (key) {
            env[key] = fn
            return
          }
          // Fallback: scan env for a function whose toString contains the name
          for (const [k, v] of Object.entries(env)) {
            if (v && typeof v === 'function' && String(v).includes(name.replace(/^_/, ''))) {
              env[k] = fn
              self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[WASM] Override '${name}' via fallback scan → key '${k}'` } })
              return
            }
          }
          self.postMessage({ type: 'LOG', payload: { level: 'error', text: `[WASM] Import '${name}' not found (nameToKey has ${Object.keys(nameToKey).length} entries)` } })
        }

        // ── Network syscall replacements ─────────────────────────────────────
        override('___syscall_socket', (domain, type, _protocol) => {
          if (domain === 2 && type === 2) {
            ikeSocketFd = 42
            self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[NET] socket(AF_INET,SOCK_DGRAM) → fd=${ikeSocketFd}` } })
            return ikeSocketFd
          }
          return -1
        })

        override('___syscall_bind', (fd, addrPtr, _addrLen) => {
          if (fd === ikeSocketFd && addrPtr) {
            try {
              const h = heap8()
              boundPort = (h[addrPtr + 2] << 8) | h[addrPtr + 3]
              boundIp   = (h[addrPtr + 4] << 24) | (h[addrPtr + 5] << 16)
                        | (h[addrPtr + 6] << 8)  |  h[addrPtr + 7]
              self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[NET] bind fd=${fd} port=${boundPort}` } })
            } catch(_) {}
          }
          return 0
        })

        override('___syscall_connect', () => 0)
        override('___syscall_ioctl', () => 0)

        // fcntl64: pass through for non-IKE fds
        const fcntlKey = nameToKey['___syscall_fcntl64']
        if (fcntlKey) {
          const _origFcntl = env[fcntlKey]
          env[fcntlKey] = (fd, cmd, arg) => {
            if (fd === ikeSocketFd) return 0
            return _origFcntl ? _origFcntl(fd, cmd, arg) : 0
          }
        }

        override('___syscall_sendto', (fd, bufPtr, len, _flags, destAddrPtr, _destAddrLen) => {
          if (fd !== ikeSocketFd) return len
          try {
            const h = heap8()
            let destIp = 0, destPort = 0
            if (destAddrPtr) {
              destPort = (h[destAddrPtr + 2] << 8) | h[destAddrPtr + 3]
              destIp   = (h[destAddrPtr + 4] << 24) | (h[destAddrPtr + 5] << 16)
                       | (h[destAddrPtr + 6] << 8)  |  h[destAddrPtr + 7]
            }
            const data = h.slice(bufPtr, bufPtr + len)
            self.postMessage({ type: 'PACKET_OUT',
              payload: { srcIp: boundIp, srcPort: boundPort, destIp, destPort, data: data.buffer } },
              [data.buffer])
            self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[NET] sendto len=${len} destPort=${destPort}` } })
          } catch(err) {
            self.postMessage({ type: 'LOG', payload: { level: 'error', text: `[NET] sendto error: ${err}` } })
          }
          return len
        })

        override('___syscall_recvfrom', (fd, bufPtr, len, _flags, srcAddrPtr, srcAddrLenPtr) => {
          if (fd !== ikeSocketFd || !netInboxI32) return -11
          Atomics.wait(netInboxI32, 0, 0)
          const pktLen  = netInboxI32[1]
          const srcIp   = netInboxI32[2] >>> 0
          const srcPort = netInboxI32[3] >>> 0
          const copyLen = Math.min(pktLen, len)
          const h = heap8()
          h.set(netInboxBytes.subarray(16, 16 + copyLen), bufPtr)
          if (srcAddrPtr) {
            h[srcAddrPtr] = 0; h[srcAddrPtr + 1] = 2
            h[srcAddrPtr + 2] = (srcPort >> 8) & 0xff; h[srcAddrPtr + 3] = srcPort & 0xff
            h[srcAddrPtr + 4] = (srcIp >> 24) & 0xff; h[srcAddrPtr + 5] = (srcIp >> 16) & 0xff
            h[srcAddrPtr + 6] = (srcIp >> 8) & 0xff; h[srcAddrPtr + 7] = srcIp & 0xff
            if (srcAddrLenPtr) heap32()[srcAddrLenPtr >> 2] = 16
          }
          Atomics.store(netInboxI32, 0, 0)
          self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[NET] recvfrom → ${pktLen} bytes from port ${srcPort}` } })
          return copyLen
        })

        // ── WASM socket plugin imports ────────────────────────────────────────
        // These are called by socket_wasm.c (our custom socket plugin).
        // They bypass Emscripten's libc/SOCKFS entirely.
        self.postMessage({ type: 'LOG', payload: { level: 'info',
          text: `[WASM] wasm_net_receive key: ${nameToKey['_wasm_net_receive'] || 'NOT FOUND'}, wasm_net_send key: ${nameToKey['_wasm_net_send'] || 'NOT FOUND'}` } })
        override('_wasm_net_receive', (bufPtr, maxlen, srcIpPtr, srcPortPtr, destIpPtr, destPortPtr) => {
          if (!netInboxI32) return -1
          Atomics.wait(netInboxI32, 0, 0)  // block until packet
          const pktLen  = netInboxI32[1]
          const srcIp   = netInboxI32[2] >>> 0
          const srcPort = netInboxI32[3] >>> 0
          const copyLen = Math.min(pktLen, maxlen)
          const h = heap8()
          const u32 = heap32u()
          h.set(netInboxBytes.subarray(16, 16 + copyLen), bufPtr)
          u32[srcIpPtr >> 2]   = srcIp
          u32[srcPortPtr >> 2] = srcPort
          u32[destIpPtr >> 2]  = boundIp
          u32[destPortPtr >> 2] = boundPort
          Atomics.store(netInboxI32, 0, 0)  // mark EMPTY
          self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[NET] wasm_recv → ${pktLen} bytes from port ${srcPort}` } })
          return copyLen
        })

        override('_wasm_net_send', (bufPtr, len, destIp, destPort) => {
          try {
            const h = heap8()
            const data = h.slice(bufPtr, bufPtr + len)
            self.postMessage({ type: 'PACKET_OUT',
              payload: { srcIp: boundIp, srcPort: boundPort, destIp, destPort, data: data.buffer } },
              [data.buffer])
            self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[NET] wasm_send len=${len} destPort=${destPort}` } })
          } catch(err) {
            self.postMessage({ type: 'LOG', payload: { level: 'error', text: `[NET] wasm_send error: ${err}` } })
          }
          return len
        })

        // ── Brute-force: also override by scanning ALL env keys for abort stubs ──
        // This catches _wasm_net_receive/_wasm_net_send even if fn.name mapping fails
        const netRecvFn = env[nameToKey['_wasm_net_receive']]
        const netSendFn = env[nameToKey['_wasm_net_send']]
        if (!netRecvFn || (typeof netRecvFn === 'function' && String(netRecvFn).includes('abort'))) {
          // nameToKey worked but the function wasn't replaced, OR it failed
          for (const [k, v] of Object.entries(env)) {
            if (typeof v === 'function') {
              const src = String(v)
              if (src.includes('wasm_net_receive')) {
                env[k] = env[nameToKey['_wasm_net_receive']] || ((bufPtr, maxlen, srcIpPtr, srcPortPtr, destIpPtr, destPortPtr) => {
                  if (!netInboxI32) return -1
                  Atomics.wait(netInboxI32, 0, 0)
                  const pktLen = netInboxI32[1], srcIp = netInboxI32[2] >>> 0, srcPort = netInboxI32[3] >>> 0
                  const copyLen = Math.min(pktLen, maxlen)
                  const h = heap8(); const u32 = heap32u()
                  h.set(netInboxBytes.subarray(16, 16 + copyLen), bufPtr)
                  u32[srcIpPtr >> 2] = srcIp; u32[srcPortPtr >> 2] = srcPort
                  u32[destIpPtr >> 2] = boundIp; u32[destPortPtr >> 2] = boundPort
                  Atomics.store(netInboxI32, 0, 0)
                  self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[NET] wasm_recv → ${pktLen} bytes` } })
                  return copyLen
                })
                self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[WASM] Brute-force override wasm_net_receive at key '${k}'` } })
              }
              if (src.includes('wasm_net_send')) {
                env[k] = env[nameToKey['_wasm_net_send']] || ((bufPtr, len, destIp, destPort) => {
                  const h = heap8(); const data = h.slice(bufPtr, bufPtr + len)
                  self.postMessage({ type: 'PACKET_OUT',
                    payload: { srcIp: boundIp, srcPort: boundPort, destIp, destPort, data: data.buffer } }, [data.buffer])
                  self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[NET] wasm_send len=${len}` } })
                  return len
                })
                self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[WASM] Brute-force override wasm_net_send at key '${k}'` } })
              }
            }
          }
        }

        // ── sendmsg/recvmsg — kept for compatibility ────────────────────────
        // struct msghdr { msg_name, msg_namelen, msg_iov, msg_iovlen, msg_control, msg_controllen, msg_flags }
        // On wasm32: 7 fields × 4 bytes = 28 bytes
        override('___syscall_sendmsg', (fd, msgPtr, _flags) => {
          if (fd !== ikeSocketFd) return 0
          try {
            const u32 = heap32u()
            const h = heap8()
            const namePtr   = u32[msgPtr >> 2]
            const iovPtr    = u32[(msgPtr + 8) >> 2]
            const iovLen    = u32[(msgPtr + 12) >> 2]
            // Gather data from iovec
            let totalLen = 0
            const parts = []
            for (let i = 0; i < iovLen; i++) {
              const base = u32[(iovPtr + i * 8) >> 2]
              const len  = u32[(iovPtr + i * 8 + 4) >> 2]
              parts.push(h.slice(base, base + len))
              totalLen += len
            }
            const data = new Uint8Array(totalLen)
            let off = 0
            for (const p of parts) { data.set(p, off); off += p.length }
            // Read dest addr from msg_name (sockaddr_in)
            let destIp = 0, destPort = 0
            if (namePtr) {
              destPort = (h[namePtr + 2] << 8) | h[namePtr + 3]
              destIp   = (h[namePtr + 4] << 24) | (h[namePtr + 5] << 16) | (h[namePtr + 6] << 8) | h[namePtr + 7]
            }
            self.postMessage({ type: 'PACKET_OUT',
              payload: { srcIp: boundIp, srcPort: boundPort, destIp, destPort, data: data.buffer } },
              [data.buffer])
            self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[NET] sendmsg len=${totalLen} destPort=${destPort}` } })
            return totalLen
          } catch(err) {
            self.postMessage({ type: 'LOG', payload: { level: 'error', text: `[NET] sendmsg error: ${err}` } })
            return -1
          }
        })

        override('___syscall_recvmsg', (fd, msgPtr, _flags) => {
          if (fd !== ikeSocketFd || !netInboxI32) return -11 // EAGAIN
          Atomics.wait(netInboxI32, 0, 0) // block until packet
          const pktLen  = netInboxI32[1]
          const srcIp   = netInboxI32[2] >>> 0
          const srcPort = netInboxI32[3] >>> 0
          try {
            const u32 = heap32u()
            const h = heap8()
            const namePtr    = u32[msgPtr >> 2]
            const namelenPtr = (msgPtr + 4)
            const iovPtr     = u32[(msgPtr + 8) >> 2]
            const iovLen     = u32[(msgPtr + 12) >> 2]
            // Write source address into msg_name (sockaddr_in)
            if (namePtr) {
              h[namePtr] = 0; h[namePtr + 1] = 2 // AF_INET
              h[namePtr + 2] = (srcPort >> 8) & 0xff; h[namePtr + 3] = srcPort & 0xff
              h[namePtr + 4] = (srcIp >> 24) & 0xff; h[namePtr + 5] = (srcIp >> 16) & 0xff
              h[namePtr + 6] = (srcIp >> 8) & 0xff; h[namePtr + 7] = srcIp & 0xff
              u32[namelenPtr >> 2] = 16
            }
            // Scatter data into iovec
            let remaining = pktLen, written = 0
            for (let i = 0; i < iovLen && remaining > 0; i++) {
              const base = u32[(iovPtr + i * 8) >> 2]
              const len  = u32[(iovPtr + i * 8 + 4) >> 2]
              const copyLen = Math.min(remaining, len)
              h.set(netInboxBytes.subarray(16 + written, 16 + written + copyLen), base)
              written += copyLen
              remaining -= copyLen
            }
            // Clear msg_controllen (no ancillary data)
            u32[(msgPtr + 24) >> 2] = 0
            Atomics.store(netInboxI32, 0, 0)
            self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[NET] recvmsg → ${pktLen} bytes from port ${srcPort}` } })
            return pktLen
          } catch(err) {
            Atomics.store(netInboxI32, 0, 0)
            self.postMessage({ type: 'LOG', payload: { level: 'error', text: `[NET] recvmsg error: ${err}` } })
            return -1
          }
        })

        override('___syscall_poll', (fdsPtr, nfds, timeout) => {
          // Log ALL poll calls to see if the receive loop reaches here
          const fds = []
          try {
            const u32 = heap32u()
            for (let i = 0; i < Math.min(nfds, 8); i++) fds.push(new Int32Array(wasmMemory.buffer)[(fdsPtr + i * 8) >> 2])
          } catch(_) {}
          self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[POLL] nfds=${nfds} timeout=${timeout} fds=[${fds.join(',')}]` } })
          if (!netInboxI32) return 0
          const i32 = heap32()
          let hasIkeFd = false
          for (let i = 0; i < nfds; i++) {
            if (i32[(fdsPtr + i * 8) >> 2] === ikeSocketFd) { hasIkeFd = true; break }
          }
          if (!hasIkeFd) return 0
          if (Atomics.load(netInboxI32, 0) === 1) {
            const i16 = heap16()
            for (let i = 0; i < nfds; i++) {
              if (i32[(fdsPtr + i * 8) >> 2] === ikeSocketFd)
                i16[(fdsPtr + i * 8 + 6) >> 1] = 1
            }
            return 1
          }
          const result = timeout < 0
            ? Atomics.wait(netInboxI32, 0, 0)
            : Atomics.wait(netInboxI32, 0, 0, timeout)
          if (result === 'ok' && Atomics.load(netInboxI32, 0) === 1) {
            const i16 = heap16()
            for (let i = 0; i < nfds; i++) {
              if (heap32()[(fdsPtr + i * 8) >> 2] === ikeSocketFd)
                i16[(fdsPtr + i * 8 + 6) >> 1] = 1
            }
            return 1
          }
          return 0
        })

        // ── wasm_dlopen/dlsym — softhsmv3 is statically linked ───────────────
        // These aren't in the nameToKey map (they're custom symbols).
        // Find them by scanning for the keys NOT matched by known names.
        // wasm_dlopen and wasm_dlsym are the last two imports.
        const unmatchedKeys = Object.keys(env).filter(k => !Object.values(nameToKey).includes(k))
        self.postMessage({ type: 'LOG', payload: { level: 'info',
          text: `[WASM] Unmatched import keys (dlopen/dlsym candidates): ${unmatchedKeys.join(',')}` } })

        // Override ALL unmatched keys with dlopen/dlsym stubs
        for (const key of unmatchedKeys) {
          const origFn = env[key]
          env[key] = (...args) => {
            // Try to detect dlopen (takes string ptr + int) vs dlsym (takes handle + string ptr)
            if (args.length >= 1 && wasmMemory) {
              try {
                const str = utf8ToString(args[0])
                if (str && (str.endsWith('.so') || str.includes('lib'))) {
                  self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[PKCS11] dlopen(${str}) → statically linked` } })
                  return 1
                }
                if (str === 'C_GetFunctionList') {
                  self.postMessage({ type: 'LOG', payload: { level: 'info', text: `[PKCS11] dlsym(${str}) → statically linked, skipping` } })
                  return 0
                }
              } catch(_) {}
            }
            return origFn ? origFn(...args) : 0
          }
        }

        // ── Fetch, instantiate, start ────────────────────────────────────────
        self.postMessage({ type: 'LOG', payload: { level: 'info', text: '[WORKER] Fetching strongswan.wasm...' } })
        fetch('/wasm/strongswan.wasm')
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            self.postMessage({ type: 'LOG', payload: { level: 'info', text: '[WORKER] Compiling WASM...' } })
            return r.arrayBuffer()
          })
          .then(buf => WebAssembly.instantiate(buf, imports))
          .then(({ instance, module: wasmMod }) => {
            for (const v of Object.values(instance.exports)) {
              if (v instanceof WebAssembly.Memory) { wasmMemory = v; break }
            }
            self._wasmMemory = wasmMemory  // expose for START/GEN_KEYS handlers
            successCallback(instance, wasmMod)

            // Set the network SAB on Module so EM_JS code in socket_wasm.c can access it
            if (netInboxSab) {
              self.Module._wasm_net_sab = netInboxSab
              self.postMessage({ type: 'LOG', payload: { level: 'info', text: '[WASM] Network SAB attached to Module for EM_JS socket' } })
            }

            self.postMessage({ type: 'LOG', payload: { level: 'info', text: '[WASM] Initialized — softhsmv3 statically linked. Send GEN_KEYS then START.' } })
          })
          .catch(err => self.postMessage({ type: 'ERROR', payload: `WASM setup failed: ${err}` }))

        return {}
      },

      onRuntimeInitialized: () => {
        self.postMessage({ type: 'LOG', payload: { level: 'info', text: '[WASM] Runtime initialized' } })
        self.postMessage({ type: 'READY' })
      },
      onExit: (code) => {
        self.postMessage({ type: 'LOG', payload: { level: 'error', text: `[WASM] charon exited with code ${code}` } })
      },
      onAbort: (reason) => {
        self.postMessage({ type: 'LOG', payload: { level: 'error', text: `[WASM] charon ABORTED: ${reason}` } })
      },
    }

    importScripts('/wasm/strongswan.js')
    self.postMessage({ type: 'LOG', payload: { level: 'info', text: '[WORKER] importScripts done — WASM fetch in progress...' } })

  } catch (err) {
    self.postMessage({ type: 'ERROR', payload: `Init error: ${err.message ?? err}` })
  }
}
