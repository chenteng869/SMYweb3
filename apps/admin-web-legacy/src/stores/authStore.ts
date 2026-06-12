import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from '@/types';

interface AuthState {
  token: string | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
  updateUser: (user: Partial<AdminUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: 'demo-token',
      user: {
        id: '1',
        username: 'admin',
        email: 'admin@guoxue.com',
        roleId: '1',
        roleName: '超级管理员',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isAuthenticated: true,
      login: (token: string, user: AdminUser) => {
        localStorage.setItem('admin_token', token);
        set({ token, user, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('admin_token');
        set({ token: null, user: null, isAuthenticated: false });
      },
      updateUser: (user: Partial<AdminUser>) =>
        set((state) => ({ user: state.user ? { ...state.user, ...user } : null })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          state.isAuthenticated = true;
        }
      },
    }
  )
);
