import React, { createContext, useContext, useState } from 'react';
import type { Key } from '../../../types';

// --- Types ---
export interface KeyStoreContextType {
    // Key Store
    keyStore: Key[];
    setKeyStore: React.Dispatch<React.SetStateAction<Key[]>>;

    // Selection State
    selectedEncKeyId: string;
    setSelectedEncKeyId: (id: string) => void;
    selectedDecKeyId: string;
    setSelectedDecKeyId: (id: string) => void;
    selectedSignKeyId: string;
    setSelectedSignKeyId: (id: string) => void;
    selectedVerifyKeyId: string;
    setSelectedVerifyKeyId: (id: string) => void;
    selectedSymKeyId: string;
    setSelectedSymKeyId: (id: string) => void;

    // Actions
    clearKeys: () => void;
    addKeys: (keys: Key[]) => void;
}

const KeyStoreContext = createContext<KeyStoreContextType | undefined>(undefined);

export const useKeyStore = () => {
    const context = useContext(KeyStoreContext);
    if (!context) {
        throw new Error('useKeyStore must be used within a KeyStoreProvider');
    }
    return context;
};

export const KeyStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // State
    const [keyStore, setKeyStore] = useState<Key[]>([]);
    const [selectedEncKeyId, setSelectedEncKeyId] = useState<string>('');
    const [selectedDecKeyId, setSelectedDecKeyId] = useState<string>('');
    const [selectedSignKeyId, setSelectedSignKeyId] = useState<string>('');
    const [selectedVerifyKeyId, setSelectedVerifyKeyId] = useState<string>('');
    const [selectedSymKeyId, setSelectedSymKeyId] = useState<string>('');

    // Actions
    const clearKeys = () => {
        setKeyStore([]);
        setSelectedEncKeyId('');
        setSelectedDecKeyId('');
        setSelectedSignKeyId('');
        setSelectedVerifyKeyId('');
        setSelectedSymKeyId('');
    };

    const addKeys = (keys: Key[]) => {
        setKeyStore(prev => [...prev, ...keys]);
    };

    const value: KeyStoreContextType = {
        keyStore,
        setKeyStore,
        selectedEncKeyId,
        setSelectedEncKeyId,
        selectedDecKeyId,
        setSelectedDecKeyId,
        selectedSignKeyId,
        setSelectedSignKeyId,
        selectedVerifyKeyId,
        setSelectedVerifyKeyId,
        selectedSymKeyId,
        setSelectedSymKeyId,
        clearKeys,
        addKeys
    };

    return (
        <KeyStoreContext.Provider value={value}>
            {children}
        </KeyStoreContext.Provider>
    );
};
