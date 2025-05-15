import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type UserInfo = {
  id: string;
  email: string;
  role: "NANNY" | "PARENT" | "ADMIN";
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
};

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setToken: (token: string) => void;
  setUser: (user: UserInfo) => void;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      setToken: (token) => 
        set({ token, isAuthenticated: !!token }),
      
      setUser: (user) => 
        set({ user }),
      
      login: (token, user) => 
        set({ 
          token, 
          user, 
          isAuthenticated: true,
          isLoading: false 
        }),
      
      logout: () => 
        set({ 
          token: null, 
          user: null, 
          isAuthenticated: false,
          isLoading: false 
        }),
    }),
    {
      name: "indaba-auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
