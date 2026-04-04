// SPDX-License-Identifier: GPL-3.0-only
let strongSwanModule = null
let isDaemonRunning = false
let cachedGetFunctionListPtr = null

const createConfigFiles = (configs) => {
  if (!strongSwanModule) return

  // charon is compiled with --prefix=/usr/local so it reads from /usr/local/etc/
  const dirs = ['/usr', '/usr/local', '/usr/local/etc', '/usr/local/etc/strongswan.d']
  for (const dir of dirs) {
    try {
      strongSwanModule.FS.mkdir(dir)
    } catch (_) {
      // Ignore EEXIST — Emscripten errno objects don't have a .code string
    }
  }

  for (const [filename, content] of Object.entries(configs)) {
    const path = filename.startsWith('/') ? filename : `/usr/local/etc/${filename}`
    try {
      strongSwanModule.FS.writeFile(path, content)
      // Verify the write landed
      const written = strongSwanModule.FS.readFile(path, { encoding: 'utf8' })
      self.postMessage({
        type: 'LOG',
        payload: { level: 'info', text: `[WASM FS] wrote ${path} (${written.length} chars)` },
      })
    } catch (e) {
      self.postMessage({
        type: 'LOG',
        payload: { level: 'error', text: `[WASM FS] failed to write ${path}: ${e}` },
      })
    }
  }
}

self.onmessage = async (e) => {
  const { type, payload } = e.data

  if (type === 'INIT') {
    try {
      // For classic non-modularized Emscripten builds, the configuration object must be mapped
      // to self.Module prior to evaluating the script payload.
      self.Module = {
        // The Emscripten build names the binary 'charon.wasm' (the IKEv2 daemon);
        // we store it as 'strongswan.wasm' — remap so the fetch resolves correctly.
        locateFile: (path) => `/wasm/${path === 'charon.wasm' ? 'strongswan.wasm' : path}`,
        noInitialRun: true, // Prevent invoking main() automatically on load!
        noExitRuntime: true, // Prevent wiping the linear memory when main() exits
        print: (text) => {
          self.postMessage({ type: 'LOG', payload: { level: 'info', text } })
        },
        printErr: (text) => {
          self.postMessage({ type: 'LOG', payload: { level: 'error', text } })
        },
        // We shim the custom dlopen / dlsym that we patched into pkcs11_library.c
        wasm_dlopen: (filenamePtr, _flags) => {
          const file = self.Module.UTF8ToString(filenamePtr)
          self.postMessage({
            type: 'LOG',
            payload: { level: 'info', text: `[WASM DLOPEN] Intercepted load request for: ${file}` },
          })
          return 1 // return valid handle
        },
        wasm_dlclose: (_handle) => {
          self.postMessage({
            type: 'LOG',
            payload: { level: 'info', text: `[WASM DLCLOSE] Successfully unloaded module handle` },
          })
          return 0 // success
        },
        wasm_dlsym: (_handle, symbolPtr) => {
          const sym = self.Module.UTF8ToString(symbolPtr)
          if (sym === 'C_GetFunctionList') {
            self.postMessage({
              type: 'LOG',
              payload: { level: 'info', text: `[WASM DLSYM] Binding JS SoftHSM hook to ${sym}!` },
            })

            if (cachedGetFunctionListPtr !== null) {
              return cachedGetFunctionListPtr
            }

            // This is the C-callable that returns CKR_OK and writes the function list pointer
            const cGetFunctionList = (_ppFunctionList) => {
              // Mock implementation
              return 0 // CKR_OK
            }
            cachedGetFunctionListPtr = self.Module.addFunction(cGetFunctionList, 'ii')
            return cachedGetFunctionListPtr
          }
          return 0
        },
        onRuntimeInitialized: () => {
          strongSwanModule = self.Module
          self.postMessage({ type: 'READY' })
        },
      }

      // Safely load the Emscripten WASM wrapper natively
      importScripts('/wasm/strongswan.js')
    } catch (err) {
      self.postMessage({ type: 'ERROR', payload: `Init error: ${err.message}` })
    }
  } else if (type === 'START_DAEMON') {
    if (isDaemonRunning) {
      self.postMessage({
        type: 'LOG',
        payload: { level: 'error', text: 'Daemon is already running in this worker block!' },
      })
      return
    }

    if (strongSwanModule && strongSwanModule._main) {
      try {
        if (payload) {
          createConfigFiles(payload)
        }
        isDaemonRunning = true
        // Starts the Charon Daemon
        strongSwanModule._main(0, 0)
      } catch (err) {
        self.postMessage({ type: 'ERROR', payload: `Daemon exited: ${err.message}` })
      } finally {
        isDaemonRunning = false
      }
    }
  }
}
