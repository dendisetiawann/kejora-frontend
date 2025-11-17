import axios from 'axios';
import { User } from '@/types/entities';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api';
const TOKEN_KEY = 'kejora_admin_token';

const publicClient = axios.create({ baseURL: API_BASE_URL });
const adminClient = axios.create({ baseURL: API_BASE_URL });

const isFormDataPayload = (data: unknown): data is FormData => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const candidate = data as Record<string, unknown>;
  return typeof candidate.append === 'function' && typeof candidate.get === 'function';
};

adminClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
};

export const publicGet = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const response = await publicClient.get<T>(url, { params });
  return response.data;
};

export const publicPost = async <T>(url: string, data?: unknown): Promise<T> => {
  const response = await publicClient.post<T>(url, data);
  return response.data;
};

export const adminGet = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const response = await adminClient.get<T>(url, { params });
  return response.data;
};

export const adminPost = async <T>(url: string, data?: unknown): Promise<T> => {
  const config = isFormDataPayload(data)
    ? { headers: { 'Content-Type': 'multipart/form-data' }, transformRequest: (value: unknown) => value }
    : undefined;
  const response = await adminClient.post<T>(url, data, config);
  return response.data;
};

export const adminPut = async <T>(url: string, data?: unknown): Promise<T> => {
  const config = isFormDataPayload(data)
    ? { headers: { 'Content-Type': 'multipart/form-data' }, transformRequest: (value: unknown) => value }
    : undefined;
  const response = await adminClient.put<T>(url, data, config);
  return response.data;
};

export const adminDelete = async <T>(url: string): Promise<T> => {
  const response = await adminClient.delete<T>(url);
  return response.data;
};

export const adminLogin = async (credentials: { username: string; password: string }) => {
  const response = await publicClient.post('/admin/login', credentials);
  return response.data as { token: string; user: User; message?: string };
};

