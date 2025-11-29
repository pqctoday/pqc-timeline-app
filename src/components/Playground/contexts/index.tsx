/**
 * Combined Playground Contexts
 *
 * This file provides a convenient way to wrap components with all three
 * focused contexts: KeyStore, Operations, and Settings.
 *
 * Usage:
 *   <PlaygroundProviders>
 *     <YourComponent />
 *   </PlaygroundProviders>
 */

import React from 'react';
import { KeyStoreProvider } from './KeyStoreContext';
import { OperationsProvider } from './OperationsContext';
import { SettingsProvider } from './SettingsContext';

export * from './KeyStoreContext';
export * from './OperationsContext';
export * from './SettingsContext';

/**
 * Combined provider that wraps all three contexts
 * Order matters: Settings → KeyStore → Operations
 */
export const PlaygroundProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <SettingsProvider>
            <KeyStoreProvider>
                <OperationsProvider>
                    {children}
                </OperationsProvider>
            </KeyStoreProvider>
        </SettingsProvider>
    );
};
