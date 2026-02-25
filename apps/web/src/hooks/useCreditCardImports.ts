import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CreditCardImport {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  card_id: string | null;
  import_batch_id: string;
  transaction_count: number;
  total_value: number;
  imported_at: string;
  created_at: string;
}

export function useCreditCardImports() {
  const { user } = useAuth();
  const [imports, setImports] = useState<CreditCardImport[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchImports = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('credit_card_imports')
        .select('*')
        .eq('user_id', user.id)
        .order('imported_at', { ascending: false });

      if (error) throw error;
      setImports((data as CreditCardImport[]) || []);
    } catch (err) {
      console.error('Error fetching imports:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  const saveImport = async (
    file: File,
    batchId: string,
    cardId: string | null,
    transactionCount: number,
    totalValue: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Upload file to storage
      const filePath = `${user.id}/${batchId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('credit-card-statements')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: insertError } = await supabase
        .from('credit_card_imports')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          card_id: cardId,
          import_batch_id: batchId,
          transaction_count: transactionCount,
          total_value: totalValue,
        });

      if (insertError) throw insertError;

      await fetchImports();
      return true;
    } catch (err) {
      console.error('Error saving import:', err);
      toast.error('Erro ao salvar arquivo de importação');
      return false;
    }
  };

  const downloadImport = async (importRecord: CreditCardImport): Promise<void> => {
    try {
      const { data, error } = await supabase.storage
        .from('credit-card-statements')
        .download(importRecord.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = importRecord.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading import:', err);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const deleteImport = async (importRecord: CreditCardImport): Promise<boolean> => {
    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('credit-card-statements')
        .remove([importRecord.file_path]);

      if (storageError) {
        console.warn('Error deleting file from storage:', storageError);
        // Continue anyway to delete metadata
      }

      // Delete associated transactions
      const { error: transactionsError } = await supabase
        .from('credit_card_transactions')
        .delete()
        .eq('import_batch_id', importRecord.import_batch_id);

      if (transactionsError) throw transactionsError;

      // Delete import record
      const { error: importError } = await supabase
        .from('credit_card_imports')
        .delete()
        .eq('id', importRecord.id);

      if (importError) throw importError;

      toast.success('Importação excluída com sucesso');
      await fetchImports();
      return true;
    } catch (err) {
      console.error('Error deleting import:', err);
      toast.error('Erro ao excluir importação');
      return false;
    }
  };

  return {
    imports,
    loading,
    fetchImports,
    saveImport,
    downloadImport,
    deleteImport,
  };
}
