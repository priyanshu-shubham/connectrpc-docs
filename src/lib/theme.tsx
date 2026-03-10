import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  setTheme: (t: Theme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  isDark: false,
  setTheme: () => {},
  cycleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const STORAGE_KEY = "api-explorer-theme";

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system")
        return stored;
    } catch {
      // ignore
    }
    return defaultTheme;
  });

  const [systemDark, setSystemDark] = useState(getSystemDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isDark =
    theme === "dark" || (theme === "system" && systemDark);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // ignore
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
    );
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, cycleTheme }}>
      <div className={isDark ? "dark contents" : "contents"}>{children}</div>
    </ThemeContext.Provider>
  );
}
