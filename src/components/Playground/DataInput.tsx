import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { FileText, Binary } from 'lucide-react';

interface DataInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    readOnly?: boolean;
    height?: string;
    inputType?: 'text' | 'binary'; // 'text' = value is ASCII, 'binary' = value is Hex string
}

// --- Helper Functions ---

// Convert Uint8Array to Hex String
export const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

// Convert Hex String to Uint8Array
export const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
};

// Convert ASCII String to Hex String
export const asciiToHex = (str: string): string => {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return hex;
};

// Convert Hex String to ASCII String
export const hexToAscii = (hex: string): string => {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.substr(i, 2), 16);
        // Replace non-printable characters with dot or similar if needed, 
        // but for now let's try to keep it raw or maybe use a placeholder for nulls?
        // Simple conversion:
        str += String.fromCharCode(code);
    }
    return str;
};

export const isHex = (str: string): boolean => {
    const hexRegex = /^[0-9a-fA-F]*$/;
    return hexRegex.test(str) && str.length % 2 === 0;
};

export const DataInput: React.FC<DataInputProps> = ({
    label,
    value,
    onChange,
    placeholder = '',
    readOnly = false,
    height = 'h-32',
    inputType = 'text'
}) => {
    // viewMode determines how we DISPLAY the data.
    // If inputType='text' (value is ASCII):
    //   viewMode='ascii' -> show value
    //   viewMode='hex'   -> show asciiToHex(value)
    // If inputType='binary' (value is Hex):
    //   viewMode='hex'   -> show value
    //   viewMode='ascii' -> show hexToAscii(value)

    // Default view mode depends on input type
    const [viewMode, setViewMode] = useState<'ascii' | 'hex'>(inputType === 'text' ? 'ascii' : 'hex');
    const [localValue, setLocalValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Calculate display value based on current props and view mode
    const getDisplayValue = (val: string, mode: 'ascii' | 'hex', type: 'text' | 'binary') => {
        if (type === 'text') {
            return mode === 'ascii' ? val : asciiToHex(val);
        } else {
            // type === 'binary' (val is hex)
            return mode === 'hex' ? val : hexToAscii(val);
        }
    };

    // Update local value when prop value changes
    useEffect(() => {
        setLocalValue(getDisplayValue(value, viewMode, inputType));
        setError(null);
    }, [value, viewMode, inputType]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        setError(null);

        try {
            if (inputType === 'text') {
                if (viewMode === 'ascii') {
                    // Direct edit of ASCII
                    onChange(newValue);
                } else {
                    // Editing Hex representation of ASCII
                    if (isHex(newValue)) {
                        onChange(hexToAscii(newValue));
                    } else {
                        setError("Invalid Hexadecimal");
                    }
                }
            } else {
                // inputType === 'binary' (value is Hex)
                if (viewMode === 'hex') {
                    // Direct edit of Hex
                    if (isHex(newValue)) {
                        onChange(newValue);
                    } else {
                        setError("Invalid Hexadecimal");
                    }
                } else {
                    // Editing ASCII representation of Binary
                    onChange(asciiToHex(newValue));
                }
            }
        } catch (err) {
            setError("Conversion Error");
        }
    };

    return (
        <div className="bg-black/20 rounded-xl border border-white/5 p-4 transition-colors hover:border-white/10">
            <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                    {label}
                </label>
                <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => setViewMode('ascii')}
                        className={clsx(
                            "px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all",
                            viewMode === 'ascii' ? "bg-white/10 text-white shadow-sm" : "text-muted hover:text-white"
                        )}
                    >
                        <FileText size={12} /> ASCII
                    </button>
                    <button
                        onClick={() => setViewMode('hex')}
                        className={clsx(
                            "px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all",
                            viewMode === 'hex' ? "bg-white/10 text-white shadow-sm" : "text-muted hover:text-white"
                        )}
                    >
                        <Binary size={12} /> HEX
                    </button>
                </div>
            </div>

            <textarea
                value={localValue}
                onChange={handleChange}
                readOnly={readOnly}
                placeholder={placeholder}
                className={clsx(
                    "w-full bg-black/40 border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-primary font-mono resize-none transition-colors",
                    height,
                    error ? "border-red-500/50 focus:border-red-500" : "border-white/10",
                    readOnly ? "opacity-70 cursor-not-allowed" : ""
                )}
            />

            {error && (
                <div className="mt-2 text-xs text-red-400 font-medium">
                    {error}
                </div>
            )}
        </div>
    );
};
