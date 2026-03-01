import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DirtyEntry {
  tabId: string;
  saveFn: () => Promise<void>;
  cancelFn?: () => void;
}

interface AccountPendingChangesContextType {
  hasChanges: boolean;
  registerDirty: (tabId: string, saveFn: () => Promise<void>, cancelFn?: () => void) => void;
  unregisterDirty: (tabId: string) => void;
  saveAll: () => Promise<void>;
  clearAll: () => void;
  isSaving: boolean;
}

const AccountPendingChangesContext = createContext<AccountPendingChangesContextType | null>(null);

export function AccountPendingChangesProvider({ children }: { children: ReactNode }) {
  const [dirtyEntries, setDirtyEntries] = useState<Map<string, DirtyEntry>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  const registerDirty = useCallback((tabId: string, saveFn: () => Promise<void>, cancelFn?: () => void) => {
    setDirtyEntries(prev => {
      const next = new Map(prev);
      next.set(tabId, { tabId, saveFn, cancelFn });
      return next;
    });
  }, []);

  const unregisterDirty = useCallback((tabId: string) => {
    setDirtyEntries(prev => {
      const next = new Map(prev);
      next.delete(tabId);
      return next;
    });
  }, []);

  const saveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      for (const entry of dirtyEntries.values()) {
        await entry.saveFn();
      }
      setDirtyEntries(new Map());
    } finally {
      setIsSaving(false);
    }
  }, [dirtyEntries]);

  const clearAll = useCallback(() => {
    for (const entry of dirtyEntries.values()) {
      entry.cancelFn?.();
    }
    setDirtyEntries(new Map());
  }, [dirtyEntries]);

  return (
    <AccountPendingChangesContext.Provider
      value={{
        hasChanges: dirtyEntries.size > 0,
        registerDirty,
        unregisterDirty,
        saveAll,
        clearAll,
        isSaving,
      }}
    >
      {children}
    </AccountPendingChangesContext.Provider>
  );
}

export function useAccountPendingChanges() {
  const context = useContext(AccountPendingChangesContext);
  if (!context) {
    throw new Error('useAccountPendingChanges must be used within AccountPendingChangesProvider');
  }
  return context;
}
