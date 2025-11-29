import React, { createContext, useContext, useState } from 'react';

// --- Types ---
export interface OperationsContextType {
    // ML-KEM State
    sharedSecret: string;
    setSharedSecret: (val: string) => void;
    ciphertext: string;
    setCiphertext: (val: string) => void;
    encryptedData: string;
    setEncryptedData: (val: string) => void;
    kemDecapsulationResult: boolean | null;
    setKemDecapsulationResult: (result: boolean | null) => void;

    // ML-DSA State
    signature: string;
    setSignature: (val: string) => void;
    verificationResult: boolean | null;
    setVerificationResult: (result: boolean | null) => void;

    // Data Input State
    dataToSign: string;
    setDataToSign: (val: string) => void;
    dataToEncrypt: string;
    setDataToEncrypt: (val: string) => void;
    decryptedData: string;
    setDecryptedData: (val: string) => void;

    // Symmetric State
    symData: string;
    setSymData: (val: string) => void;
    symOutput: string;
    setSymOutput: (val: string) => void;

    // Actions
    clearOperationResults: () => void;
}

const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

export const useOperations = () => {
    const context = useContext(OperationsContext);
    if (!context) {
        throw new Error('useOperations must be used within an OperationsProvider');
    }
    return context;
};

export const OperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // ML-KEM State
    const [sharedSecret, setSharedSecret] = useState<string>('');
    const [ciphertext, setCiphertext] = useState<string>('');
    const [encryptedData, setEncryptedData] = useState<string>('');
    const [kemDecapsulationResult, setKemDecapsulationResult] = useState<boolean | null>(null);

    // ML-DSA State
    const [signature, setSignature] = useState<string>('');
    const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

    // Data Input State
    const [dataToSign, setDataToSign] = useState('Hello Quantum World!');
    const [dataToEncrypt, setDataToEncrypt] = useState('Secret Message');
    const [decryptedData, setDecryptedData] = useState('');

    // Symmetric State
    const [symData, setSymData] = useState('48656c6c6f2053796d6d657472696320576f726c64');
    const [symOutput, setSymOutput] = useState('');

    // Actions
    const clearOperationResults = () => {
        setSharedSecret('');
        setCiphertext('');
        setEncryptedData('');
        setSignature('');
        setVerificationResult(null);
        setKemDecapsulationResult(null);
        setDecryptedData('');
        setSymOutput('');
    };

    const value: OperationsContextType = {
        sharedSecret,
        setSharedSecret,
        ciphertext,
        setCiphertext,
        encryptedData,
        setEncryptedData,
        kemDecapsulationResult,
        setKemDecapsulationResult,
        signature,
        setSignature,
        verificationResult,
        setVerificationResult,
        dataToSign,
        setDataToSign,
        dataToEncrypt,
        setDataToEncrypt,
        decryptedData,
        setDecryptedData,
        symData,
        setSymData,
        symOutput,
        setSymOutput,
        clearOperationResults
    };

    return (
        <OperationsContext.Provider value={value}>
            {children}
        </OperationsContext.Provider>
    );
};
