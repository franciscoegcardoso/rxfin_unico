import { useState, useEffect, useCallback } from 'react';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    comprovante_id?: string;
    categoria?: string;
  };
  created_at: string;
}

export interface Comprovante {
  id: string;
  categoria: string;
  subcategoria?: string;
  valor: number;
  data_comprovante: string;
  prestador_nome?: string;
  prestador_cpf_cnpj?: string;
  beneficiario_nome?: string;
  beneficiario_cpf?: string;
  descricao?: string;
  arquivo_path?: string;
  arquivo_nome?: string;
  is_valid_deduction: boolean;
  validation_notes?: string;
  ano_fiscal: number;
  created_at: string;
}

export interface ComprovanteStats {
  totalByCategoria: Record<string, number>;
  countByCategoria: Record<string, number>;
  totalDedutivel: number;
  totalNaoDedutivel: number;
  anoAtual: number;
}

const CHAT_URL = `${SUPABASE_URL}/functions/v1/fiscal-organizer`;

export const useFiscalOrganizer = () => {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [comprovantes, setComprovantes] = useState<Comprovante[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const anoAtual = new Date().getFullYear();

  // Fetch chat history
  const fetchChatHistory = useCallback(async () => {
    if (!session?.access_token) return;
    
    setIsFetchingHistory(true);
    try {
      const { data, error } = await supabase
        .from('ir_fiscal_chat')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      
      setMessages((data || []).map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        metadata: m.metadata as ChatMessage['metadata'],
        created_at: m.created_at,
      })));
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setIsFetchingHistory(false);
    }
  }, [session?.access_token]);

  // Fetch comprovantes
  const fetchComprovantes = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const { data, error } = await supabase
        .from('ir_comprovantes')
        .select('*')
        .eq('ano_fiscal', anoAtual)
        .order('data_comprovante', { ascending: false });

      if (error) throw error;
      
      setComprovantes((data || []).map(c => ({
        id: c.id,
        categoria: c.categoria,
        subcategoria: c.subcategoria || undefined,
        valor: Number(c.valor),
        data_comprovante: c.data_comprovante,
        prestador_nome: c.prestador_nome || undefined,
        prestador_cpf_cnpj: c.prestador_cpf_cnpj || undefined,
        beneficiario_nome: c.beneficiario_nome || undefined,
        beneficiario_cpf: c.beneficiario_cpf || undefined,
        descricao: c.descricao || undefined,
        arquivo_path: c.arquivo_path || undefined,
        arquivo_nome: c.arquivo_nome || undefined,
        is_valid_deduction: c.is_valid_deduction ?? true,
        validation_notes: c.validation_notes || undefined,
        ano_fiscal: c.ano_fiscal,
        created_at: c.created_at,
      })));
    } catch (error) {
      console.error('Error fetching comprovantes:', error);
    }
  }, [session?.access_token, anoAtual]);

  useEffect(() => {
    fetchChatHistory();
    fetchComprovantes();
  }, [fetchChatHistory, fetchComprovantes]);

  // Calculate stats
  const getStats = (): ComprovanteStats => {
    const totalByCategoria: Record<string, number> = {};
    const countByCategoria: Record<string, number> = {};
    let totalDedutivel = 0;
    let totalNaoDedutivel = 0;

    comprovantes.forEach(c => {
      totalByCategoria[c.categoria] = (totalByCategoria[c.categoria] || 0) + c.valor;
      countByCategoria[c.categoria] = (countByCategoria[c.categoria] || 0) + 1;
      
      if (c.is_valid_deduction) {
        totalDedutivel += c.valor;
      } else {
        totalNaoDedutivel += c.valor;
      }
    });

    return { totalByCategoria, countByCategoria, totalDedutivel, totalNaoDedutivel, anoAtual };
  };

  // Send chat message with streaming
  const sendMessage = async (content: string) => {
    const token = session?.access_token;
    if (typeof token !== 'string' || !token.trim() || !content.trim()) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let assistantContent = '';
    const assistantId = crypto.randomUUID();

    try {
      // Save user message
      const { error: insertError } = await supabase.from('ir_fiscal_chat').insert({
        id: userMessage.id,
        user_id: session.user.id,
        role: 'user',
        content: userMessage.content,
      });

      if (insertError) {
        console.error('ir_fiscal_chat insert error:', insertError);
        throw new Error(insertError.message || 'Erro ao salvar sua mensagem.');
      }

      // Stream response (header values must be valid ByteStrings)
      let resp: Response;
      try {
        const authHeader = `Bearer ${token.trim()}`;
        resp = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });
      } catch (fetchErr) {
        console.error('Fiscal organizer fetch error:', fetchErr);
        throw new Error('Falha de conexão com o assistente. Verifique sua internet e tente novamente.');
      }

      if (!resp.ok) {
        let message = 'Não foi possível conectar ao assistente. Tente novamente.';
        try {
          const body = await resp.json();
          if (typeof body?.error === 'string' && body.error.trim()) {
            message = body.error;
          }
        } catch {
          // ignore
        }
        if (resp.status === 401) {
          message = 'Sessão expirada. Faça login novamente.';
        } else if (resp.status === 429) {
          message = 'Muitas mensagens. Aguarde um momento.';
        }
        throw new Error(message);
      }

      if (!resp.body) {
        throw new Error('Resposta do assistente indisponível. Tente novamente.');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      // Add empty assistant message
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (chunk) {
              assistantContent += chunk;
              setMessages(prev => 
                prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      if (assistantContent) {
        await supabase.from('ir_fiscal_chat').insert({
          id: assistantId,
          user_id: session.user.id,
          role: 'assistant',
          content: assistantContent,
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Erro ao enviar mensagem. Tente novamente.';
      toast.error(message);
      // Remove failed messages
      setMessages(prev => prev.filter(m => m.id !== userMessage.id && m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  };

  // Upload file to storage
  const uploadFile = async (file: File): Promise<{ path: string; name: string } | null> => {
    if (!session?.user.id) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from('ir-comprovantes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      return { path: filePath, name: file.name };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload do arquivo');
      return null;
    }
  };

  // Add comprovante with optional file
  const addComprovante = async (
    data: Omit<Comprovante, 'id' | 'created_at'>,
    file?: File
  ) => {
    if (!session?.access_token) return null;

    try {
      let arquivo_path: string | undefined;
      let arquivo_nome: string | undefined;

      // Upload file if provided
      if (file) {
        const uploadResult = await uploadFile(file);
        if (uploadResult) {
          arquivo_path = uploadResult.path;
          arquivo_nome = uploadResult.name;
        }
      }

      const { data: inserted, error } = await supabase
        .from('ir_comprovantes')
        .insert({
          user_id: session.user.id,
          ...data,
          arquivo_path,
          arquivo_nome,
        })
        .select()
        .single();

      if (error) throw error;

      const newComprovante: Comprovante = {
        id: inserted.id,
        categoria: inserted.categoria,
        subcategoria: inserted.subcategoria || undefined,
        valor: Number(inserted.valor),
        data_comprovante: inserted.data_comprovante,
        prestador_nome: inserted.prestador_nome || undefined,
        prestador_cpf_cnpj: inserted.prestador_cpf_cnpj || undefined,
        beneficiario_nome: inserted.beneficiario_nome || undefined,
        beneficiario_cpf: inserted.beneficiario_cpf || undefined,
        descricao: inserted.descricao || undefined,
        arquivo_path: inserted.arquivo_path || undefined,
        arquivo_nome: inserted.arquivo_nome || undefined,
        is_valid_deduction: inserted.is_valid_deduction ?? true,
        validation_notes: inserted.validation_notes || undefined,
        ano_fiscal: inserted.ano_fiscal,
        created_at: inserted.created_at,
      };

      setComprovantes(prev => [newComprovante, ...prev]);
      toast.success('Documento criptografado e arquivado com segurança no seu cofre fiscal!');
      return newComprovante;
    } catch (error) {
      console.error('Error adding comprovante:', error);
      toast.error('Erro ao salvar comprovante');
      return null;
    }
  };

  // Download file from storage
  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('ir-comprovantes')
        .download(filePath);

      if (error) throw error;

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

  // Update comprovante
  const updateComprovante = async (
    id: string,
    data: Partial<Omit<Comprovante, 'id' | 'created_at' | 'ano_fiscal'>>,
    newFile?: File
  ): Promise<Comprovante | null> => {
    if (!session?.access_token) return null;

    try {
      let arquivo_path = data.arquivo_path;
      let arquivo_nome = data.arquivo_nome;

      // Upload new file if provided
      if (newFile) {
        const uploadResult = await uploadFile(newFile);
        if (uploadResult) {
          // Delete old file if exists
          const existing = comprovantes.find(c => c.id === id);
          if (existing?.arquivo_path) {
            await supabase.storage
              .from('ir-comprovantes')
              .remove([existing.arquivo_path]);
          }
          arquivo_path = uploadResult.path;
          arquivo_nome = uploadResult.name;
        }
      }

      const updateData: Record<string, unknown> = { ...data };
      if (arquivo_path !== undefined) updateData.arquivo_path = arquivo_path;
      if (arquivo_nome !== undefined) updateData.arquivo_nome = arquivo_nome;

      const { data: updated, error } = await supabase
        .from('ir_comprovantes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedComprovante: Comprovante = {
        id: updated.id,
        categoria: updated.categoria,
        subcategoria: updated.subcategoria || undefined,
        valor: Number(updated.valor),
        data_comprovante: updated.data_comprovante,
        prestador_nome: updated.prestador_nome || undefined,
        prestador_cpf_cnpj: updated.prestador_cpf_cnpj || undefined,
        beneficiario_nome: updated.beneficiario_nome || undefined,
        beneficiario_cpf: updated.beneficiario_cpf || undefined,
        descricao: updated.descricao || undefined,
        arquivo_path: updated.arquivo_path || undefined,
        arquivo_nome: updated.arquivo_nome || undefined,
        is_valid_deduction: updated.is_valid_deduction ?? true,
        validation_notes: updated.validation_notes || undefined,
        ano_fiscal: updated.ano_fiscal,
        created_at: updated.created_at,
      };

      setComprovantes(prev => prev.map(c => c.id === id ? updatedComprovante : c));
      toast.success('Comprovante atualizado!');
      return updatedComprovante;
    } catch (error) {
      console.error('Error updating comprovante:', error);
      toast.error('Erro ao atualizar comprovante');
      return null;
    }
  };

  // Delete comprovante and associated file
  const deleteComprovante = async (id: string) => {
    try {
      // Find comprovante to get file path before deleting
      const compToDelete = comprovantes.find(c => c.id === id);
      
      const { error } = await supabase
        .from('ir_comprovantes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Delete file from storage if exists
      if (compToDelete?.arquivo_path) {
        await supabase.storage
          .from('ir-comprovantes')
          .remove([compToDelete.arquivo_path]);
      }

      setComprovantes(prev => prev.filter(c => c.id !== id));
      toast.success('Comprovante removido');
    } catch (error) {
      console.error('Error deleting comprovante:', error);
      toast.error('Erro ao remover comprovante');
    }
  };

  // Clear chat history
  const clearChat = async () => {
    if (!session?.access_token) return;

    try {
      const { error } = await supabase
        .from('ir_fiscal_chat')
        .delete()
        .eq('user_id', session.user.id);

      if (error) throw error;
      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  return {
    messages,
    comprovantes,
    isLoading,
    isFetchingHistory,
    sendMessage,
    addComprovante,
    updateComprovante,
    deleteComprovante,
    downloadFile,
    fetchComprovantes,
    clearChat,
    getStats,
  };
};
