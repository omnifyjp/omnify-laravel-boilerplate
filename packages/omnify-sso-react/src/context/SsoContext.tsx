'use client';

import { createContext, useContext } from 'react';
import type { SsoContextValue } from '../types';

/**
 * SSO Context
 */
export const SsoContext = createContext<SsoContextValue | null>(null);

/**
 * Hook to access SSO context
 * @throws Error if used outside SsoProvider
 */
export function useSsoContext(): SsoContextValue {
    const context = useContext(SsoContext);

    if (!context) {
        throw new Error('useSsoContext must be used within a SsoProvider');
    }

    return context;
}
