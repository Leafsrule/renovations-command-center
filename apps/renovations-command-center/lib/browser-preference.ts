"use client";
import { useCallback, useSyncExternalStore } from "react";
const eventName = "rcc-preference-change";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(eventName, callback);
  };
}
/** A project/account-scoped scalar preference, synchronized with browser storage. */
export function useBrowserPreference<T extends number | boolean>(
  key: string,
  fallback: T,
): [T, (value: T) => void] {
  const getSnapshot = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      if (typeof fallback === "boolean") return (raw === "true") as T;
      const number = Number(raw);
      return (Number.isFinite(number) && number >= 0 ? number : fallback) as T;
    } catch {
      return fallback;
    }
  }, [key, fallback]);
  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);
  const setValue = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, String(next));
        window.dispatchEvent(new Event(eventName));
      } catch {
        throw new Error(
          "Browser storage is unavailable. Preferences could not be saved.",
        );
      }
    },
    [key],
  );
  return [value, setValue];
}
