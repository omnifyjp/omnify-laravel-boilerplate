// src/context/SsoContext.tsx
import { createContext, useContext } from "react";
var SsoContext = createContext(null);
function useSsoContext() {
  const context = useContext(SsoContext);
  if (!context) {
    throw new Error("useSsoContext must be used within a SsoProvider");
  }
  return context;
}

// src/context/SsoProvider.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { jsx } from "react/jsx-runtime";
function transformUser(data) {
  return {
    id: data.id,
    consoleUserId: data.console_user_id,
    email: data.email,
    name: data.name
  };
}
function transformOrganizations(data) {
  return data.map((org) => ({
    id: org.organization_id,
    slug: org.organization_slug,
    name: org.organization_name,
    orgRole: org.org_role,
    serviceRole: org.service_role
  }));
}
function getStorage(type) {
  if (typeof window === "undefined") return null;
  return type === "localStorage" ? window.localStorage : window.sessionStorage;
}
function getXsrfToken() {
  if (typeof document === "undefined") return void 0;
  return document.cookie.split("; ").find((row) => row.startsWith("XSRF-TOKEN="))?.split("=")[1];
}
function SsoProvider({ children, config, onAuthChange }) {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const storageKey = config.storageKey ?? "sso_selected_org";
  const storage = getStorage(config.storage ?? "localStorage");
  const loadSelectedOrg = useCallback(
    (orgs) => {
      if (!storage || orgs.length === 0) return null;
      const savedSlug = storage.getItem(storageKey);
      if (savedSlug) {
        const found = orgs.find((o) => o.slug === savedSlug);
        if (found) return found;
      }
      return orgs[0];
    },
    [storage, storageKey]
  );
  const saveSelectedOrg = useCallback(
    (org) => {
      if (!storage) return;
      if (org) {
        storage.setItem(storageKey, org.slug);
      } else {
        storage.removeItem(storageKey);
      }
    },
    [storage, storageKey]
  );
  const fetchUser = useCallback(async () => {
    try {
      const xsrfToken = getXsrfToken();
      const headers = {
        "Accept": "application/json"
      };
      if (xsrfToken) {
        headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken);
      }
      const response = await fetch(`${config.apiUrl}/api/sso/user`, {
        headers,
        credentials: "include"
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      const transformedUser = transformUser(data.user);
      const transformedOrgs = transformOrganizations(data.organizations);
      return { user: transformedUser, organizations: transformedOrgs };
    } catch {
      return null;
    }
  }, [config.apiUrl]);
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setIsLoading(true);
      const result = await fetchUser();
      if (!mounted) return;
      if (result) {
        setUser(result.user);
        setOrganizations(result.organizations);
        const selectedOrg = loadSelectedOrg(result.organizations);
        setCurrentOrg(selectedOrg);
        onAuthChange?.(true, result.user);
      } else {
        setUser(null);
        setOrganizations([]);
        setCurrentOrg(null);
        onAuthChange?.(false, null);
      }
      setIsLoading(false);
    };
    init();
    return () => {
      mounted = false;
    };
  }, [fetchUser, loadSelectedOrg, onAuthChange]);
  const login = useCallback(
    (redirectTo) => {
      const callbackUrl = new URL("/sso/callback", window.location.origin);
      if (redirectTo) {
        callbackUrl.searchParams.set("redirect", redirectTo);
      }
      const loginUrl = new URL("/sso/authorize", config.consoleUrl);
      loginUrl.searchParams.set("service", config.serviceSlug);
      loginUrl.searchParams.set("redirect_uri", callbackUrl.toString());
      window.location.href = loginUrl.toString();
    },
    [config.consoleUrl, config.serviceSlug]
  );
  const logout = useCallback(async () => {
    try {
      const xsrfToken = getXsrfToken();
      const headers = {};
      if (xsrfToken) {
        headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken);
      }
      await fetch(`${config.apiUrl}/api/sso/logout`, {
        method: "POST",
        headers,
        credentials: "include"
      });
    } catch {
    }
    setUser(null);
    setOrganizations([]);
    setCurrentOrg(null);
    saveSelectedOrg(null);
    onAuthChange?.(false, null);
  }, [config.apiUrl, saveSelectedOrg, onAuthChange]);
  const globalLogout = useCallback(
    async (redirectTo) => {
      await logout();
      const redirectUri = redirectTo ?? window.location.origin;
      const logoutUrl = new URL("/sso/logout", config.consoleUrl);
      logoutUrl.searchParams.set("redirect_uri", redirectUri);
      window.location.href = logoutUrl.toString();
    },
    [logout, config.consoleUrl]
  );
  const switchOrg = useCallback(
    (orgSlug) => {
      const org = organizations.find((o) => o.slug === orgSlug);
      if (org) {
        setCurrentOrg(org);
        saveSelectedOrg(org);
      }
    },
    [organizations, saveSelectedOrg]
  );
  const refreshUser = useCallback(async () => {
    const result = await fetchUser();
    if (result) {
      setUser(result.user);
      setOrganizations(result.organizations);
      if (currentOrg) {
        const stillValid = result.organizations.find((o) => o.slug === currentOrg.slug);
        if (!stillValid) {
          const newOrg = loadSelectedOrg(result.organizations);
          setCurrentOrg(newOrg);
        }
      }
    }
  }, [fetchUser, currentOrg, loadSelectedOrg]);
  const getHeaders = useCallback(() => {
    const headers = {};
    if (currentOrg) {
      headers["X-Org-Id"] = currentOrg.slug;
    }
    return headers;
  }, [currentOrg]);
  const value = useMemo(
    () => ({
      user,
      organizations,
      currentOrg,
      isLoading,
      isAuthenticated: !!user,
      config,
      login,
      logout,
      globalLogout,
      switchOrg,
      refreshUser,
      getHeaders
    }),
    [
      user,
      organizations,
      currentOrg,
      isLoading,
      config,
      login,
      logout,
      globalLogout,
      switchOrg,
      refreshUser,
      getHeaders
    ]
  );
  return /* @__PURE__ */ jsx(SsoContext.Provider, { value, children });
}

