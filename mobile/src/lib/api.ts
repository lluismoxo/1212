import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? "http://localhost:8787";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

export async function setTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

// Intenta refrescar el access token usando el refresh guardado.
async function tryRefresh(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!refreshToken) return null;
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await clearTokens();
    return null;
  }
  const data = await res.json();
  await setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

// Fetch con Authorization + reintento único tras refresh si 401.
export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = opts;

  async function call(token: string | null): Promise<Response> {
    return fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  let token = auth ? await SecureStore.getItemAsync(ACCESS_KEY) : null;
  let res = await call(token);

  if (res.status === 401 && auth) {
    const fresh = await tryRefresh();
    if (fresh) res = await call(fresh);
  }

  if (!res.ok) {
    let code = "error";
    try { code = (await res.json()).error ?? "error"; } catch {}
    throw new ApiError(res.status, code);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// Login: intercambia id_token OIDC por tokens propios y los guarda.
export async function login(provider: "google" | "apple", idToken: string) {
  const data = await api<{ accessToken: string; refreshToken: string }>("/auth/login", {
    method: "POST",
    body: { provider, idToken },
    auth: false,
  });
  await setTokens(data.accessToken, data.refreshToken);
}

export async function logout() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try { await api("/auth/logout", { method: "POST", body: { refreshToken }, auth: false }); } catch {}
  }
  await clearTokens();
}
