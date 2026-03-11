import { useState } from 'react';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/** Extrai mensagem de erro do corpo da resposta (vários formatos possíveis). */
function normalizeErrorMessage(body: Record<string, unknown> | null | undefined, status: number): string {
  if (!body || typeof body !== 'object') return 'Erro ao processar arquivo. Tente novamente.';
  const err = body.error;
  if (typeof err === 'string' && err.trim()) return err.trim();
  if (err && typeof err === 'object' && typeof (err as { message?: string }).message === 'string') {
    return (err as { message: string }).message.trim();
  }
  if (typeof body.message === 'string' && body.message.trim()) return body.message.trim();
  if (typeof body.detail === 'string' && body.detail.trim()) return body.detail.trim();
  if (Array.isArray(body.errors) && body.errors[0] && typeof (body.errors[0] as { message?: string }).message === 'string') {
    return (body.errors[0] as { message: string }).message;
  }
  if (status === 401) return 'Sessão expirada. Faça login novamente.';
  if (status === 413) return 'Arquivo muito grande. Use um arquivo menor ou exporte em XML/DEC.';
  if (status >= 500) return 'Serviço temporariamente indisponível. Tente novamente em instantes.';
  return 'Erro ao processar arquivo. Verifique o formato (XML, DEC ou PDF) e tente novamente.';
}

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

      const text = await response.text();
      let result: Record<string, unknown>;
      try {
        if (!text?.trim()) {
          throw new Error(
            response.status >= 500
              ? 'Serviço temporariamente indisponível. Tente novamente em instantes.'
              : 'Resposta vazia do servidor. Tente novamente.'
          );
        }
        result = JSON.parse(text) as Record<string, unknown>;
      } catch (parseErr) {
        if (parseErr instanceof SyntaxError) {
          console.error('[IR Import] Resposta não-JSON:', response.status, text?.slice(0, 200));
          throw new Error(
            response.status >= 500
              ? 'Serviço temporariamente indisponível. Tente novamente em instantes.'
              : 'Resposta inválida do servidor. Tente novamente.'
          );
        }
        throw parseErr;
      }

      if (!response.ok) {
        const errorMsg = normalizeErrorMessage(result, response.status);
        console.error('[IR Import] Erro da API:', response.status, result);
        throw new Error(errorMsg);
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
