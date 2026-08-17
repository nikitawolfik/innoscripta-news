import { useEffect, type ReactNode } from "react";

import { useThemeStore } from "~/stores/theme-store";

const DARK_CLASS = "dark";
const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

interface Props {
  children: ReactNode;
}

/**
 * Applies the persisted theme to <html>. Kept as an effect rather than a
 * context because nothing needs to read the theme through the tree — consumers
 * that care go straight to the store.
 */
export function ThemeProvider({ children }: Props) {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const systemPrefersDark = window.matchMedia(SYSTEM_DARK_QUERY);

    function applyTheme() {
      const isDark =
        theme === "dark" || (theme === "system" && systemPrefersDark.matches);

      document.documentElement.classList.toggle(DARK_CLASS, isDark);
    }

    applyTheme();
    systemPrefersDark.addEventListener("change", applyTheme);

    return () => systemPrefersDark.removeEventListener("change", applyTheme);
  }, [theme]);

  return children;
}
