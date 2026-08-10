'use client';

import { createContext, useCallback, useContext } from 'react';
import { useAuth } from '@clerk/nextjs';

const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';
type Api = <T>(path: string, options?: RequestInit) => Promise<T>;
const ApiContext = createContext<Api | null>(null);

async function request<T>(path: string, options?: RequestInit, token?: string | null) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
  });
  const json = await response.json();
  if (!response.ok || json.status !== 'success') throw new Error(json.message ?? 'Request failed');
  return json.data as T;
}

export function DevelopmentApiProvider({ children }: { children: React.ReactNode }) {
  const api = useCallback(<T,>(path: string, options?: RequestInit) => request<T>(path, options), []);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function AuthenticatedApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const api = useCallback(async <T,>(path: string, options?: RequestInit) => request<T>(path, options, await getToken()), [getToken]);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useKeplerApi() {
  const api = useContext(ApiContext);
  if (!api) throw new Error('Kepler API provider is missing');
  return api;
}
