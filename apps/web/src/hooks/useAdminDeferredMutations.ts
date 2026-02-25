import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminPendingChanges } from '@/contexts/AdminPendingChangesContext';
import { useAdminAudit } from './useAdminAudit';
import { toast } from 'sonner';
import type { Page, PageInsert, PageUpdate } from '@/hooks/usePages';
import type { PageGroup, PageGroupInsert, PageGroupUpdate } from '@/hooks/usePageGroups';
import type { SubscriptionPlan } from '@/hooks/useSubscriptionPlans';
import type { PlanComparisonFeature } from '@/hooks/usePlanComparisonFeatures';

/**
 * Hook that provides deferred mutations for admin operations.
 * Instead of executing immediately, changes are added to the pending changes context
 * and only executed when the user confirms.
 * 
 * Toggle operations now support "undo" - clicking again removes the pending change.
 */
export function useAdminDeferredMutations() {
  const { 
    addChange, 
    removeEntityFieldChange,
    getPendingValue,
    setPendingValue, 
    clearPendingValue,
    hasPendingValue,
  } = useAdminPendingChanges();
  const queryClient = useQueryClient();
  const { logAction } = useAdminAudit();
  // ============ PAGES ============

  const deferToggleUserStatus = useCallback((page: Page) => {
    const field = 'is_active_users';
    
    // If there's already a pending change for this field, remove it (undo)
    if (hasPendingValue(page.id, field)) {
      removeEntityFieldChange(page.id, field);
      clearPendingValue(page.id, field);
      return;
    }
    
    const newStatus = !page.is_active_users;
    setPendingValue(page.id, field, newStatus);
    
    addChange({
      type: 'toggle',
      category: 'Página',
      description: `${newStatus ? 'Ativar' : 'Desativar'} página "${page.title}" para usuários`,
      entityId: page.id,
      field,
      execute: async () => {
        const { error } = await supabase
          .from('pages')
          .update({ is_active_users: newStatus })
          .eq('id', page.id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['pages'] });
        toast.success(`Página ${newStatus ? 'ativada' : 'desativada'} para usuários!`);
      },
    });
  }, [addChange, removeEntityFieldChange, getPendingValue, setPendingValue, clearPendingValue, hasPendingValue, queryClient]);

  const deferToggleShowWhenUnavailable = useCallback((page: Page) => {
    const field = 'show_when_unavailable';
    
    // If page is active, it must always be shown - don't allow toggle
    if (page.is_active_users) {
      toast.info('Páginas disponíveis são sempre exibidas');
      return;
    }
    
    // If there's already a pending change for this field, remove it (undo)
    if (hasPendingValue(page.id, field)) {
      removeEntityFieldChange(page.id, field);
      clearPendingValue(page.id, field);
      return;
    }
    
    const currentValue = page.show_when_unavailable ?? true;
    const newStatus = !currentValue;
    setPendingValue(page.id, field, newStatus);
    
    addChange({
      type: 'toggle',
      category: 'Página',
      description: `${newStatus ? 'Exibir' : 'Ocultar'} página "${page.title}" no menu`,
      entityId: page.id,
      field,
      execute: async () => {
        const { error } = await supabase
          .from('pages')
          .update({ show_when_unavailable: newStatus } as Record<string, boolean>)
          .eq('id', page.id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['pages'] });
        toast.success(`Página ${newStatus ? 'exibida' : 'ocultada'} no menu!`);
      },
    });
  }, [addChange, removeEntityFieldChange, getPendingValue, setPendingValue, clearPendingValue, hasPendingValue, queryClient]);

  const deferToggleAdminStatus = useCallback((page: Page) => {
    const field = 'is_active_admin';
    
    // If there's already a pending change for this field, remove it (undo)
    if (hasPendingValue(page.id, field)) {
      removeEntityFieldChange(page.id, field);
      clearPendingValue(page.id, field);
      return;
    }
    
    const newStatus = !page.is_active_admin;
    setPendingValue(page.id, field, newStatus);
    
    addChange({
      type: 'toggle',
      category: 'Página',
      description: `${newStatus ? 'Ativar' : 'Desativar'} página "${page.title}" para admins`,
      entityId: page.id,
      field,
      execute: async () => {
        const { error } = await supabase
          .from('pages')
          .update({ is_active_admin: newStatus })
          .eq('id', page.id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['pages'] });
        toast.success(`Página ${newStatus ? 'ativada' : 'desativada'} para admins!`);
      },
    });
  }, [addChange, removeEntityFieldChange, getPendingValue, setPendingValue, clearPendingValue, hasPendingValue, queryClient]);

  const deferCreatePage = useCallback((data: PageInsert) => {
    addChange({
      type: 'create',
      category: 'Página',
      description: `Criar página "${data.title}"`,
      execute: async () => {
        const { error } = await supabase
          .from('pages')
          .insert(data);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['pages'] });
        toast.success('Página criada com sucesso!');
      },
    });
  }, [addChange, queryClient]);

  const deferUpdatePage = useCallback((id: string, data: PageUpdate, title: string) => {
    addChange({
      type: 'update',
      category: 'Página',
      description: `Atualizar página "${title}"`,
      entityId: id,
      execute: async () => {
        const { error } = await supabase
          .from('pages')
          .update(data)
          .eq('id', id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['pages'] });
        toast.success('Página atualizada!');
      },
    });
  }, [addChange, queryClient]);

  const deferDeletePage = useCallback((page: Page) => {
    addChange({
      type: 'delete',
      category: 'Página',
      description: `Excluir página "${page.title}"`,
      entityId: page.id,
      execute: async () => {
        const { error } = await supabase
          .from('pages')
          .delete()
          .eq('id', page.id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['pages'] });
        toast.success('Página excluída!');
      },
    });
  }, [addChange, queryClient]);

  const deferUpdatePagePlan = useCallback((page: Page, newPlanSlug: string) => {
    const field = 'min_plan_slug';
    
    // If there's already a pending change for this field, remove it if going back to original
    if (hasPendingValue(page.id, field)) {
      const currentPending = getPendingValue<string>(page.id, field);
      if (currentPending === newPlanSlug) {
        // User selected same as pending - no change needed
        return;
      }
      // Remove previous pending change
      removeEntityFieldChange(page.id, field);
      clearPendingValue(page.id, field);
    }
    
    // If new value is same as original, don't add change
    if (page.min_plan_slug === newPlanSlug) {
      return;
    }
    
    setPendingValue(page.id, field, newPlanSlug);
    
    addChange({
      type: 'update',
      category: 'Página',
      description: `Alterar plano mínimo da página "${page.title}" para "${newPlanSlug}"`,
      entityId: page.id,
      field,
      execute: async () => {
        const { error } = await supabase
          .from('pages')
          .update({ min_plan_slug: newPlanSlug })
          .eq('id', page.id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['pages'] });
        toast.success('Plano da página atualizado!');
      },
    });
  }, [addChange, removeEntityFieldChange, getPendingValue, setPendingValue, clearPendingValue, hasPendingValue, queryClient]);

  // ============ PAGE GROUPS ============

  const deferCreateGroup = useCallback((data: PageGroupInsert) => {
    addChange({
      type: 'create',
      category: 'Grupo',
      description: `Criar grupo "${data.name}"`,
      execute: async () => {
        const { error } = await supabase
          .from('page_groups')
          .insert(data);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['page-groups'] });
        toast.success('Grupo criado com sucesso!');
      },
    });
  }, [addChange, queryClient]);

  const deferUpdateGroup = useCallback((id: string, data: PageGroupUpdate, name: string) => {
    addChange({
      type: 'update',
      category: 'Grupo',
      description: `Atualizar grupo "${name}"`,
      entityId: id,
      execute: async () => {
        const { error } = await supabase
          .from('page_groups')
          .update(data)
          .eq('id', id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['page-groups'] });
        toast.success('Grupo atualizado!');
      },
    });
  }, [addChange, queryClient]);

  const deferDeleteGroup = useCallback((group: PageGroup) => {
    addChange({
      type: 'delete',
      category: 'Grupo',
      description: `Excluir grupo "${group.name}"`,
      entityId: group.id,
      execute: async () => {
        const { error } = await supabase
          .from('page_groups')
          .delete()
          .eq('id', group.id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['page-groups'] });
        toast.success('Grupo excluído!');
      },
    });
  }, [addChange, queryClient]);

  // ============ PLANS ============

  const deferTogglePlanActive = useCallback((plan: SubscriptionPlan) => {
    const field = 'is_active';
    
    // If there's already a pending change for this field, remove it (undo)
    if (hasPendingValue(plan.id, field)) {
      removeEntityFieldChange(plan.id, field);
      clearPendingValue(plan.id, field);
      return;
    }
    
    const newStatus = !plan.is_active;
    setPendingValue(plan.id, field, newStatus);
    
    addChange({
      type: 'toggle',
      category: 'Plano',
      description: `${newStatus ? 'Ativar' : 'Desativar'} plano "${plan.name}"`,
      entityId: plan.id,
      field,
      execute: async () => {
        const { error } = await supabase
          .from('subscription_plans')
          .update({ is_active: newStatus })
          .eq('id', plan.id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
        logAction('TOGGLE_PLAN_STATUS', 'subscription_plans', plan.id, { planName: plan.name, newStatus }, 'high');
        toast.success(`Plano ${newStatus ? 'ativado' : 'desativado'}!`);
      },
    });
  }, [addChange, removeEntityFieldChange, setPendingValue, clearPendingValue, hasPendingValue, logAction, queryClient]);

  const deferUpdatePlan = useCallback((id: string, data: Partial<SubscriptionPlan>, name: string) => {
    addChange({
      type: 'update',
      category: 'Plano',
      description: `Atualizar plano "${name}"`,
      entityId: id,
      execute: async () => {
        const { error } = await supabase
          .from('subscription_plans')
          .update(data)
          .eq('id', id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
        logAction('UPDATE_PLAN', 'subscription_plans', id, { planName: name, fields: Object.keys(data) }, 'high');
        toast.success('Plano atualizado!');
      },
    });
  }, [addChange, logAction, queryClient]);

  const deferCreatePlan = useCallback((data: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => {
    addChange({
      type: 'create',
      category: 'Plano',
      description: `Criar plano "${data.name}"`,
      execute: async () => {
        const { error } = await supabase
          .from('subscription_plans')
          .insert(data);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
        logAction('CREATE_PLAN', 'subscription_plans', null, { planName: data.name, slug: data.slug }, 'high');
        toast.success('Plano criado com sucesso!');
      },
    });
  }, [addChange, logAction, queryClient]);

  const deferDeletePlan = useCallback((plan: SubscriptionPlan) => {
    addChange({
      type: 'delete',
      category: 'Plano',
      description: `Excluir plano "${plan.name}"`,
      entityId: plan.id,
      execute: async () => {
        const { error } = await supabase
          .from('subscription_plans')
          .delete()
          .eq('id', plan.id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
        logAction('DELETE_PLAN', 'subscription_plans', plan.id, { planName: plan.name }, 'critical');
        toast.success('Plano excluído!');
      },
    });
  }, [addChange, logAction, queryClient]);

  // ============ PLAN COMPARISON FEATURES ============

  const deferToggleComparisonFeature = useCallback((feature: PlanComparisonFeature) => {
    const field = 'is_active';
    
    // If there's already a pending change for this field, remove it (undo)
    if (hasPendingValue(feature.id, field)) {
      removeEntityFieldChange(feature.id, field);
      clearPendingValue(feature.id, field);
      return;
    }
    
    const newStatus = !feature.is_active;
    setPendingValue(feature.id, field, newStatus);
    
    addChange({
      type: 'toggle',
      category: 'Comparativo',
      description: `${newStatus ? 'Ativar' : 'Desativar'} item "${feature.feature_name}"`,
      entityId: feature.id,
      field,
      execute: async () => {
        const { error } = await supabase
          .from('plan_comparison_features')
          .update({ is_active: newStatus, updated_at: new Date().toISOString() })
          .eq('id', feature.id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['plan-comparison-features'] });
        toast.success(newStatus ? 'Item ativado' : 'Item movido para não inseridos');
      },
    });
  }, [addChange, removeEntityFieldChange, setPendingValue, clearPendingValue, hasPendingValue, queryClient]);

  const deferCreateComparisonFeature = useCallback((data: Omit<PlanComparisonFeature, 'id' | 'created_at' | 'updated_at'>) => {
    addChange({
      type: 'create',
      category: 'Comparativo',
      description: `Adicionar item "${data.feature_name}"`,
      execute: async () => {
        const { error } = await supabase
          .from('plan_comparison_features')
          .insert(data);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['plan-comparison-features'] });
        toast.success('Item adicionado com sucesso');
      },
    });
  }, [addChange, queryClient]);

  const deferUpdateComparisonFeature = useCallback((id: string, data: Partial<PlanComparisonFeature>, name: string) => {
    addChange({
      type: 'update',
      category: 'Comparativo',
      description: `Atualizar item "${name}"`,
      entityId: id,
      execute: async () => {
        const { error } = await supabase
          .from('plan_comparison_features')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['plan-comparison-features'] });
        toast.success('Item atualizado com sucesso');
      },
    });
  }, [addChange, queryClient]);

  const deferDeleteComparisonFeature = useCallback((feature: PlanComparisonFeature) => {
    addChange({
      type: 'delete',
      category: 'Comparativo',
      description: `Excluir item "${feature.feature_name}"`,
      entityId: feature.id,
      execute: async () => {
        const { error } = await supabase
          .from('plan_comparison_features')
          .delete()
          .eq('id', feature.id);
        
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['plan-comparison-features'] });
        toast.success('Item excluído com sucesso');
      },
    });
  }, [addChange, queryClient]);

  // ============ REORDERING ============

  const deferReorderGroups = useCallback((orderedIds: string[], groupNames: string[]) => {
    const field = 'order_groups';
    const changeId = 'reorder-groups';
    
    // Remove any existing reorder change first
    removeEntityFieldChange(changeId, field);
    clearPendingValue(changeId, field);
    
    // Store the new order as pending
    setPendingValue(changeId, field, orderedIds);
    
    // Mark each group as having reorder pending
    orderedIds.forEach((id, index) => {
      setPendingValue(id, 'order_index', index);
    });
    
    addChange({
      type: 'update',
      category: 'Ordenação',
      description: `Reordenar ${orderedIds.length} grupos`,
      entityId: changeId,
      field,
      data: { orderedIds, groupNames },
      execute: async () => {
        const updates = orderedIds.map((id, index) => 
          supabase
            .from('page_groups')
            .update({ order_index: index })
            .eq('id', id)
        );
        
        await Promise.all(updates);
        queryClient.invalidateQueries({ queryKey: ['page-groups'] });
        
        // Clear pending values for each group
        orderedIds.forEach(id => {
          clearPendingValue(id, 'order_index');
        });
        clearPendingValue(changeId, field);
        
        toast.success('Ordem dos grupos atualizada!');
      },
    });
  }, [addChange, removeEntityFieldChange, setPendingValue, clearPendingValue, queryClient]);

  const deferReorderPagesInGroup = useCallback((
    pageUpdates: { id: string; order_in_group: number }[], 
    groupName: string
  ) => {
    const field = 'order_pages';
    const groupId = pageUpdates.length > 0 ? `reorder-pages-${pageUpdates[0].id.split('-')[0]}` : 'reorder-pages';
    
    // Remove any existing reorder change for this group
    removeEntityFieldChange(groupId, field);
    clearPendingValue(groupId, field);
    
    // Store the new order as pending
    setPendingValue(groupId, field, pageUpdates);
    
    // Mark each page as having reorder pending
    pageUpdates.forEach(({ id, order_in_group }) => {
      setPendingValue(id, 'order_in_group', order_in_group);
    });
    
    addChange({
      type: 'update',
      category: 'Ordenação',
      description: `Reordenar páginas em "${groupName}"`,
      entityId: groupId,
      field,
      data: { pageUpdates, groupName },
      execute: async () => {
        const updates = pageUpdates.map(({ id, order_in_group }) =>
          supabase
            .from('pages')
            .update({ order_in_group })
            .eq('id', id)
        );
        
        await Promise.all(updates);
        queryClient.invalidateQueries({ queryKey: ['pages'] });
        
        // Clear pending values for each page
        pageUpdates.forEach(({ id }) => {
          clearPendingValue(id, 'order_in_group');
        });
        clearPendingValue(groupId, field);
        
        toast.success('Ordem das páginas atualizada!');
      },
    });
  }, [addChange, removeEntityFieldChange, setPendingValue, clearPendingValue, queryClient]);

  // ============ MOVE PAGE BETWEEN GROUPS ============

  const deferMovePageToGroup = useCallback((
    page: Page,
    targetGroupId: string | null,
    targetPosition: number,
    targetGroupName: string
  ) => {
    const field = 'group_id';
    const changeId = `move-page-${page.id}`;
    
    // Remove any existing move change for this page
    removeEntityFieldChange(changeId, field);
    clearPendingValue(page.id, field);
    clearPendingValue(page.id, 'order_in_group');
    
    // Store the new group and position as pending
    setPendingValue(page.id, field, targetGroupId);
    setPendingValue(page.id, 'order_in_group', targetPosition);
    
    addChange({
      type: 'update',
      category: 'Página',
      description: `Mover "${page.title}" para ${targetGroupName}`,
      entityId: changeId,
      field,
      data: { pageId: page.id, targetGroupId, targetPosition, targetGroupName },
      execute: async () => {
        const { error } = await supabase
          .from('pages')
          .update({ 
            group_id: targetGroupId, 
            order_in_group: targetPosition 
          })
          .eq('id', page.id);
        
        if (error) throw error;
        
        // Clear pending values
        clearPendingValue(page.id, field);
        clearPendingValue(page.id, 'order_in_group');
        
        queryClient.invalidateQueries({ queryKey: ['pages'] });
        toast.success(`Página movida para ${targetGroupName}!`);
      },
    });
  }, [addChange, removeEntityFieldChange, setPendingValue, clearPendingValue, queryClient]);

  return {
    // Pages
    deferToggleUserStatus,
    deferToggleShowWhenUnavailable,
    deferToggleAdminStatus,
    deferCreatePage,
    deferUpdatePage,
    deferDeletePage,
    deferUpdatePagePlan,
    // Groups
    deferCreateGroup,
    deferUpdateGroup,
    deferDeleteGroup,
    // Reordering & Moving
    deferReorderGroups,
    deferReorderPagesInGroup,
    deferMovePageToGroup,
    // Plans
    deferTogglePlanActive,
    deferUpdatePlan,
    deferCreatePlan,
    deferDeletePlan,
    // Comparison
    deferToggleComparisonFeature,
    deferCreateComparisonFeature,
    deferUpdateComparisonFeature,
    deferDeleteComparisonFeature,
  };
}
