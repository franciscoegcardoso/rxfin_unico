import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { uploadIRFileMultipart } from '@/lib/processIrImportUpload';

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

    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSizeBytes) {
      toast.error('Arquivo muito grande (máx. 10 MB). Use um arquivo menor ou exporte em XML/DEC.');
      return null;
    }
    if (file.size === 0) {
      toast.error('O arquivo está vazio. Selecione um arquivo válido.');
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

      const { data: responseBody, error: uploadErr } = await uploadIRFileMultipart(file);
      if (uploadErr) {
        throw uploadErr;
      }
      const result = responseBody as Record<string, unknown>;
      if (!result || typeof result !== 'object') {
        throw new Error('Resposta inválida do servidor.');
      }

      const data = result?.data as Record<string, unknown> | undefined;
      if (!data || typeof data.anoExercicio !== 'number') {
        console.error('[IR Import] Resposta sem dados válidos:', result);
        throw new Error('O servidor não devolveu os dados da declaração. Tente importar novamente.');
      }

      toast.success((result.message as string) || 'Importação concluída!');

      const importData: IRImportData = {
        id: String(result.savedId ?? ''),
        anoExercicio: Number(data.anoExercicio),
        anoCalendario: Number(data.anoCalendario ?? data.anoExercicio - 1),
        bensDireitos: Array.isArray(data.bensDireitos) ? data.bensDireitos : [],
        rendimentosTributaveis: Array.isArray(data.rendimentosTributaveis) ? data.rendimentosTributaveis : [],
        rendimentosIsentos: Array.isArray(data.rendimentosIsentos) ? data.rendimentosIsentos : [],
        dividas: Array.isArray(data.dividas) ? data.dividas : [],
        importedAt: new Date().toISOString(),
        sourceType: fileType,
        fileName: result.fileName as string | undefined,
        filePath: result.filePath as string | undefined,
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
