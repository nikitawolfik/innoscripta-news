import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "news:theme";

interface State {
  theme: Theme;
}

interface Actions {
  setTheme: (theme: Theme) => void;
}

type Store = State & Actions;

export const useThemeStore = create<Store>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    { name: THEME_STORAGE_KEY, version: 1 },
  ),
);
