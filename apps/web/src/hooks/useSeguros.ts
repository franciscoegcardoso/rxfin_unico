import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Insurance, InsuranceType, InsuranceCoverage } from '@/types/seguro';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface SeguroInsert {
  nome: string;
  tipo: InsuranceType;
  seguradora: string;
  numero_apolice?: string;
  premio_mensal: number;
  premio_anual: number;
  valor_cobertura: number;
  franquia?: number;
  data_inicio: string;
  data_fim: string;
  renovacao_automatica?: boolean;
  asset_id?: string;
  coberturas?: InsuranceCoverage[];
  forma_pagamento?: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'a_vista';
  dia_vencimento?: number;
  observacoes?: string;
  arquivo_path?: string;
  arquivo_nome?: string;
  // Campos para garantia de compra
  is_warranty?: boolean;
  warranty_extended?: boolean;
  warranty_extended_months?: number;
  warranty_store?: string;
}

// Upload file to storage
async function uploadApoliceFile(userId: string, file: File): Promise<{ path: string; name: string }> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from('seguros-apolices')
    .upload(filePath, file);

  if (error) throw error;

  return { path: filePath, name: file.name };
}

// Delete file from storage
async function deleteApoliceFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('seguros-apolices')
    .remove([filePath]);

  if (error) console.error('Error deleting file:', error);
}

// Get signed URL for download
export async function getApoliceDownloadUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('seguros-apolices')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) {
    console.error('Error getting download URL:', error);
    return null;
  }

  return data.signedUrl;
}

export function useSeguros() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Expose upload function
  const uploadFile = async (file: File): Promise<{ path: string; name: string } | null> => {
    if (!user?.id) return null;
    try {
      return await uploadApoliceFile(user.id, file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao fazer upload do arquivo');
      return null;
    }
  };

  // Expose delete function
  const deleteFile = async (filePath: string): Promise<void> => {
    await deleteApoliceFile(filePath);
  };

  const { data: seguros = [], isLoading, error } = useQuery({
    queryKey: ['seguros', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('seguros')
        .select('*')
        .eq('user_id', user.id)
        .order('data_fim', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        tipo: item.tipo as InsuranceType,
        coberturas: (item.coberturas as unknown as InsuranceCoverage[]) || [],
        forma_pagamento: item.forma_pagamento as Insurance['forma_pagamento'],
      })) as Insurance[];
    },
    enabled: !!user?.id,
  });

  const addSeguro = useMutation({
    mutationFn: async (seguro: SeguroInsert) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('seguros')
        .insert({
          ...seguro,
          user_id: user.id,
          coberturas: (seguro.coberturas || []) as unknown as Json[],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguros'] });
      toast.success('Seguro cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao cadastrar seguro:', error);
      toast.error('Erro ao cadastrar seguro');
    },
  });

  const updateSeguro = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Insurance> & { id: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('seguros')
        .update({
          ...updates,
          coberturas: (updates.coberturas || []) as unknown as Json[],
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguros'] });
      toast.success('Seguro atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar seguro:', error);
      toast.error('Erro ao atualizar seguro');
    },
  });

  const deleteSeguro = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('seguros')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguros'] });
      toast.success('Seguro excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir seguro:', error);
      toast.error('Erro ao excluir seguro');
    },
  });

  // Cálculos agregados
  const totalPremioMensal = seguros.reduce((sum, s) => sum + (s.premio_mensal || 0), 0);
  const totalPremioAnual = seguros.reduce((sum, s) => sum + (s.premio_anual || 0), 0);
  const totalCobertura = seguros.reduce((sum, s) => sum + (s.valor_cobertura || 0), 0);

  // Seguros ativos (vigentes)
  const today = new Date().toISOString().split('T')[0];
  const segurosAtivos = seguros.filter(s => s.data_fim >= today && s.data_inicio <= today);
  
  // Seguros próximos a vencer (30 dias)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const proximosVencer = seguros.filter(s => {
    const dataFim = new Date(s.data_fim);
    return dataFim >= new Date() && dataFim <= thirtyDaysFromNow;
  });

  // Seguros vencidos
  const segurosVencidos = seguros.filter(s => s.data_fim < today);

  return {
    seguros,
    segurosAtivos,
    segurosVencidos,
    proximosVencer,
    isLoading,
    error,
    addSeguro,
    updateSeguro,
    deleteSeguro,
    totalPremioMensal,
    totalPremioAnual,
    totalCobertura,
    uploadFile,
    deleteFile,
  };
}
