"use client";

import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  firebaseReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function requireAuthInstance() {
  if (!auth || !isFirebaseConfigured) {
    throw new Error(
      "Firebase is not configured yet. Add your Firebase web app values to .env.local."
    );
  }

  return auth;
}

export function getFriendlyAuthError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "The email or password does not match an account.";
    case "auth/email-already-in-use":
      return "An account already exists for that email.";
    case "auth/weak-password":
      return "Use a stronger password with at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a bit and try again.";
    default:
      return error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setUser(null);
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(requireAuthInstance(), email, password);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await createUserWithEmailAndPassword(requireAuthInstance(), email, password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(requireAuthInstance());
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      firebaseReady: isFirebaseConfigured,
      login,
      register,
      logout
    }),
    [loading, login, logout, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
