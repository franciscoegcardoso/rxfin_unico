import React from "react";

export const ShellContext = React.createContext<{ insideShell: boolean }>({
  insideShell: false,
});

export function useShell(): { insideShell: boolean } {
  return React.useContext(ShellContext);
}
