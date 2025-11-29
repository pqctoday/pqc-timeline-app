import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { LogEntry } from '../../../types';

// --- Types ---
export type ExecutionMode = 'mock' | 'wasm';
export type SortColumn = 'timestamp' | 'keyLabel' | 'operation' | 'result' | 'executionTime';
export type SortDirection = 'asc' | 'desc';
export type ClassicalAlgorithm = 'RSA-2048' | 'RSA-3072' | 'RSA-4096' | 'ECDSA-P256' | 'Ed25519' | 'X25519' | 'P-256' | 'AES-128' | 'AES-256';

export interface SettingsContextType {
    // Algorithm Settings
    algorithm: 'ML-KEM' | 'ML-DSA';
    setAlgorithm: (algo: 'ML-KEM' | 'ML-DSA') => void;
    keySize: string;
    setKeySize: (size: string) => void;
    executionMode: ExecutionMode;
    setExecutionMode: (mode: ExecutionMode) => void;
    wasmLoaded: boolean;
    classicalAlgorithm: ClassicalAlgorithm;
    setClassicalAlgorithm: (algo: ClassicalAlgorithm) => void;

    // Algorithm Configuration
    enabledAlgorithms: any;
    toggleAlgorithm: (category: 'kem' | 'signature' | 'symmetric' | 'hash', algorithm: string) => void;

    // UI State
    activeTab: 'settings' | 'data' | 'kem_ops' | 'sign_verify' | 'keystore' | 'logs' | 'acvp' | 'symmetric';
    setActiveTab: (tab: 'settings' | 'data' | 'kem_ops' | 'sign_verify' | 'keystore' | 'logs' | 'acvp' | 'symmetric') => void;

    // Logs State
    logs: LogEntry[];
    addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
    clearLogs: () => void;
    sortColumn: SortColumn;
    setSortColumn: (col: SortColumn) => void;
    sortDirection: SortDirection;
    setSortDirection: (dir: SortDirection) => void;
    sortedLogs: LogEntry[];
    handleSort: (column: SortColumn) => void;

    // Column State
    columnWidths: { [key: string]: number };
    setColumnWidths: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
    resizingColumn: SortColumn | null;
    setResizingColumn: (col: SortColumn | null) => void;
    startResize: (e: React.MouseEvent, column: SortColumn) => void;

    // Loading & Error State
    loading: boolean;
    setLoading: (loading: boolean) => void;
    error: string | null;
    setError: (error: string | null) => void;

    // Helpers
    handleAlgorithmChange: (newAlgorithm: 'ML-KEM' | 'ML-DSA') => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Algorithm Settings
    const [algorithm, setAlgorithm] = useState<'ML-KEM' | 'ML-DSA'>('ML-KEM');
    const [keySize, setKeySize] = useState<string>('768');
    const [executionMode, setExecutionMode] = useState<ExecutionMode>(() => {
        const isWasmSupported = typeof WebAssembly === 'object';
        if (!isWasmSupported) return 'mock';
        const savedMode = sessionStorage.getItem('playground-execution-mode');
        return (savedMode === 'wasm' || savedMode === 'mock') ? savedMode : 'wasm';
    });
    const [wasmLoaded, setWasmLoaded] = useState(false);
    const [classicalAlgorithm, setClassicalAlgorithm] = useState<ClassicalAlgorithm>('RSA-2048');

