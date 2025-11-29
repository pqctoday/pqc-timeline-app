export type WorkerMessage =
    | { type: 'COMMAND'; command: string; args: string[]; files?: { name: string; data: Uint8Array }[]; requestId?: string }
    | { type: 'LOAD'; url: string }
    | { type: 'FILE_UPLOAD'; name: string; data: Uint8Array };

export type WorkerResponse =
    | { type: 'LOG'; stream: 'stdout' | 'stderr'; message: string; requestId?: string }
    | { type: 'FILE_CREATED'; name: string; data: Uint8Array; requestId?: string }
    | { type: 'READY' }
    | { type: 'ERROR'; error: string; requestId?: string }
    | { type: 'DONE'; requestId?: string };
