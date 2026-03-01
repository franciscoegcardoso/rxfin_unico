import React, { createContext, useContext, useState } from 'react';

interface MobileMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileMenuContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) return { open: false, setOpen: (_: boolean) => {} };
  return ctx;
}
