export interface Key {
    id: string;
    name: string;
    type: 'public' | 'private';
    algorithm: 'ML-KEM' | 'ML-DSA';
    value: string; // For mock mode
    data?: Uint8Array; // For WASM mode
    dataType?: 'string' | 'binary';
    timestamp: number;
}

export interface LogEntry {
    id: string;
    timestamp: string;
    keyLabel: string;
    operation: string;
    result: string;
    executionTime: number; // in ms
}
