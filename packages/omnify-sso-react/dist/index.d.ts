import * as react from 'react';
import * as react_jsx_runtime from 'react/jsx-runtime';

/**
 * User information from SSO
 */
interface SsoUser {
    id: number;
    consoleUserId: number;
    email: string;
    name: string;
}
/**
 * Organization with user's access information
 */
interface SsoOrganization {
    id: number;
    slug: string;
    name: string;
    orgRole: string;
    serviceRole: string | null;
}
/**
 * SSO Provider configuration
 */
interface SsoConfig {
    /** Service backend API URL */
    apiUrl: string;
    /** Console URL for SSO redirects */
    consoleUrl: string;
    /** Service slug registered in Console */
    serviceSlug: string;
    /** Storage type for selected org */
    storage?: 'localStorage' | 'sessionStorage';
    /** Key name for storing selected org */
    storageKey?: string;
}
/**
 * SSO Context value
 */
interface SsoContextValue {
    /** Current authenticated user */
    user: SsoUser | null;
    /** List of organizations user has access to */
    organizations: SsoOrganization[];
    /** Currently selected organization */
    currentOrg: SsoOrganization | null;
    /** Loading state */
    isLoading: boolean;
    /** Authentication state */
    isAuthenticated: boolean;
    /** Configuration */
    config: SsoConfig;
    /** Redirect to Console login */
    login: (redirectTo?: string) => void;
    /** Logout from service */
    logout: () => Promise<void>;
    /** Global logout (logout from Console too) */
    globalLogout: (redirectTo?: string) => void;
    /** Switch to different organization */
    switchOrg: (orgSlug: string) => void;
    /** Refresh user data */
    refreshUser: () => Promise<void>;
    /** Get headers for API requests */
    getHeaders: () => Record<string, string>;
}
/**
 * SSO Callback response from backend
 */
interface SsoCallbackResponse {
    user: {
        id: number;
        console_user_id: number;
        email: string;
        name: string;
    };
    organizations: Array<{
        organization_id: number;
        organization_slug: string;
        organization_name: string;
        org_role: string;
        service_role: string | null;
    }>;
    token?: string;
}
/**
 * Props for SsoProvider
 */
interface SsoProviderProps {
    children: React.ReactNode;
    config: SsoConfig;
    /** Called when auth state changes */
    onAuthChange?: (isAuthenticated: boolean, user: SsoUser | null) => void;
}
/**
 * Props for SsoCallback component
 */
interface SsoCallbackProps {
    /** Called on successful login */
    onSuccess?: (user: SsoUser, organizations: SsoOrganization[]) => void;
    /** Called on error */
    onError?: (error: Error) => void;
    /** Redirect path after login */
    redirectTo?: string;
    /** Loading component */
    loadingComponent?: React.ReactNode;
    /** Error component */
    errorComponent?: (error: Error) => React.ReactNode;
}
/**
 * Props for OrganizationSwitcher component
 */
interface OrganizationSwitcherProps {
    className?: string;
    /** Custom trigger render */
    renderTrigger?: (currentOrg: SsoOrganization | null, isOpen: boolean) => React.ReactNode;
    /** Custom option render */
    renderOption?: (org: SsoOrganization, isSelected: boolean) => React.ReactNode;
    /** Called when org changes */
    onChange?: (org: SsoOrganization) => void;
}
/**
 * Props for ProtectedRoute component
 */
interface ProtectedRouteProps {
    children: React.ReactNode;
    /** Component to show when loading */
    fallback?: React.ReactNode;
    /** Component to show when not authenticated */
    loginFallback?: React.ReactNode;
    /** Required role to access */
    requiredRole?: string;
    /** Required permission to access */
    requiredPermission?: string;
    /** Called when access is denied */
    onAccessDenied?: (reason: 'unauthenticated' | 'insufficient_role' | 'missing_permission') => void;
}

/**
 * SSO Context
 */
declare const SsoContext: react.Context<SsoContextValue | null>;

/**
 * SSO Provider component
 */
declare function SsoProvider({ children, config, onAuthChange }: SsoProviderProps): react_jsx_runtime.JSX.Element;

/**
 * Hook for authentication actions and state
 */
interface UseAuthReturn {
    /** Current user or null */
    user: SsoUser | null;
    /** Whether auth is being loaded */
    isLoading: boolean;
    /** Whether user is authenticated */
    isAuthenticated: boolean;
    /** Redirect to login */
    login: (redirectTo?: string) => void;
    /** Logout from service only */
    logout: () => Promise<void>;
    /** Logout from service and Console */
    globalLogout: (redirectTo?: string) => void;
    /** Refresh user data */
    refreshUser: () => Promise<void>;
}
/**
 * Hook for authentication
 *
 * @example
 * ```tsx
 * function LoginButton() {
 *   const { isAuthenticated, login, logout, user } = useAuth();
 *
 *   if (isAuthenticated) {
 *     return (
 *       <div>
 *         <span>Hello, {user?.name}</span>
 *         <button onClick={() => logout()}>Logout</button>
 *       </div>
 *     );
 *   }
 *
 *   return <button onClick={() => login()}>Login</button>;
 * }
 * ```
 */
