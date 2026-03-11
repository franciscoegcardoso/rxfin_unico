import { useState } from 'react';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BemDireito {
  codigo: string;
  descricao: string;
  situacaoAnterior: number;
  situacaoAtual: number;
  discriminacao: string;
}

export interface Rendimento {
  tipo: string;
  cnpjFonte: string;
  nomeFonte: string;
  valor: number;
}

export interface Divida {
  codigo: string;
  descricao: string;
  situacaoAnterior: number;
  situacaoAtual: number;
  discriminacao: string;
}

export interface IRImportData {
  id: string;
  anoExercicio: number;
  anoCalendario: number;
  bensDireitos: BemDireito[];
  rendimentosTributaveis: Rendimento[];
  rendimentosIsentos: Rendimento[];
  dividas: Divida[];
  importedAt: string;
  sourceType: 'xml' | 'pdf';
  fileName?: string;
  filePath?: string;
}

export const useIRImport = () => {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imports, setImports] = useState<IRImportData[]>([]);

  const processFile = async (file: File): Promise<IRImportData | null> => {
    if (!session?.access_token) {
      toast.error('Você precisa estar logado para importar');
      return null;
    }

    setIsLoading(true);

    try {
      // Determine file type
      const fileName = file.name.toLowerCase();
      let fileType: 'xml' | 'pdf';
      
      if (fileName.endsWith('.xml') || fileName.endsWith('.dec')) {
        fileType = 'xml';
      } else if (fileName.endsWith('.pdf')) {
        fileType = 'pdf';
      } else {
        toast.error('Formato não suportado. Use XML, DEC ou PDF.');
        return null;
      }

      // Read file as base64
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix if present
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Chamada à edge function: Headers API evita ByteString inválido; resposta tratada com fallback
      const baseUrl = typeof SUPABASE_URL === 'string' ? SUPABASE_URL.trim() : '';
      const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}/functions/v1/process-ir-import` : '';
      const tokenStr = String(session?.access_token ?? '').trim();
      if (!url || !tokenStr) {
        toast.error('Sessão inválida. Faça login novamente.');
        return null;
      }
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Authorization', `Bearer ${tokenStr}`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fileContent,
          fileType,
          fileName: file.name,
        }),
      });

      let result: { error?: string | { message?: string }; message?: string; data?: unknown; savedId?: string; fileName?: string; filePath?: string };
      try {
        result = await response.json();
      } catch {
        throw new Error(
          response.status >= 500
            ? 'Serviço temporariamente indisponível. Tente novamente em instantes.'
            : 'Resposta inválida do servidor. Tente novamente.'
        );
      }

      if (!response.ok) {
        const errorMsg =
          typeof result?.error === 'string'
            ? result.error
            : (result?.error as { message?: string })?.message ?? 'Erro ao processar arquivo';
        throw new Error(errorMsg);
      }

      toast.success(result.message || 'Importação concluída!');

      const importData: IRImportData = {
        id: result.savedId,
        anoExercicio: result.data.anoExercicio,
        anoCalendario: result.data.anoCalendario,
        bensDireitos: result.data.bensDireitos,
        rendimentosTributaveis: result.data.rendimentosTributaveis,
        rendimentosIsentos: result.data.rendimentosIsentos,
        dividas: result.data.dividas,
        importedAt: new Date().toISOString(),
        sourceType: fileType,
        fileName: result.fileName,
        filePath: result.filePath,
      };

      return importData;

    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao importar arquivo');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchImports = async () => {
    if (!session?.access_token) return;

    try {
      const { data, error } = await supabase
        .from('ir_imports')
        .select('*')
        .order('ano_exercicio', { ascending: false });

      if (error) throw error;

      const mapped: IRImportData[] = (data || []).map((item: any) => ({
        id: item.id,
        anoExercicio: item.ano_exercicio,
        anoCalendario: item.ano_calendario,
        bensDireitos: item.bens_direitos || [],
        rendimentosTributaveis: item.rendimentos_tributaveis || [],
        rendimentosIsentos: item.rendimentos_isentos || [],
        dividas: item.dividas || [],
        importedAt: item.imported_at,
        sourceType: item.source_type,
        fileName: item.file_name,
        filePath: item.file_path,
      }));

      setImports(mapped);
    } catch (error) {
      console.error('Fetch imports error:', error);
    }
  };

  const deleteImport = async (id: string) => {
    try {
      // Get file path before deleting
      const importToDelete = imports.find(i => i.id === id);
      
      const { error } = await supabase
        .from('ir_imports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Delete file from storage if exists
      if (importToDelete?.filePath) {
        await supabase.storage.from('ir-imports').remove([importToDelete.filePath]);
      }

      setImports(prev => prev.filter(i => i.id !== id));
      toast.success('Importação removida');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao remover importação');
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('ir-imports')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  return {
    isLoading,
    imports,
    processFile,
    fetchImports,
    deleteImport,
    downloadFile,
  };
};