    // Algorithm Configuration
    const [enabledAlgorithms, setEnabledAlgorithms] = useState(() => {
        const saved = sessionStorage.getItem('playground-enabled-algorithms');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                // Corrupted sessionStorage data, return defaults
            }
        }
        return {
            kem: { 'ML-KEM-512': true, 'ML-KEM-768': true, 'ML-KEM-1024': true, 'X25519': true, 'P-256': true },
            signature: { 'ML-DSA-44': true, 'ML-DSA-65': true, 'ML-DSA-87': true, 'RSA-2048': true, 'RSA-3072': true, 'RSA-4096': true, 'ECDSA-P256': true, 'Ed25519': true },
            symmetric: { 'AES-128-GCM': true, 'AES-256-GCM': true },
            hash: { 'SHA-256': true, 'SHA-384': true, 'SHA3-256': false }
        };
    });

    // UI State
    const [activeTab, setActiveTab] = useState<'settings' | 'data' | 'kem_ops' | 'sign_verify' | 'keystore' | 'logs' | 'acvp' | 'symmetric'>('settings');

    // Logs State
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [sortColumn, setSortColumn] = useState<SortColumn>('timestamp');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Column State
    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
        timestamp: 150,
        keyLabel: 200,
        operation: 180,
        result: 300,
        executionTime: 120
    });
    const [resizingColumn, setResizingColumn] = useState<SortColumn | null>(null);
    const resizeStartX = useRef<number>(0);
    const resizeStartWidth = useRef<number>(0);

    // Loading & Error
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(() => {
        return (typeof WebAssembly === 'object') ? null : 'WebAssembly not supported in this browser. Using Mock mode.';
    });

    // Helpers
    const handleAlgorithmChange = (newAlgorithm: 'ML-KEM' | 'ML-DSA') => {
        setAlgorithm(newAlgorithm);
        setKeySize(newAlgorithm === 'ML-KEM' ? '768' : '65');
    };

    const toggleAlgorithm = (category: 'kem' | 'signature' | 'symmetric' | 'hash', algorithm: string) => {
        setEnabledAlgorithms((prev: Record<string, Record<string, boolean>>) => ({
            ...prev,
            [category]: {
                ...prev[category],
                [algorithm]: !prev[category][algorithm as keyof typeof prev[typeof category]]
            }
        }));
    };

    const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
        const newEntry: LogEntry = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString([], {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                fractionalSecondDigits: 3
            }),
            ...entry
        };
        // Implement log rotation: keep only the most recent 1000 entries
        setLogs(prev => {
            const updated = [newEntry, ...prev];
            return updated.length > 1000 ? updated.slice(0, 1000) : updated;
        });
    };

    const clearLogs = () => setLogs([]);

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    const startResize = (e: React.MouseEvent, column: SortColumn) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingColumn(column);
        resizeStartX.current = e.clientX;
        resizeStartWidth.current = columnWidths[column];
        document.body.style.cursor = 'col-resize';
    };

    // Sorted logs
    const sortedLogs = [...logs].sort((a, b) => {
        let comparison = 0;
        if (sortColumn === 'timestamp') {
            comparison = a.timestamp.localeCompare(b.timestamp);
        } else if (sortColumn === 'executionTime') {
            comparison = a.executionTime - b.executionTime;
        } else {
            comparison = String(a[sortColumn]).localeCompare(String(b[sortColumn]));
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Effects
    useEffect(() => {
        sessionStorage.setItem('playground-execution-mode', executionMode);
    }, [executionMode]);

    useEffect(() => {
        sessionStorage.setItem('playground-enabled-algorithms', JSON.stringify(enabledAlgorithms));
    }, [enabledAlgorithms]);

    useEffect(() => {
        if (executionMode === 'wasm' && !wasmLoaded) {
            import('../../wasm/liboqs_dsa').then(module => {
                module.load().then(() => setWasmLoaded(true));
            });
        }
    }, [executionMode, wasmLoaded]);

    // Resize effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (resizingColumn) {
                const delta = e.clientX - resizeStartX.current;
                const newWidth = Math.max(50, resizeStartWidth.current + delta);
                setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
            }
        };

        const handleMouseUp = () => {
            setResizingColumn(null);
            document.body.style.cursor = '';
        };

        if (resizingColumn) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [resizingColumn]);

    const value: SettingsContextType = {
        algorithm,
        setAlgorithm,
        keySize,
        setKeySize,
        executionMode,
        setExecutionMode,
        wasmLoaded,
        classicalAlgorithm,
        setClassicalAlgorithm,
        enabledAlgorithms,
        toggleAlgorithm,
        activeTab,
        setActiveTab,
        logs,
        addLog,
        clearLogs,
        sortColumn,
        setSortColumn,
        sortDirection,
        setSortDirection,
        sortedLogs,
        handleSort,
        columnWidths,
        setColumnWidths,
        resizingColumn,
        setResizingColumn,
        startResize,
        loading,
        setLoading,
        error,
        setError,
        handleAlgorithmChange
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
