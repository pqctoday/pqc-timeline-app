// Wrapper for @openforge-sh/liboqs (ML-KEM)
import { createMLKEM512, createMLKEM768, createMLKEM1024 } from '@openforge-sh/liboqs';

export const generateKey = async (params: { name: string }, _exportPublic = true, _ops?: string[]) => {
    let createAlgo;
    switch (params.name) {
        case 'ML-KEM-512': createAlgo = createMLKEM512; break;
        case 'ML-KEM-768': createAlgo = createMLKEM768; break;
        case 'ML-KEM-1024': createAlgo = createMLKEM1024; break;
        default: throw new Error(`Unknown algorithm: ${params.name}`);
    }

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

export const decapsulateBits = async (params: { name: string }, secretKey: Uint8Array, ciphertext: Uint8Array) => {
    let createAlgo;
    switch (params.name) {
        case 'ML-KEM-512': createAlgo = createMLKEM512; break;
        case 'ML-KEM-768': createAlgo = createMLKEM768; break;
        case 'ML-KEM-1024': createAlgo = createMLKEM1024; break;
        default: throw new Error(`Unknown algorithm: ${params.name}`);
    }

    const instance = await createAlgo();
    try {
        return instance.decapsulate(ciphertext, secretKey);
    } finally {
        if (instance.destroy) instance.destroy();
    }
};

export const encapsulateBits = async (params: { name: string }, publicKey: Uint8Array) => {
    let createAlgo;
    switch (params.name) {
        case 'ML-KEM-512': createAlgo = createMLKEM512; break;
        case 'ML-KEM-768': createAlgo = createMLKEM768; break;
        case 'ML-KEM-1024': createAlgo = createMLKEM1024; break;
        default: throw new Error(`Unknown algorithm: ${params.name}`);
    }

    const instance = await createAlgo();
    try {
        const result = instance.encapsulate(publicKey);
        return {
            ciphertext: result.ciphertext,
            sharedKey: result.sharedSecret
        };
    } finally {
        if (instance.destroy) instance.destroy();
    }
};
