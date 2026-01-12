# @omnify/sso-react

React components and hooks for Omnify SSO integration.

## Installation

```bash
npm install @omnify/sso-react
# or
yarn add @omnify/sso-react
# or
pnpm add @omnify/sso-react
```

## Quick Start

### 1. Wrap your app with SsoProvider

```tsx
// app/layout.tsx or _app.tsx
import { SsoProvider } from '@omnify/sso-react';

const ssoConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL!,
  consoleUrl: process.env.NEXT_PUBLIC_SSO_CONSOLE_URL!,
  serviceSlug: process.env.NEXT_PUBLIC_SSO_SERVICE_SLUG!,
};

export default function RootLayout({ children }) {
  return (
    <SsoProvider config={ssoConfig}>
      {children}
    </SsoProvider>
  );
}
```

### 2. Create callback page

```tsx
// app/sso/callback/page.tsx
import { SsoCallback } from '@omnify/sso-react';

export default function CallbackPage() {
  return (
    <SsoCallback
      redirectTo="/dashboard"
      onSuccess={(user) => console.log('Logged in:', user)}
      onError={(error) => console.error('Login failed:', error)}
    />
  );
}
```

### 3. Use hooks in your components

```tsx
import { useAuth, useOrganization, useSso } from '@omnify/sso-react';

function Header() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const { currentOrg } = useOrganization();

  if (!isAuthenticated) {
    return <button onClick={() => login()}>Login</button>;
  }

  return (
    <div>
      <span>Welcome, {user?.name}</span>
      <span>Org: {currentOrg?.name}</span>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}
```

## Components

### SsoProvider

Wraps your app and provides SSO context.

```tsx
<SsoProvider
  config={{
    apiUrl: 'https://api.yourservice.com',
    consoleUrl: 'https://auth.console.com',
    serviceSlug: 'your-service',
    storage: 'localStorage', // or 'sessionStorage'
    storageKey: 'sso_selected_org',
  }}
  onAuthChange={(isAuthenticated, user) => {
    console.log('Auth changed:', isAuthenticated, user);
  }}
>
  {children}
</SsoProvider>
```

### SsoCallback

Handles the SSO callback and token exchange.

```tsx
<SsoCallback
  redirectTo="/dashboard"
  onSuccess={(user, organizations) => {}}
  onError={(error) => {}}
  loadingComponent={<CustomLoader />}
  errorComponent={(error) => <CustomError error={error} />}
/>
```

### OrganizationSwitcher

Dropdown for switching between organizations. Only renders if user has multiple orgs.

```tsx
// Basic
<OrganizationSwitcher />

// Custom rendering
<OrganizationSwitcher
  renderTrigger={(currentOrg, isOpen) => (
    <button>{currentOrg?.name} {isOpen ? '▲' : '▼'}</button>
  )}
  renderOption={(org, isSelected) => (
    <div className={isSelected ? 'selected' : ''}>{org.name}</div>
  )}
  onChange={(org) => console.log('Switched to:', org.name)}
/>
```

### ProtectedRoute

Wraps content that requires authentication.

```tsx
// Basic
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// With role requirement
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>

// Custom fallbacks
<ProtectedRoute
  fallback={<Spinner />}
  loginFallback={<CustomLoginPage />}
  onAccessDenied={(reason) => console.log(reason)}
>
  <ProtectedContent />
</ProtectedRoute>
```

## Hooks

### useAuth

```tsx
const {
  user,           // SsoUser | null
  isLoading,      // boolean
  isAuthenticated,// boolean
  login,          // (redirectTo?: string) => void
  logout,         // () => Promise<void>
  globalLogout,   // (redirectTo?: string) => void
  refreshUser,    // () => Promise<void>
} = useAuth();
```

### useOrganization

```tsx
const {
  organizations,   // SsoOrganization[]
  currentOrg,      // SsoOrganization | null
  hasMultipleOrgs, // boolean
  switchOrg,       // (orgSlug: string) => void
  currentRole,     // string | null
  hasRole,         // (role: string) => boolean
} = useOrganization();
```

### useSso

Combined hook with all functionality.

```tsx
const {
  // Auth
  user, isLoading, isAuthenticated, login, logout, globalLogout, refreshUser,
  // Organization
  organizations, currentOrg, hasMultipleOrgs, switchOrg,
  // Utilities
  getHeaders, config,
} = useSso();
```

## Making API Requests

Use `getHeaders()` to include the organization header in your requests:

```tsx
const { getHeaders } = useSso();

// With fetch
const response = await fetch('/api/data', {
  headers: {
    ...getHeaders(),
    'Content-Type': 'application/json',
  },
  credentials: 'include',
});

// With axios
const response = await axios.get('/api/data', {
  headers: getHeaders(),
  withCredentials: true,
});
```

## Types

```tsx
interface SsoUser {
  id: number;
  consoleUserId: number;
  email: string;
  name: string;
}

interface SsoOrganization {
  id: number;
  slug: string;
  name: string;
  orgRole: string;
  serviceRole: string | null;
}

interface SsoConfig {
  apiUrl: string;
  consoleUrl: string;
  serviceSlug: string;
  storage?: 'localStorage' | 'sessionStorage';
  storageKey?: string;
}
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=https://api.yourservice.com
NEXT_PUBLIC_SSO_CONSOLE_URL=https://auth.console.com
NEXT_PUBLIC_SSO_SERVICE_SLUG=your-service
```

## License

MIT