declare function useAuth(): UseAuthReturn;

/**
 * Hook return type for organization management
 */
interface UseOrganizationReturn {
    /** List of organizations user has access to */
    organizations: SsoOrganization[];
    /** Currently selected organization */
    currentOrg: SsoOrganization | null;
    /** Whether user has multiple organizations */
    hasMultipleOrgs: boolean;
    /** Switch to a different organization */
    switchOrg: (orgSlug: string) => void;
    /** Get current org's role */
    currentRole: string | null;
    /** Check if user has at least the given role in current org */
    hasRole: (role: string) => boolean;
}
/**
 * Hook for organization management
 *
 * @example
 * ```tsx
 * function OrgInfo() {
 *   const { currentOrg, organizations, switchOrg, hasRole } = useOrganization();
 *
 *   return (
 *     <div>
 *       <p>Current: {currentOrg?.name}</p>
 *       {hasRole('admin') && <AdminPanel />}
 *       <select onChange={(e) => switchOrg(e.target.value)}>
 *         {organizations.map((org) => (
 *           <option key={org.slug} value={org.slug}>{org.name}</option>
 *         ))}
 *       </select>
 *     </div>
 *   );
 * }
 * ```
 */
declare function useOrganization(): UseOrganizationReturn;

/**
 * Combined SSO hook return type
 */
interface UseSsoReturn {
    user: SsoUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (redirectTo?: string) => void;
    logout: () => Promise<void>;
    globalLogout: (redirectTo?: string) => void;
    refreshUser: () => Promise<void>;
    organizations: SsoOrganization[];
    currentOrg: SsoOrganization | null;
    hasMultipleOrgs: boolean;
    switchOrg: (orgSlug: string) => void;
    getHeaders: () => Record<string, string>;
    config: SsoConfig;
}
/**
 * Combined hook for all SSO functionality
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     user,
 *     isAuthenticated,
 *     currentOrg,
 *     getHeaders,
 *     login,
 *     logout,
 *   } = useSso();
 *
 *   const fetchData = async () => {
 *     const response = await fetch('/api/data', {
 *       headers: getHeaders(),
 *     });
 *     // ...
 *   };
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={() => login()}>Login</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user?.name}</p>
 *       <p>Organization: {currentOrg?.name}</p>
 *       <button onClick={() => logout()}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */
declare function useSso(): UseSsoReturn;

/**
 * SSO Callback component
 *
 * Place this component at your callback route (e.g., /sso/callback)
 * It handles the SSO code exchange and redirects after successful login.
 *
 * @example
 * ```tsx
 * // pages/sso/callback.tsx or app/sso/callback/page.tsx
 * export default function CallbackPage() {
 *   return (
 *     <SsoCallback
 *       redirectTo="/dashboard"
 *       onSuccess={(user, orgs) => console.log('Logged in:', user)}
 *       onError={(error) => console.error('Login failed:', error)}
 *     />
 *   );
 * }
 * ```
 */
declare function SsoCallback({ onSuccess, onError, redirectTo, loadingComponent, errorComponent, }: SsoCallbackProps): react_jsx_runtime.JSX.Element | null;

/**
 * Organization Switcher component using Ant Design
 *
 * A dropdown component for switching between organizations.
 * Only renders if user has access to multiple organizations.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <OrganizationSwitcher />
 *
 * // With custom styling
 * <OrganizationSwitcher className="my-switcher" />
 *
 * // With custom render
 * <OrganizationSwitcher
 *   renderTrigger={(org, isOpen) => (
 *     <Button>{org?.name} {isOpen ? '▲' : '▼'}</Button>
 *   )}
 *   renderOption={(org, isSelected) => (
 *     <div className={isSelected ? 'selected' : ''}>{org.name}</div>
 *   )}
 * />
 * ```
 */
declare function OrganizationSwitcher({ className, renderTrigger, renderOption, onChange, }: OrganizationSwitcherProps): react_jsx_runtime.JSX.Element | null;

/**
 * Protected Route component
 *
 * Wraps content that requires authentication and optionally specific roles/permissions.
 *
 * @example
 * ```tsx
 * // Basic protection
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * // With role requirement
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * // With custom fallbacks
 * <ProtectedRoute
 *   fallback={<Spinner />}
 *   loginFallback={<CustomLoginPage />}
 *   onAccessDenied={(reason) => console.log(reason)}
 * >
 *   <ProtectedContent />
 * </ProtectedRoute>
 * ```
 */
declare function ProtectedRoute({ children, fallback, loginFallback, requiredRole, requiredPermission, onAccessDenied, }: ProtectedRouteProps): react_jsx_runtime.JSX.Element;

export { OrganizationSwitcher, type OrganizationSwitcherProps, ProtectedRoute, type ProtectedRouteProps, SsoCallback, type SsoCallbackProps, type SsoCallbackResponse, type SsoConfig, SsoContext, type SsoContextValue, type SsoOrganization, SsoProvider, type SsoProviderProps, type SsoUser, type UseAuthReturn, type UseOrganizationReturn, type UseSsoReturn, useAuth, useOrganization, useSso };
