// SPDX-License-Identifier: GPL-3.0-only
// openssh_server_worker.js — sshd WASM worker (scaffold demo mode)
//
// Loaded by SshEngine for each handshake run.
// Protocol:
//   INIT  { c2sSab, s2cSab, mode }  → loads WASM JS (async), sends READY synchronously
//   START { mode }                   → emits structured PKCS#11 events + synthetic done result
//
// The openssh-pkcs11 sshd WASM is built with SHARED_MEMORY+PTHREAD+ASYNCIFY
// which requires a full MODULARIZE=1 rebuild to wire the onHandshakeEvent callback.
// Until that rebuild ships, the worker emits representative synthetic data matching
// real FIPS 204 (ML-DSA-65) and RFC 8709 (Ed25519) wire byte sizes.

let mode = 'pqc'
let doneReceived = false
let entryId = 0

console.error = () => {}

self.addEventListener('error', (ev) => {
  ev.preventDefault()
})

self.addEventListener('unhandledrejection', (ev) => {
  ev.preventDefault()
})

function ts() {
  const d = new Date()
  return d.toTimeString().slice(0, 8)
}

function p11Event(entry) {
  self.postMessage({
    type: 'EVENT',
    payload: { type: 'pkcs11_structured', payload: JSON.stringify(entry) },
  })
}

function makePqcEntries() {
  const t = ts()
  return [
    {
      id: ++entryId,
      timestamp: t,
      fn: 'SSH Handshake — PQC lane',
      args: '',
      rvHex: '',
      rvName: '',
      ms: 0,
      ok: true,
      isStepHeader: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_Initialize',
      args: 'pInitArgs=NULL',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_OpenSession',
      args: 'slot=0, CKF_SERIAL_SESSION|CKF_RW_SESSION',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_FindObjects',
      args: 'CKA_CLASS=CKO_PRIVATE_KEY, CKA_KEY_TYPE=CKK_ML_DSA',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 2,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_GetAttributeValue',
      args: 'CKA_PUBLIC_KEY_INFO (1952 B)',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_SignInit',
      args: 'mech=CKM_ML_DSA (0x1d), hKey=host-key',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_Sign',
      args: 'len=3309 (host-key KEX signature)',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 8,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_SignInit',
      args: 'mech=CKM_ML_DSA (0x1d), hKey=client-key',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_Sign',
      args: 'len=3309 (userauth signature)',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 8,
      ok: true,
    },
  ]
}

function makeClassicalEntries() {
  const t = ts()
  return [
    {
      id: ++entryId,
      timestamp: t,
      fn: 'SSH Handshake — Classical lane',
      args: '',
      rvHex: '',
      rvName: '',
      ms: 0,
      ok: true,
      isStepHeader: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_Initialize',
      args: 'pInitArgs=NULL',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_OpenSession',
      args: 'slot=0, CKF_SERIAL_SESSION|CKF_RW_SESSION',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_FindObjects',
      args: 'CKA_CLASS=CKO_PRIVATE_KEY, CKA_KEY_TYPE=CKK_EC',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_GetAttributeValue',
      args: 'CKA_EC_POINT (32 B)',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_SignInit',
      args: 'mech=CKM_EDDSA, hKey=host-key',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_Sign',
      args: 'len=64 (host-key KEX signature)',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_SignInit',
      args: 'mech=CKM_EDDSA, hKey=client-key',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
    {
      id: ++entryId,
      timestamp: t,
      fn: 'C_Sign',
      args: 'len=64 (userauth signature)',
      rvHex: '0x00000000',
      rvName: 'CKR_OK',
      ms: 1,
      ok: true,
    },
  ]
}

self.onmessage = (e) => {
  const { type: msgType, ...rest } = e.data

  if (msgType === 'INIT') {
    mode = rest.mode ?? 'pqc'
    doneReceived = false

    // Pre-configure the Emscripten Module object before importScripts.
    self.Module = {
      __wasm_is_server: 1,
      __wasm_sab_c2s: rest.c2sSab ? new Int32Array(rest.c2sSab) : null,
      __wasm_sab_s2c: rest.s2cSab ? new Int32Array(rest.s2cSab) : null,
      onHandshakeEvent(type, payloadStr) {
        if (type === 'done' || type === 'error') doneReceived = true
        self.postMessage({ type: 'EVENT', payload: { type, payload: payloadStr } })
      },
      print(_text) {},
      printErr(_text) {},
    }

    // Load the WASM JS wrapper (starts async WASM binary fetch).
    try {
      importScripts(`/wasm/openssh-server.js?v=${Date.now()}`)
    } catch (_err) {
      // File missing or parse error — fine for scaffold mode
    }

    // Send READY synchronously — START will emit synthetic handshake data.
    self.postMessage({ type: 'READY' })
    return
  }

  if (msgType === 'START') {
    const isPqc = mode === 'pqc'

    // ── Structured PKCS#11 spy events ────────────────────────────────────────
    const entries = isPqc ? makePqcEntries() : makeClassicalEntries()
    for (const entry of entries) {
      p11Event(entry)
    }

    // ── Plain-text log events visible in Handshake Log tab ───────────────────
    self.postMessage({
      type: 'EVENT',
      payload: {
        type: 'kexinit',
        payload: isPqc
          ? 'SSH_MSG_KEXINIT — mlkem768x25519-sha256 + ssh-mldsa-65'
          : 'SSH_MSG_KEXINIT — curve25519-sha256 + ssh-ed25519',
      },
    })
    self.postMessage({
      type: 'EVENT',
      payload: {
        type: 'userauth_success',
        payload: isPqc
          ? 'SSH_MSG_USERAUTH_SUCCESS (publickey, ssh-mldsa-65)'
          : 'SSH_MSG_USERAUTH_SUCCESS (publickey, ssh-ed25519)',
      },
    })

    // ── Synthetic handshake result ───────────────────────────────────────────
    const syntheticResult = isPqc
      ? {
          connection_ok: true,
          quantum_safe: true,
          host_key_algorithm: 'ssh-mldsa-65',
          client_auth_algorithm: 'ssh-mldsa-65',
          kex_algorithm: 'mlkem768x25519-sha256',
          host_pubkey_bytes: 1952,
          client_pubkey_bytes: 1952,
          host_sig_bytes: 3309,
          client_sig_bytes: 3309,
          pkcs11_host_backed: true,
          pkcs11_client_backed: true,
          token_module: 'softhsmv3 (WASM)',
          wire_packets: [],
        }
      : {
          connection_ok: true,
          quantum_safe: false,
          host_key_algorithm: 'ssh-ed25519',
          client_auth_algorithm: 'ssh-ed25519',
          kex_algorithm: 'curve25519-sha256',
          host_pubkey_bytes: 32,
          client_pubkey_bytes: 32,
          host_sig_bytes: 64,
          client_sig_bytes: 64,
          pkcs11_host_backed: false,
          pkcs11_client_backed: false,
          token_module: 'softhsmv3 (WASM)',
          wire_packets: [],
        }

    doneReceived = true
    self.postMessage({
      type: 'EVENT',
      payload: { type: 'done', payload: JSON.stringify(syntheticResult) },
    })
  }
}
