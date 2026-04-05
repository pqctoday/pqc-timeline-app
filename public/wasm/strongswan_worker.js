// SPDX-License-Identifier: GPL-3.0-only
// v20260405-0001 — softhsm proxy bridge
//
// strongSwan charon WASM worker — charon + softhsmv3 wired via PKCS#11 proxy.
// Custom socket_wasm plugin for network I/O (no libc poll/recvmsg).
// Only network I/O uses SharedArrayBuffer (JS in-memory UDP loopback between workers).

// ── Network inbox SharedArrayBuffer state ────────────────────────────────────
let netInboxSab = null
let netInboxI32 = null
let netInboxBytes = null
let ikeSocketFd = -1
let boundIp = 0
let boundPort = 0
let workerRole = 'responder'

const originalConsoleError = console.error
console.error = (...args) => {
  const text = args
    .map((a) => {
      if (a instanceof Error) return a.stack || a.message
      if (typeof a === 'object' && a !== null) return JSON.stringify(a, null, 2)
      return String(a)
    })
    .join(' ')
  self.postMessage({ type: 'LOG', payload: { level: 'error', text: `[WASM TRAP] ${text}` } })
  originalConsoleError(...args)
}

self.addEventListener('error', (event) => {
  const err = event.error || event
  const trace = err.stack ? err.stack : err.message
  self.postMessage({ type: 'LOG', payload: { level: 'error', text: `[WASM EXCEPTION] ${trace}` } })
  event.preventDefault() // prevent bubbling to the main thread
})

self.addEventListener('unhandledrejection', (event) => {
  self.postMessage({
    type: 'LOG',
    payload: { level: 'error', text: `[WORKER] Unhandled rejection: ${event.reason}` },
  })
})

