/**
 * Vitest Setup
 *
 * テスト環境のセットアップ
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock window.location
const mockLocation = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    search: '',
    pathname: '/',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
};

Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
});

// Reset mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = 'http://localhost:3000';
    mockLocation.search = '';
    mockLocation.pathname = '/';
});
