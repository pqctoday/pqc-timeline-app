// SPDX-License-Identifier: GPL-3.0-only
// openssh_client_worker.js — ssh client WASM worker (scaffold demo mode)
//
// Loaded by SshEngine for each handshake run.
// Protocol:
//   INIT  { c2sSab, s2cSab, mode }  → loads WASM JS (async), sends READY synchronously
//   START { mode }                   → server worker drives all handshake events
//
// The full ssh client _main() integration is pending the --wrap + MODULARIZE
// rebuild of openssh-client.wasm.

let mode = 'pqc'

console.error = () => {}

self.addEventListener('error', (ev) => {
  ev.preventDefault()
})

self.onmessage = (e) => {
  const { type: msgType, ...rest } = e.data

  if (msgType === 'INIT') {
    mode = rest.mode ?? 'pqc'

    self.Module = {
      __wasm_is_server: 0,
      __wasm_sab_c2s: rest.c2sSab ? new Int32Array(rest.c2sSab) : null,
      __wasm_sab_s2c: rest.s2cSab ? new Int32Array(rest.s2cSab) : null,
      print(_text) {},
      printErr(_text) {},
    }

    try {
      importScripts(`/wasm/openssh-client.js?v=${Date.now()}`)
    } catch (_err) {
      // File missing or parse error — fine for scaffold mode
    }

    self.postMessage({ type: 'READY' })
    return
  }

  // START — server worker drives all handshake events; client is passive.
}
