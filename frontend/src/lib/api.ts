const BASE = import.meta.env.BASE_URL;
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export const apiUrl = (path: string) =>
  API_BASE
    ? `${API_BASE}${path}`
    : `${BASE}api${path}`;

export const apiFetch = (path: string, init?: RequestInit) =>
  fetch(apiUrl(path), { credentials: "include", ...init });
