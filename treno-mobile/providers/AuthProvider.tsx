// providers/AuthProvider.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getToken,
  getWalletAddress,
  clearAuth,
  signInWithWallet,
  type SignInResult,
} from "../lib/auth";
import { getProfile } from "../lib/api";
import type { User } from "../lib/types";

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  walletAddress: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  walletAddress: null,
  signIn: async () => { },
  signOut: async () => { },
  refreshUser: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [walletAddress, setWalletAddressState] = useState<string | null>(null);

  // Check for existing token on app launch
  useEffect(() => {
    (async () => {
      console.log("[AuthProvider] Checking stored credentials...");
      try {
        const token = await getToken();
        const wallet = await getWalletAddress();

        if (token && wallet) {
          console.log("[AuthProvider] Found stored token, validating...");
          setWalletAddressState(wallet);

          // Validate the token by fetching profile
          const profile = await getProfile();
          setUser(profile);
          console.log("[AuthProvider] Token valid, user:", profile.id);
        } else {
          console.log("[AuthProvider] No stored credentials");
        }
      } catch (err: any) {
        console.log("[AuthProvider] Token invalid or expired:", err.message);
        await clearAuth();
        setUser(null);
        setWalletAddressState(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async () => {
    console.log("[AuthProvider] signIn called");
    const result: SignInResult = await signInWithWallet();
    setUser(result.user as User);
    setWalletAddressState(result.user.walletAddress);
    console.log("[AuthProvider] signIn complete");
  }, []);

  const signOut = useCallback(async () => {
    console.log("[AuthProvider] signOut called");
    await clearAuth();
    setUser(null);
    setWalletAddressState(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch {
      // silent
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: !!user,
        user,
        walletAddress,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}