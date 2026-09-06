import { LS_KEYS } from '../data/mockData';

/**
 * 后端 API 客户端。
 *
 * - 通过环境变量 VITE_API_BASE_URL 指定后端地址（如 http://localhost:8000）。
 * - 未配置时 apiEnabled 为 false，前端保持原有 localStorage 离线模式，零影响。
 * - JWT 存于 localStorage(plab_token)，自动附加到 Authorization 头。
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const apiEnabled = Boolean(API_BASE);

const TOKEN_KEY = 'plab_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!apiEnabled) {
    throw new ApiError(0, 'API 未启用：请设置 VITE_API_BASE_URL');
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    if (res.status === 401 && token) {
      // 已登录态失效（请求带了 token 却被拒）：清空登录信息并回到登录页。
      // 未带 token 的 401（如登录/注册密码错误）不触发，避免误判为会话过期。
      setToken(null);
      localStorage.removeItem(LS_KEYS.CURRENT_USER);
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    const detail = (data && (data.detail || data.message)) || res.statusText;
    throw new ApiError(res.status, typeof detail === 'string' ? detail : '请求失败');
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

// ---------- 类型 ----------
export interface LoginResult {
  accessToken: string;
  tokenType: string;
  userId: string;
  role: 'admin' | 'teacher' | 'student';
  classId: string | null;
  groupId: string | null;
  name: string;
}

// ---------- 认证 ----------
export async function apiLogin(username: string, password: string): Promise<LoginResult> {
  const result = await api.post<LoginResult>('/api/auth/login', { username, password });
  setToken(result.accessToken);
  return result;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  classId: string;
  name?: string;
}

export async function apiRegister(payload: RegisterPayload): Promise<LoginResult> {
  const result = await api.post<LoginResult>('/api/auth/register', payload);
  setToken(result.accessToken);
  return result;
}

export function apiLogout(): void {
  setToken(null);
}