self.onmessage = (e) => {
  const { type, payload } = e.data

  // Handle START: call charon _main (blocks forever in receive loop)
  if (type === 'START' && self.Module && self.Module._main) {
    const stackAlloc = self.Module.stackAlloc
    const stackSave = self.Module.stackSave
    const stackRestore = self.Module.stackRestore

    const savedSp = stackSave()

    // Build standard argc/argv: [ "./charon", "--role", "<role>" ]
    const argvStrings = ['./charon', '--role', workerRole]
    const ptrs = []
    for (const str of argvStrings) {
      const len = lengthBytesUTF8(str) + 1
      const ptr = stackAlloc(len)
      stringToUTF8(str, ptr, len)
      ptrs.push(ptr)
    }
    const argvPtr = stackAlloc(ptrs.length * 4)
    const dv = new DataView(self._wasmMemory.buffer)
    for (let i = 0; i < ptrs.length; i++) dv.setUint32(argvPtr + i * 4, ptrs[i], true)

    self.postMessage({
      type: 'LOG',
      payload: { level: 'info', text: `[WASM] Starting charon daemon (role=${workerRole})...` },
    })
    self.Module._main(ptrs.length, argvPtr)

    stackRestore(savedSp)
    return
  }

  // Handle GEN_KEYS: call wasm_hsm_init with user-selected algorithm
  if (type === 'GEN_KEYS' && self.Module && self.Module._wasm_hsm_init) {
    const { algType, slot0Size, slot1Size } = payload || {
      algType: 1,
      slot0Size: 3072,
      slot1Size: 3072,
    }
    const algName = algType === 1 ? 'RSA' : 'ML-DSA'
    self.postMessage({
      type: 'LOG',
      payload: {
        level: 'info',
        text: `[WORKER] Generating keys: ${algName}-${slot0Size} / ${algName}-${slot1Size}`,
      },
    })
    const rc = self.Module._wasm_hsm_init(algType, slot0Size, slot1Size)
    if (rc === 0) {
      self.postMessage({ type: 'KEYS_READY', payload: { slot0Size, slot1Size } })
    } else {
      self.postMessage({
        type: 'LOG',
        payload: { level: 'error', text: `[WORKER] wasm_hsm_init failed: rc=${rc}` },
      })
    }
    return
  }

  if (type !== 'INIT') return

  const initConfigs = payload.configs || {}
  const initPsk = payload.psk || ''
  workerRole = payload.role || 'responder'
  netInboxSab = payload.netSab || payload.netInboxSab
  if (netInboxSab) {
    netInboxI32 = new Int32Array(netInboxSab, 0, 4)
    netInboxBytes = new Uint8Array(netInboxSab, 16)
    self.postMessage({
      type: 'LOG',
      payload: { level: 'info', text: `[WASM] Network SAB connected (role=${workerRole})` },
    })
  } else {
    self.postMessage({
      type: 'LOG',
      payload: { level: 'error', text: '[WASM] WARNING: No network SAB received!' },
    })
  }

  try {
    self.Module = {
      locateFile: (path) => `/wasm/${path === 'charon.wasm' ? 'strongswan.wasm' : path}`,
      noInitialRun: true,
      noExitRuntime: true,

      preRun: [
        () => {
          const wasmFS = typeof FS !== 'undefined' ? FS : null // eslint-disable-line no-undef
          if (!wasmFS) return
          for (const dir of [
            '/usr',
            '/usr/local',
            '/var',
            '/var/run',
            '/var/lib',
            '/var/lib/softhsmv3',
            '/var/lib/softhsmv3/tokens',
            '/etc',
            '/usr/local/etc',
            '/usr/local/etc/strongswan.d',
          ]) {
            try {
              wasmFS.mkdir(dir)
            } catch (_) {}
          }
          wasmFS.writeFile(
            '/etc/softhsmv3.conf',
            'directories.tokendir = /var/lib/softhsmv3/tokens\nobjectstore.backend = file\nlog.level = DEBUG\n'
          )
          self.postMessage({
            type: 'LOG',
            payload: { level: 'info', text: '[WASM FS] wrote /etc/softhsmv3.conf' },
          })

          for (let [filename, content] of Object.entries(initConfigs)) {
            const path = filename.startsWith('/') ? filename : `/usr/local/etc/${filename}`
            try {
              if (filename.includes('strongswan.conf')) {
                content = content.replace(
                  /load_modular\s*=\s*yes/g,
                  'load_modular = no\n  load = openssl random nonce aes sha1 sha2 hmac pkcs11'
                )
              }
              wasmFS.writeFile(path, content)
              self.postMessage({
                type: 'LOG',
                payload: {
                  level: 'info',
                  text: `[WASM FS] wrote ${path} (${content.length} chars)`,
                },
              })
            } catch (err) {
              self.postMessage({
                type: 'LOG',
                payload: { level: 'error', text: `[WASM FS] failed to write ${path}: ${err}` },
              })
            }
          }
          // Inject PSK into Emscripten ENV so C getenv("WASM_PSK") picks it up
          if (initPsk && typeof ENV !== 'undefined') {
            ENV['WASM_PSK'] = initPsk
            self.postMessage({
              type: 'LOG',
              payload: { level: 'info', text: `[WASM ENV] Set WASM_PSK (${initPsk.length} chars)` },
            })
          }
        },
      ],

      print: (text) => {
        self.postMessage({ type: 'LOG', payload: { level: 'info', text } })
      },
      printErr: (text) => {
        const isCharonLog = /^\d{2}:\d{2}:\d{2}/.test(text) || text.trim() === ''
        self.postMessage({ type: 'LOG', payload: { level: isCharonLog ? 'info' : 'error', text } })
      },

      instantiateWasm: (imports, successCallback) => {
        const env = imports.env || imports.a || imports.asmLibraryArg || {}
        const nameToKey = {}
        for (const [key, fn] of Object.entries(env)) {
          if (fn && fn.name) nameToKey[fn.name] = key
        }

        let wasmMemory = null
        const heap8 = () => new Uint8Array(wasmMemory.buffer)
        const heap16 = () => new Int16Array(wasmMemory.buffer)
        const heap32 = () => new Int32Array(wasmMemory.buffer)
        const heap32u = () => new Uint32Array(wasmMemory.buffer)
        const utf8ToString = (ptr) => {
          const h = heap8()
          let s = '',
            i = ptr
          while (h[i]) {
            s += String.fromCharCode(h[i++])
          }
          return s
        }

        const unmatchedKeys = Object.keys(env).filter((k) => !Object.values(nameToKey).includes(k))
        for (const key of unmatchedKeys) {
          const origFn = env[key]
          env[key] = (...args) => {
            if (args.length >= 1 && wasmMemory) {
              try {
                const str = utf8ToString(args[0])
                if (str && (str.endsWith('.so') || str.includes('lib'))) return 1
                if (str === 'C_GetFunctionList') {
                  if (self.Module._C_GetFunctionList && self.Module.addFunction)
                    return self.Module.addFunction(self.Module._C_GetFunctionList, 'ii')
                  return 0
                }
              } catch (_) {}
            }
            return origFn ? origFn(...args) : 0
          }
        }

        fetch('/wasm/strongswan.wasm')
          .then((r) => r.arrayBuffer())
          .then((buf) => WebAssembly.instantiate(buf, imports))
          .then(({ instance, module: wasmMod }) => {
            for (const v of Object.values(instance.exports)) {
              if (v instanceof WebAssembly.Memory) {
                wasmMemory = v
                break
              }
            }
            self._wasmMemory = wasmMemory
            // Set SAB BEFORE successCallback — socket_wasm's EM_JS reads Module._wasm_net_sab
            // during onRuntimeInitialized which fires inside successCallback
            if (netInboxSab) self.Module._wasm_net_sab = netInboxSab
            successCallback(instance, wasmMod)
          })
          .catch((err) => self.postMessage({ type: 'ERROR', payload: `WASM setup failed: ${err}` }))
        return {}
      },

      onRuntimeInitialized: () => {
        self.postMessage({ type: 'READY' })
      },
      onExit: (code) => {
        self.postMessage({
          type: 'LOG',
          payload: { level: 'error', text: `[WASM] charon exited with code ${code}` },
        })
      },
      onAbort: (reason) => {
        self.postMessage({
          type: 'LOG',
          payload: { level: 'error', text: `[WASM] charon ABORTED: ${reason}` },
        })
      },
    }

    importScripts('/wasm/strongswan.js')
  } catch (err) {
    self.postMessage({ type: 'ERROR', payload: `Init error: ${err.message ?? err}` })
  }
}
