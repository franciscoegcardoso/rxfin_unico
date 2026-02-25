import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';

export interface PendingChange {
  id: string;
  type: 'create' | 'update' | 'delete' | 'toggle';
  category: string; // e.g., 'Página', 'Plano', 'Grupo'
  description: string; // e.g., 'Ativar página "Dashboard"'
  entityId?: string; // ID of the entity being changed (page.id, group.id, etc.)
  field?: string; // e.g., 'is_active_users', 'is_active_admin', 'is_active'
  data?: any;
  execute: () => Promise<void>;
}

interface AdminPendingChangesContextType {
  pendingChanges: PendingChange[];
  addChange: (change: Omit<PendingChange, 'id'>) => string;
  removeChange: (id: string) => void;
  removeEntityFieldChange: (entityId: string, field: string) => void;
  clearChanges: () => void;
  hasChanges: boolean;
  isConfirmDialogOpen: boolean;
  openConfirmDialog: () => void;
  closeConfirmDialog: () => void;
  isSaving: boolean;
  saveAllChanges: () => Promise<void>;
  // Track which entities have pending changes
  hasEntityChange: (entityId: string) => boolean;
  getEntityChangeTypes: (entityId: string) => Set<PendingChange['type']>;
  // Pending values for real-time UI preview
  getPendingValue: <T>(entityId: string, field: string) => T | undefined;
  setPendingValue: <T>(entityId: string, field: string, value: T) => void;
  clearPendingValue: (entityId: string, field: string) => void;
  hasPendingValue: (entityId: string, field: string) => boolean;
}

const AdminPendingChangesContext = createContext<AdminPendingChangesContextType | null>(null);

export function AdminPendingChangesProvider({ children }: { children: ReactNode }) {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Map: entityId -> { field -> value }
  const [pendingValues, setPendingValues] = useState<Map<string, Map<string, any>>>(new Map());

  const addChange = useCallback((change: Omit<PendingChange, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setPendingChanges(prev => [...prev, { ...change, id }]);
    return id;
  }, []);

  const removeChange = useCallback((id: string) => {
    setPendingChanges(prev => prev.filter(c => c.id !== id));
  }, []);

  const removeEntityFieldChange = useCallback((entityId: string, field: string) => {
    setPendingChanges(prev => prev.filter(c => !(c.entityId === entityId && c.field === field)));
  }, []);

  const clearChanges = useCallback(() => {
    setPendingChanges([]);
    setPendingValues(new Map());
  }, []);

  const openConfirmDialog = useCallback(() => {
    setIsConfirmDialogOpen(true);
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setIsConfirmDialogOpen(false);
  }, []);

  const saveAllChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      // Execute all pending changes in sequence
      for (const change of pendingChanges) {
        await change.execute();
      }
      setPendingChanges([]);
      setPendingValues(new Map());
      setIsConfirmDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges]);

  // Pending values management for real-time UI preview
  const getPendingValue = useCallback(<T,>(entityId: string, field: string): T | undefined => {
    const entityValues = pendingValues.get(entityId);
    if (!entityValues) return undefined;
    return entityValues.get(field) as T | undefined;
  }, [pendingValues]);

  const setPendingValue = useCallback(<T,>(entityId: string, field: string, value: T) => {
    setPendingValues(prev => {
      const newMap = new Map(prev);
      const entityValues = newMap.get(entityId) || new Map();
      entityValues.set(field, value);
      newMap.set(entityId, entityValues);
      return newMap;
    });
  }, []);

  const clearPendingValue = useCallback((entityId: string, field: string) => {
    setPendingValues(prev => {
      const newMap = new Map(prev);
      const entityValues = newMap.get(entityId);
      if (entityValues) {
        entityValues.delete(field);
        if (entityValues.size === 0) {
          newMap.delete(entityId);
        }
      }
      return newMap;
    });
  }, []);

  const hasPendingValue = useCallback((entityId: string, field: string): boolean => {
    const entityValues = pendingValues.get(entityId);
    return entityValues?.has(field) ?? false;
  }, [pendingValues]);

  // Track which entities have pending changes
  const entityChangesMap = useMemo(() => {
    const map = new Map<string, Set<PendingChange['type']>>();
    pendingChanges.forEach(change => {
      if (change.entityId) {
        const existing = map.get(change.entityId) || new Set();
        existing.add(change.type);
        map.set(change.entityId, existing);
      }
    });
    return map;
  }, [pendingChanges]);

  const hasEntityChange = useCallback((entityId: string) => {
    return entityChangesMap.has(entityId);
  }, [entityChangesMap]);

  const getEntityChangeTypes = useCallback((entityId: string) => {
    return entityChangesMap.get(entityId) || new Set();
  }, [entityChangesMap]);

  return (
    <AdminPendingChangesContext.Provider 
      value={{
        pendingChanges,
        addChange,
        removeChange,
        removeEntityFieldChange,
        clearChanges,
        hasChanges: pendingChanges.length > 0,
        isConfirmDialogOpen,
        openConfirmDialog,
        closeConfirmDialog,
        isSaving,
        saveAllChanges,
        hasEntityChange,
        getEntityChangeTypes,
        getPendingValue,
        setPendingValue,
        clearPendingValue,
        hasPendingValue,
      }}
    >
      {children}
    </AdminPendingChangesContext.Provider>
  );
}

export function useAdminPendingChanges() {
  const context = useContext(AdminPendingChangesContext);
  if (!context) {
    throw new Error('useAdminPendingChanges must be used within AdminPendingChangesProvider');
  }
  return context;
}
