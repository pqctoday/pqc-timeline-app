// Wrapper for @openforge-sh/liboqs (ML-DSA)
import { createMLDSA44, createMLDSA65, createMLDSA87 } from '@openforge-sh/liboqs';

// We don't need a global liboqs object anymore since we import specific functions.
// However, to keep the `load` function contract if needed elsewhere (though it seems unused now), we can keep it or remove it.
// The original code had `load`, so I'll keep a dummy one or just remove it if I update the calls.
// Actually, `InteractivePlayground` calls `MLDSA.load()`. I should keep it to avoid breaking that call, 
// even if it just resolves immediately or does nothing.

export const load = async () => {
    // No-op for now as we use static imports which are bundled.
    // If we wanted dynamic imports, we'd do it inside the functions, but static is fine for now.
    return true;
};

const getAlgorithmFactory = (algName: string) => {
    switch (algName) {
        case 'ML-DSA-44': return createMLDSA44;
        case 'ML-DSA-65': return createMLDSA65;
        case 'ML-DSA-87': return createMLDSA87;
        default: throw new Error(`Unknown algorithm: ${algName}`);
    }
};

export const generateKey = async (params: any, _exportPublic = true, _ops?: string[]) => {
    const createAlgo = getAlgorithmFactory(params.name);
    const instance = await createAlgo();
    try {
        const keypair = instance.generateKeyPair();
        return {
            publicKey: keypair.publicKey,
            secretKey: keypair.secretKey
        };
    } finally {
        if (instance.destroy) instance.destroy();
    }
};

export const sign = async (message: Uint8Array, secretKey: Uint8Array) => {
    // Infer algorithm from key size
    let createAlgo;
    if (secretKey.length === 2560) createAlgo = createMLDSA44;
    else if (secretKey.length === 4032) createAlgo = createMLDSA65;
    else if (secretKey.length === 4896) createAlgo = createMLDSA87;
    else throw new Error(`Unknown private key size: ${secretKey.length}`);

    const instance = await createAlgo();
    try {
        return instance.sign(message, secretKey);
    } finally {
        if (instance.destroy) instance.destroy();
    }
};

export const verify = async (signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array) => {
    // Infer algorithm from key size
    let createAlgo;
    if (publicKey.length === 1312) createAlgo = createMLDSA44;
    else if (publicKey.length === 1952) createAlgo = createMLDSA65;
    else if (publicKey.length === 2592) createAlgo = createMLDSA87;
    else throw new Error(`Unknown public key size: ${publicKey.length}`);

    const instance = await createAlgo();
    try {
        return instance.verify(message, signature, publicKey);
    } finally {
        if (instance.destroy) instance.destroy();
    }
};
