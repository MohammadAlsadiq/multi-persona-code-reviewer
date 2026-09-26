/**
 * useTheme.ts
 *
 * Reads/writes the "dark" class on <html> and persists the preference
 * to localStorage under the key "theme".
 *
 * Usage:
 *   const { isDark, toggle } = useTheme();
 */
import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // SSR-safe: default to false on the server
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  const toggle = () => setIsDark((d) => !d);

  return { isDark, toggle };
}
