import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';

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
  const dirtyEntriesRef = useRef<Map<string, DirtyEntry>>(new Map());
  useEffect(() => {
    dirtyEntriesRef.current = dirtyEntries;
  }, [dirtyEntries]);

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
      const entries = dirtyEntriesRef.current;
      for (const entry of entries.values()) {
        await entry.saveFn();
      }
      setDirtyEntries(new Map());
    } finally {
      setIsSaving(false);
    }
  }, []);

  const clearAll = useCallback(() => {
    const entries = dirtyEntriesRef.current;
    for (const entry of entries.values()) {
      entry.cancelFn?.();
    }
    setDirtyEntries(new Map());
  }, []);

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
