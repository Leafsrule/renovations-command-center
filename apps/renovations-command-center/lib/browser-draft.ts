"use client";
import {
  useCallback,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
const volatileDrafts = new Map<string, string>();
const storageErrors = new Map<string, string>();
const eventName = "rcc-draft-change";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(eventName, callback);
  };
}
export function useBrowserDraft<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>, () => void, string] {
  const fallback = JSON.stringify(initial);
  const getSnapshot = useCallback(() => {
    try {
      return volatileDrafts.get(key) ?? localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback]);
  const storageError = useSyncExternalStore(
    subscribe,
    () => storageErrors.get(key) ?? "",
    () => "",
  );
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => fallback);
  let value: T;
  try {
    value = JSON.parse(raw) as T;
  } catch {
    value = initial;
  }
  const setValue: Dispatch<SetStateAction<T>> = (next) => {
    const resolved =
      typeof next === "function" ? (next as (value: T) => T)(value) : next;
    const encoded = JSON.stringify(resolved);
    try {
      localStorage.setItem(key, encoded);
      volatileDrafts.delete(key);
      storageErrors.delete(key);
    } catch {
      volatileDrafts.set(key, encoded);
      storageErrors.set(
        key,
        "Draft is only in memory. Browser storage failed; keep this page open until you save online.",
      );
    }
    window.dispatchEvent(new Event(eventName));
  };
  const clear = () => {
    volatileDrafts.delete(key);
    storageErrors.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      storageErrors.set(
        key,
        "Saved draft could not be removed from browser storage.",
      );
    }
    window.dispatchEvent(new Event(eventName));
  };
  return [value, setValue, clear, storageError];
}