// src/hooks/useAuth.ts
import { useCallback as useCallback2 } from "react";
function useAuth() {
  const { user, isLoading, isAuthenticated, login, logout, globalLogout, refreshUser } = useSsoContext();
  const handleLogin = useCallback2(
    (redirectTo) => {
      login(redirectTo);
    },
    [login]
  );
  const handleLogout = useCallback2(async () => {
    await logout();
  }, [logout]);
  const handleGlobalLogout = useCallback2(
    (redirectTo) => {
      globalLogout(redirectTo);
    },
    [globalLogout]
  );
  return {
    user,
    isLoading,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    globalLogout: handleGlobalLogout,
    refreshUser
  };
}

// src/hooks/useOrganization.ts
import { useCallback as useCallback3, useMemo as useMemo2 } from "react";
var ROLE_LEVELS = {
  admin: 100,
  manager: 50,
  member: 10
};
function useOrganization() {
  const { organizations, currentOrg, switchOrg } = useSsoContext();
  const hasMultipleOrgs = organizations.length > 1;
  const currentRole = currentOrg?.serviceRole ?? null;
  const hasRole = useCallback3(
    (role) => {
      if (!currentRole) return false;
      const requiredLevel = ROLE_LEVELS[role] ?? 0;
      const userLevel = ROLE_LEVELS[currentRole] ?? 0;
      return userLevel >= requiredLevel;
    },
    [currentRole]
  );
  const handleSwitchOrg = useCallback3(
    (orgSlug) => {
      switchOrg(orgSlug);
    },
    [switchOrg]
  );
  return useMemo2(
    () => ({
      organizations,
      currentOrg,
      hasMultipleOrgs,
      switchOrg: handleSwitchOrg,
      currentRole,
      hasRole
    }),
    [organizations, currentOrg, hasMultipleOrgs, handleSwitchOrg, currentRole, hasRole]
  );
}

// src/hooks/useSso.ts
import { useMemo as useMemo3 } from "react";
function useSso() {
  const context = useSsoContext();
  return useMemo3(
    () => ({
      // Auth
      user: context.user,
      isLoading: context.isLoading,
      isAuthenticated: context.isAuthenticated,
      login: context.login,
      logout: context.logout,
      globalLogout: context.globalLogout,
      refreshUser: context.refreshUser,
      // Organization
      organizations: context.organizations,
      currentOrg: context.currentOrg,
      hasMultipleOrgs: context.organizations.length > 1,
      switchOrg: context.switchOrg,
      // Utilities
      getHeaders: context.getHeaders,
      config: context.config
    }),
    [context]
  );
}

