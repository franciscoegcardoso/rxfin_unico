import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import * as React from "react";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/** Syncs data-theme attribute for Design System v2 CSS ([data-theme="dark"] / [data-theme="light"]) */
function ThemeDataSync() {
  const { resolvedTheme } = useTheme();
  React.useEffect(() => {
    const value = resolvedTheme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", value);
  }, [resolvedTheme]);
  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="rxfin-theme"
      {...props}
    >
      <ThemeDataSync />
      {children}
    </NextThemesProvider>
  );
}
