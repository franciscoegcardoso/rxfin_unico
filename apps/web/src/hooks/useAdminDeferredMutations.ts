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
import type { AppSettings } from '@/hooks/useAppSettings';
import type { UserProfileUpdate } from '@/hooks/useAdminUsers';

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

  // ============ APP SETTINGS ============

  const deferUpdateSettings = useCallback((updates: Partial<AppSettings>, description: string) => {
    addChange({
      type: 'update',
      category: 'Configuração',
      description,
      execute: async () => {
        const upserts = Object.entries(updates).map(([key, value]) => ({
          setting_key: key,
          setting_value: JSON.stringify(value),
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('app_settings')
          .upsert(upserts, { onConflict: 'setting_key' });

        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['app-settings'] });
        logAction('UPDATE_SETTINGS', 'app_settings', null, { fields: Object.keys(updates) }, 'medium');
        toast.success('Configurações salvas!');
      },
    });
  }, [addChange, logAction, queryClient]);

  // ============ NOTIFICATION TEMPLATES ============

  const deferUpdateNotificationTemplate = useCallback((id: string, changes: Record<string, any>, name: string) => {
    addChange({
      type: 'update',
      category: 'Template',
      description: `Atualizar template "${name}"`,
      entityId: id,
      execute: async () => {
        const { error } = await supabase
          .from('notification_templates')
          .update(changes)
          .eq('id', id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
        toast.success('Template salvo com sucesso');
      },
    });
  }, [addChange, queryClient]);

  const deferToggleNotificationTemplate = useCallback((id: string, name: string, currentActive: boolean) => {
    const newStatus = !currentActive;
    addChange({
      type: 'toggle',
      category: 'Template',
      description: `${newStatus ? 'Ativar' : 'Desativar'} template "${name}"`,
      entityId: id,
      field: 'is_active',
      execute: async () => {
        const { error } = await supabase
          .from('notification_templates')
          .update({ is_active: newStatus })
          .eq('id', id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
        toast.success(`Template ${newStatus ? 'ativado' : 'desativado'}!`);
      },
    });
  }, [addChange, queryClient]);

  // ============ USERS ============

  const deferUpdateUser = useCallback((id: string, updates: UserProfileUpdate, userName: string) => {
    addChange({
      type: 'update',
      category: 'Usuário',
      description: `Atualizar usuário "${userName}"`,
      entityId: id,
      execute: async () => {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        logAction('UPDATE_USER', 'profiles', id, updates);
        toast.success('Usuário atualizado!');
      },
    });
  }, [addChange, logAction, queryClient]);

  const deferToggleUserActive = useCallback((userId: string, userName: string, currentActive: boolean) => {
    const newStatus = !currentActive;
    addChange({
      type: 'toggle',
      category: 'Usuário',
      description: `${newStatus ? 'Ativar' : 'Desativar'} usuário "${userName}"`,
      entityId: userId,
      field: 'is_active',
      execute: async () => {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: newStatus })
          .eq('id', userId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        logAction('TOGGLE_USER_ACTIVE', 'profiles', userId, { is_active: newStatus });
        toast.success(`Usuário ${newStatus ? 'ativado' : 'desativado'}!`);
      },
    });
  }, [addChange, logAction, queryClient]);

  const deferUpdateSubscriptionRole = useCallback((userId: string, userName: string, planSlug: string) => {
    addChange({
      type: 'update',
      category: 'Usuário',
      description: `Alterar plano de "${userName}" para "${planSlug}"`,
      entityId: userId,
      field: 'plan_slug',
      execute: async () => {
        const { data: plan, error: planError } = await supabase
          .from('subscription_plans')
          .select('id, duration_days')
          .eq('slug', planSlug)
          .single();
        if (planError || !plan) throw new Error(`Plan not found for slug: ${planSlug}`);

        const { data: workspace, error: wsError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', userId)
          .eq('is_active', true)
          .single();
        if (wsError || !workspace) throw new Error('Workspace not found for user');

        const { error: updateError } = await supabase
          .from('workspaces')
          .update({
            plan_id: plan.id,
            plan_expires_at: new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', workspace.id);
        if (updateError) throw updateError;

        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        logAction('UPDATE_PLAN', 'workspaces', userId, { planSlug }, 'high');
        toast.success(`Plano alterado para "${planSlug}"!`);
      },
    });
  }, [addChange, logAction, queryClient]);

  const deferGrantAdmin = useCallback((userId: string, userName: string) => {
    addChange({
      type: 'update',
      category: 'Usuário',
      description: `Promover "${userName}" a administrador`,
      entityId: userId,
      execute: async () => {
        const { data, error } = await supabase.rpc('admin_manage_role', {
          target_user_id: userId,
          target_role: 'admin',
          action: 'grant',
        });
        if (error) throw error;
        const result = data as { success: boolean; error?: string };
        if (!result.success) throw new Error(result.error || 'Erro ao promover administrador');
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        queryClient.invalidateQueries({ queryKey: ['is-admin'] });
        logAction('GRANT_ADMIN', 'user_roles', userId, {}, 'critical');
        toast.success('Usuário promovido a administrador!');
      },
    });
  }, [addChange, logAction, queryClient]);

  const deferRevokeAdmin = useCallback((userId: string, userName: string) => {
    addChange({
      type: 'update',
      category: 'Usuário',
      description: `Remover admin de "${userName}"`,
      entityId: userId,
      execute: async () => {
        const { data, error } = await supabase.rpc('admin_manage_role', {
          target_user_id: userId,
          target_role: 'admin',
          action: 'revoke',
        });
        if (error) throw error;
        const result = data as { success: boolean; error?: string };
        if (!result.success) throw new Error(result.error || 'Erro ao remover administrador');
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        queryClient.invalidateQueries({ queryKey: ['is-admin'] });
        logAction('REVOKE_ADMIN', 'user_roles', userId, {}, 'critical');
        toast.success('Privilégios de admin removidos');
      },
    });
  }, [addChange, logAction, queryClient]);

  // ============ LEGAL DOCUMENTS ============

  const deferUploadLegalDocument = useCallback((
    documentType: string,
    file: File,
    nextVersionNumber: number,
    currentVersionId: string | null,
    changeDescription: string | null,
    effectiveDate: string | null,
    docLabel: string,
  ) => {
    addChange({
      type: 'create',
      category: 'Documento Legal',
      description: `Publicar v${nextVersionNumber} de "${docLabel}"`,
      execute: async () => {
        const timestamp = Date.now();
        const filePath = `${documentType}/v${nextVersionNumber}_${timestamp}.pdf`;

        const { error: uploadError } = await supabase.storage
          .from('legal-documents')
          .upload(filePath, file, { contentType: 'application/pdf', upsert: false });
        if (uploadError) throw uploadError;

        if (currentVersionId) {
          const { error: updateError } = await supabase
            .from('legal_document_versions')
            .update({ is_current: false })
            .eq('id', currentVersionId);
          if (updateError) throw updateError;
        }

        const { error: insertError } = await supabase
          .from('legal_document_versions')
          .insert({
            document_type: documentType,
            version_number: nextVersionNumber,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            change_description: changeDescription || null,
            effective_date: effectiveDate,
            is_current: true,
          });
        if (insertError) throw insertError;

        queryClient.invalidateQueries({ queryKey: ['legal-document-versions', documentType] });
        logAction('UPLOAD_LEGAL_DOCUMENT', 'legal_document_versions', null, { documentType, version: nextVersionNumber }, 'high');
        toast.success('Documento enviado com sucesso!');
      },
    });
  }, [addChange, logAction, queryClient]);

  // ============ EMAIL TEMPLATES ============

  const deferToggleEmailTemplate = useCallback((id: string, name: string, newActive: boolean) => {
    addChange({
      type: 'toggle',
      category: 'Email Template',
      description: `${newActive ? 'Ativar' : 'Desativar'} template "${name}"`,
      entityId: id,
      field: 'is_active',
      execute: async () => {
        const { error } = await supabase
          .from('email_templates')
          .update({ is_active: newActive })
          .eq('id', id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['email-templates'] });
        toast.success(`Template ${newActive ? 'ativado' : 'desativado'}!`);
      },
    });
  }, [addChange, queryClient]);

  const deferDeleteEmailTemplate = useCallback((id: string, name: string) => {
    addChange({
      type: 'delete',
      category: 'Email Template',
      description: `Excluir template "${name}"`,
      entityId: id,
      execute: async () => {
        const { error } = await supabase
          .from('email_templates')
          .delete()
          .eq('id', id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['email-templates'] });
        toast.success('Template excluído!');
      },
    });
  }, [addChange, queryClient]);

  const deferSaveEmailTemplate = useCallback((payload: Record<string, any>, isEditing: boolean, id?: string) => {
    const name = payload.name || 'Template';
    addChange({
      type: isEditing ? 'update' : 'create',
      category: 'Email Template',
      description: `${isEditing ? 'Atualizar' : 'Criar'} template "${name}"`,
      entityId: id,
      execute: async () => {
        if (isEditing && id) {
          const { error } = await supabase
            .from('email_templates')
            .update(payload)
            .eq('id', id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('email_templates')
            .insert([payload] as any);
          if (error) throw error;
        }
        queryClient.invalidateQueries({ queryKey: ['email-templates'] });
        toast.success(isEditing ? 'Template atualizado!' : 'Template criado!');
      },
    });
  }, [addChange, queryClient]);

  // ============ EMAIL CAMPAIGNS ============

  const deferDeleteCampaign = useCallback((id: string, title: string) => {
    addChange({
      type: 'delete',
      category: 'Campanha',
      description: `Excluir campanha "${title}"`,
      entityId: id,
      execute: async () => {
        const { error } = await supabase
          .from('email_campaigns')
          .delete()
          .eq('id', id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
        toast.success('Campanha excluída!');
      },
    });
  }, [addChange, queryClient]);

  const deferDuplicateCampaign = useCallback((campaign: { title: string; subject: string; segment: string }) => {
    addChange({
      type: 'create',
      category: 'Campanha',
      description: `Duplicar campanha "${campaign.title}"`,
      execute: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { error } = await supabase
          .from('email_campaigns')
          .insert({
            created_by: user.id,
            name: `${campaign.title} (Cópia)`,
            title: `${campaign.title} (Cópia)`,
            subject: campaign.subject,
            html_body: campaign.subject,
            body: '',
            segment: campaign.segment,
            status: 'draft',
            trigger_type: 'manual',
            days_after_trigger: 0,
          });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
        toast.success('Campanha duplicada!');
      },
    });
  }, [addChange, queryClient]);

  const deferSaveCampaign = useCallback((payload: Record<string, any>, isEditing: boolean, campaignId?: string | null) => {
    const title = payload.title || 'Campanha';
    addChange({
      type: isEditing ? 'update' : 'create',
      category: 'Campanha',
      description: `${isEditing ? 'Salvar' : 'Criar rascunho'} "${title}"`,
      entityId: campaignId || undefined,
      execute: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        if (isEditing && campaignId) {
          const { error } = await supabase
            .from('email_campaigns')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', campaignId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('email_campaigns')
            .insert({
              created_by: user.id,
              name: payload.title,
              title: payload.title,
              subject: payload.subject,
              html_body: payload.body,
              body: payload.body,
              segment: payload.segment,
              status: 'draft',
              trigger_type: 'manual',
              days_after_trigger: 0,
            });
          if (error) throw error;
        }
        queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['email-campaign', campaignId] });
        toast.success(isEditing ? 'Campanha atualizada!' : 'Rascunho salvo!');
      },
    });
  }, [addChange, queryClient]);

  // ============ GUEST INVITATION ============

  const deferInviteGuest = useCallback((guestEmail: string, principalUserName: string) => {
    addChange({
      type: 'create',
      category: 'Convite',
      description: `Convidar "${guestEmail}" para conta de "${principalUserName}"`,
      execute: async () => {
        const { data, error } = await supabase.functions.invoke('manage-guest-invitation', {
          body: { guest_email: guestEmail },
          headers: { 'Content-Type': 'application/json' },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        toast.success(data.message || 'Convite enviado com sucesso!');
      },
    });
  }, [addChange, queryClient]);

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
    // Settings
    deferUpdateSettings,
    // Notification Templates
    deferUpdateNotificationTemplate,
    deferToggleNotificationTemplate,
    // Users
    deferUpdateUser,
    deferToggleUserActive,
    deferUpdateSubscriptionRole,
    deferGrantAdmin,
    deferRevokeAdmin,
    // Legal Documents
    deferUploadLegalDocument,
    // Email Templates
    deferToggleEmailTemplate,
    deferDeleteEmailTemplate,
    deferSaveEmailTemplate,
    // Email Campaigns
    deferDeleteCampaign,
    deferDuplicateCampaign,
    deferSaveCampaign,
    // Guest Invitation
    deferInviteGuest,
  };
}
