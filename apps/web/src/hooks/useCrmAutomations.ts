import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CrmAutomation {
  id: string;
  name: string;
  trigger_description: string;
  action_description: string;
  delay: string;
  channels: string[];
  is_active: boolean;
  icon_name: string;
  icon_color: string;
  n8n_workflow_id: string | null;
  n8n_workflow_name: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useCrmAutomations() {
  return useQuery({
    queryKey: ['crm-automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_automations')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as CrmAutomation[];
    },
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (automation: Omit<CrmAutomation, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('crm_automations')
        .insert(automation as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-automations'] }),
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; updates: Partial<CrmAutomation> }) => {
      const { error } = await supabase
        .from('crm_automations')
        .update({ ...params.updates, updated_at: new Date().toISOString() } as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-automations'] }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_automations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-automations'] }),
  });
}
