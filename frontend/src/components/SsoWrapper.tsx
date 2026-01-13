'use client';

import { SsoProvider } from '@omnify/sso-react';
import type { ReactNode } from 'react';

const ssoConfig = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    consoleUrl: process.env.NEXT_PUBLIC_SSO_CONSOLE_URL ?? 'http://auth.test',
    serviceSlug: process.env.NEXT_PUBLIC_SSO_SERVICE_SLUG ?? 'boilerplate',
    storage: 'localStorage' as const,
    storageKey: 'sso_selected_org',
};

interface SsoWrapperProps {
    children: ReactNode;
}

export default function SsoWrapper({ children }: SsoWrapperProps) {
    return (
        <SsoProvider
            config={ssoConfig}
            onAuthChange={(isAuthenticated, user) => {
                console.log('[SSO] Auth changed:', isAuthenticated, user?.email);
            }}
        >
            {children}
        </SsoProvider>
    );
}
