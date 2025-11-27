// Wrapper for mlkem-wasm
let mlkem: any = null;

export const load = async () => {
    if (!mlkem) {
        try {
            // @ts-ignore
            mlkem = await import('mlkem-wasm');

            // Check if it's a default export or named exports
            if (mlkem.default) {
                mlkem = mlkem.default;
            }
        } catch (e) {
            console.error('[mlkem_wasm] Import failed:', e);
            throw e;
        }
    }
    return mlkem;
};

export const generateKey = async (params: any, exportPublic = true, ops?: string[]) => {
    const mod = await load();
    try {
        const keypair = await mod.generateKey(params, exportPublic, ops);

        // Export keys to raw bytes
        const publicKey = new Uint8Array(await mod.exportKey("raw-public", keypair.publicKey));
        const secretKey = new Uint8Array(await mod.exportKey("raw-seed", keypair.privateKey));

        return { publicKey, secretKey };
    } catch (e) {
        console.error('[mlkem_wasm] generateKey failed:', e);
        throw e;
    }
};

export const encapsulateBits = async (params: any, publicKeyBytes: Uint8Array) => {
    const mod = await load();
    // Import the key from bytes
    const publicKey = await mod.importKey("raw-public", publicKeyBytes, params, true, ["encapsulateBits"]);
    const result = await mod.encapsulateBits(params, publicKey);

    // Convert ArrayBuffers to Uint8Arrays
    return {
        ciphertext: new Uint8Array(result.ciphertext),
        sharedKey: new Uint8Array(result.sharedKey)
    };
};

export const decapsulateBits = async (params: any, secretKeyBytes: Uint8Array, ciphertext: Uint8Array) => {
    const mod = await load();
    // Import the key from bytes
    const secretKey = await mod.importKey("raw-seed", secretKeyBytes, params, true, ["decapsulateBits"]);
    const result = await mod.decapsulateBits(params, secretKey, ciphertext);

    // Convert ArrayBuffer to Uint8Array
    return new Uint8Array(result);
};
