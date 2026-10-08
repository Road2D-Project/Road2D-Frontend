/**
 * useAuthStore.ts — Trạng thái đăng nhập.
 *
 * - Token nằm ở `tokenStorage` (SecureStore), KHÔNG nằm trong store này.
 * - Store chỉ giữ `user` + `isAuthenticated`, persist bằng AsyncStorage để mở lại app vẫn nhớ.
 * - `isHydrated`: false cho tới khi đọc xong AsyncStorage → AppNavigator nên chờ cờ này
 *   (làm ở task Auth guard).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isHydrated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      updateUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'r2d-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ isHydrated: true });
      },
    },
  ),
);
