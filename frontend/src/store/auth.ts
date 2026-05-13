import { create } from "zustand";

interface AuthState {
  token: string | null;
  role: string | null;
  fullName: string | null;
  setAuth: (token: string, role: string, fullName: string) => void;
  logout: () => void;
}

const STORAGE_KEY = "ttms_auth";

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { token: null, role: null, fullName: null };
}

const initial = loadInitial();

export const useAuth = create<AuthState>((set) => ({
  token: initial.token,
  role: initial.role,
  fullName: initial.fullName,
  setAuth: (token, role, fullName) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, role, fullName }));
    set({ token, role, fullName });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, role: null, fullName: null });
  },
}));