// src/components/SsoCallback.tsx
import { useEffect as useEffect2, useRef, useState as useState2 } from "react";
import { Fragment, jsx as jsx2, jsxs } from "react/jsx-runtime";
function transformUser2(data) {
  return {
    id: data.id,
    consoleUserId: data.console_user_id,
    email: data.email,
    name: data.name
  };
}
function transformOrganizations2(data) {
  return data.map((org) => ({
    id: org.organization_id,
    slug: org.organization_slug,
    name: org.organization_name,
    orgRole: org.org_role,
    serviceRole: org.service_role
  }));
}
function DefaultLoading() {
  return /* @__PURE__ */ jsx2("div", { style: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "200px"
  }, children: /* @__PURE__ */ jsx2("div", { children: "Authenticating..." }) });
}
function DefaultError({ error }) {
  return /* @__PURE__ */ jsxs("div", { style: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "200px",
    color: "red"
  }, children: [
    /* @__PURE__ */ jsx2("div", { children: "Authentication Error" }),
    /* @__PURE__ */ jsx2("div", { style: { fontSize: "0.875rem", marginTop: "0.5rem" }, children: error.message })
  ] });
}
function SsoCallback({
  onSuccess,
  onError,
  redirectTo = "/",
  loadingComponent,
  errorComponent
}) {
  const { config, refreshUser } = useSsoContext();
  const [error, setError] = useState2(null);
  const [isProcessing, setIsProcessing] = useState2(true);
  const isProcessingRef = useRef(false);
  useEffect2(() => {
    if (isProcessingRef.current) {
      return;
    }
    isProcessingRef.current = true;
    const processCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const redirectParam = urlParams.get("redirect");
        if (!code) {
          throw new Error("No authorization code received");
        }
        await fetch(`${config.apiUrl}/sanctum/csrf-cookie`, {
          credentials: "include"
        });
        const xsrfToken = document.cookie.split("; ").find((row) => row.startsWith("XSRF-TOKEN="))?.split("=")[1];
        const response = await fetch(`${config.apiUrl}/api/sso/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...xsrfToken ? { "X-XSRF-TOKEN": decodeURIComponent(xsrfToken) } : {}
          },
          credentials: "include",
          body: JSON.stringify({ code })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to authenticate");
        }
        const data = await response.json();
        const user = transformUser2(data.user);
        const organizations = transformOrganizations2(data.organizations);
        await refreshUser();
        onSuccess?.(user, organizations);
        const finalRedirect = redirectParam || redirectTo;
        window.location.href = finalRedirect;
      } catch (err) {
        const error2 = err instanceof Error ? err : new Error("Authentication failed");
        setError(error2);
        onError?.(error2);
        isProcessingRef.current = false;
      } finally {
        setIsProcessing(false);
      }
    };
    processCallback();
  }, []);
  if (error) {
    if (errorComponent) {
      return /* @__PURE__ */ jsx2(Fragment, { children: errorComponent(error) });
    }
    return /* @__PURE__ */ jsx2(DefaultError, { error });
  }
  if (isProcessing) {
    if (loadingComponent) {
      return /* @__PURE__ */ jsx2(Fragment, { children: loadingComponent });
    }
    return /* @__PURE__ */ jsx2(DefaultLoading, {});
  }
  return null;
}

// src/components/OrganizationSwitcher.tsx
import React3, { useCallback as useCallback4, useMemo as useMemo4 } from "react";
import { Dropdown, Button, Space, Typography, Badge } from "antd";
import { SwapOutlined, CheckOutlined } from "@ant-design/icons";
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
var { Text } = Typography;
function OrganizationSwitcher({
  className,
  renderTrigger,
  renderOption,
  onChange
}) {
  const { organizations, currentOrg, hasMultipleOrgs, switchOrg } = useOrganization();
  const [isOpen, setIsOpen] = React3.useState(false);
  const handleSelect = useCallback4(
    (org) => {
      switchOrg(org.slug);
      setIsOpen(false);
      onChange?.(org);
    },
    [switchOrg, onChange]
  );
  const menuItems = useMemo4(() => {
    return organizations.map((org) => {
      const isSelected = currentOrg?.slug === org.slug;
      if (renderOption) {
        return {
          key: org.slug,
          label: /* @__PURE__ */ jsx3("div", { onClick: () => handleSelect(org), children: renderOption(org, isSelected) })
        };
      }
      return {
        key: org.slug,
        label: /* @__PURE__ */ jsxs2(Space, { style: { width: "100%", justifyContent: "space-between" }, children: [
          /* @__PURE__ */ jsxs2(Space, { direction: "vertical", size: 0, children: [
            /* @__PURE__ */ jsx3(Text, { strong: isSelected, children: org.name }),
            org.serviceRole && /* @__PURE__ */ jsx3(Text, { type: "secondary", style: { fontSize: 12 }, children: org.serviceRole })
          ] }),
          isSelected && /* @__PURE__ */ jsx3(CheckOutlined, { style: { color: "#1890ff" } })
        ] }),
        onClick: () => handleSelect(org)
      };
    });
  }, [organizations, currentOrg, renderOption, handleSelect]);
  if (!hasMultipleOrgs) {
    return null;
  }
  if (renderTrigger) {
    return /* @__PURE__ */ jsx3(
      Dropdown,
      {
        menu: { items: menuItems },
        trigger: ["click"],
        open: isOpen,
        onOpenChange: setIsOpen,
        className,
        children: /* @__PURE__ */ jsx3("div", { style: { cursor: "pointer" }, children: renderTrigger(currentOrg, isOpen) })
      }
    );
  }
  return /* @__PURE__ */ jsx3(
    Dropdown,
    {
      menu: { items: menuItems },
      trigger: ["click"],
      open: isOpen,
      onOpenChange: setIsOpen,
      className,
      children: /* @__PURE__ */ jsx3(Button, { children: /* @__PURE__ */ jsxs2(Space, { children: [
        /* @__PURE__ */ jsx3(Badge, { status: "success" }),
        /* @__PURE__ */ jsx3("span", { children: currentOrg?.name ?? "Select Organization" }),
        /* @__PURE__ */ jsx3(SwapOutlined, {})
      ] }) })
    }
  );
}

// src/components/ProtectedRoute.tsx
import { useEffect as useEffect3 } from "react";
import { Fragment as Fragment2, jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
function DefaultLoading2() {
  return /* @__PURE__ */ jsx4("div", { style: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "200px"
  }, children: /* @__PURE__ */ jsx4("div", { children: "Loading..." }) });
}
function DefaultLoginFallback({ login }) {
  return /* @__PURE__ */ jsxs3("div", { style: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "200px",
    gap: "1rem"
  }, children: [
    /* @__PURE__ */ jsx4("div", { children: "Please log in to continue" }),
    /* @__PURE__ */ jsx4(
      "button",
      {
        onClick: login,
        style: {
          padding: "0.5rem 1rem",
          background: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "0.375rem",
          cursor: "pointer"
        },
        children: "Log In"
      }
    )
  ] });
}
function DefaultAccessDenied({ reason }) {
  return /* @__PURE__ */ jsxs3("div", { style: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "200px",
    color: "#dc2626"
  }, children: [
    /* @__PURE__ */ jsx4("div", { style: { fontSize: "1.5rem", fontWeight: 600 }, children: "Access Denied" }),
    /* @__PURE__ */ jsx4("div", { style: { marginTop: "0.5rem" }, children: reason })
  ] });
}
function ProtectedRoute({
  children,
  fallback,
  loginFallback,
  requiredRole,
  requiredPermission,
  onAccessDenied
}) {
  const { user, isLoading, isAuthenticated, login } = useAuth();
  const { hasRole, currentOrg } = useOrganization();
  useEffect3(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      onAccessDenied?.("unauthenticated");
    } else if (requiredRole && !hasRole(requiredRole)) {
      onAccessDenied?.("insufficient_role");
    }
  }, [isLoading, isAuthenticated, requiredRole, hasRole, onAccessDenied]);
  if (isLoading) {
    return /* @__PURE__ */ jsx4(Fragment2, { children: fallback ?? /* @__PURE__ */ jsx4(DefaultLoading2, {}) });
  }
  if (!isAuthenticated) {
    if (loginFallback) {
      return /* @__PURE__ */ jsx4(Fragment2, { children: loginFallback });
    }
    return /* @__PURE__ */ jsx4(DefaultLoginFallback, { login: () => login() });
  }
  if (requiredRole && !hasRole(requiredRole)) {
    return /* @__PURE__ */ jsx4(
      DefaultAccessDenied,
      {
        reason: `This page requires ${requiredRole} role. Your role: ${currentOrg?.serviceRole ?? "none"}`
      }
    );
  }
  return /* @__PURE__ */ jsx4(Fragment2, { children });
}
export {
  OrganizationSwitcher,
  ProtectedRoute,
  SsoCallback,
  SsoContext,
  SsoProvider,
  useAuth,
  useOrganization,
  useSso
};
