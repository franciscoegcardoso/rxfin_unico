import * as React from "react";

const MOBILE_BREAKPOINT = 1024;

function getIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

/**
 * Evita 1º render como "desktop" e 2º como "mobile" (isso remontava AppShell inteiro
 * e disparava todos os requests do Início 2× no telefone).
 * Não chama setIsMobile no effect: só o listener de resize — evita flip que remontava
 * o Outlet (ex.: isMobile mudava logo após o primeiro paint e duplicava requests).
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(getIsMobile);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(getIsMobile());
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
