'use client';

import { SsoCallback } from '@omnify/sso-react';
import { Spin, Alert } from 'antd';

function LoadingComponent() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            gap: '1rem'
        }}>
            <Spin size="large" />
            <div>Authenticating...</div>
        </div>
    );
}

function ErrorComponent(error: Error) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '2rem'
        }}>
            <Alert
                message="Authentication Failed"
                description={error.message}
                type="error"
                showIcon
                action={
                    <a href="/">Return Home</a>
                }
            />
        </div>
    );
}

export default function SsoCallbackPage() {
    return (
        <SsoCallback
            redirectTo="/dashboard"
            loadingComponent={<LoadingComponent />}
            errorComponent={ErrorComponent}
            onSuccess={(user, orgs) => {
                console.log('[SSO] Login success:', user.email, 'orgs:', orgs.length);
            }}
            onError={(error) => {
                console.error('[SSO] Login error:', error);
            }}
        />
    );
}
