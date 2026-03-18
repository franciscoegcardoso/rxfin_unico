import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, FileText, History, Printer, Download, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoFull from '@/assets/logo-rxfin-full.png';

type DocumentType = 'terms_of_use' | 'privacy_policy' | 'cookie_policy';

interface LegalDocumentVersion {
  id: string;
  document_type: DocumentType;
  version_number: number;
  file_path: string;
  file_name: string;
  file_size: number | null;
  effective_date: string | null;
  is_current: boolean;
  created_at: string;
  change_description: string | null;
}

interface LegalDocumentPageProps {
  slug?: string;
}

const SLUG_TO_TYPE: Record<string, DocumentType> = {
  'termos-de-uso': 'terms_of_use',
  'politica-privacidade': 'privacy_policy',
  'politica-cookies': 'cookie_policy',
};

const TYPE_LABELS: Record<DocumentType, { title: string; icon: React.ElementType }> = {
  terms_of_use: { title: 'Termos de Uso', icon: FileText },
  privacy_policy: { title: 'Política de Privacidade', icon: Shield },
  cookie_policy: { title: 'Política de Cookies', icon: Shield },
};

const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({ slug: propSlug }) => {
  const params = useParams<{ slug: string }>();
  const slug = propSlug || params.slug;
  const documentType = slug ? SLUG_TO_TYPE[slug] : undefined;

  const { data: document, isLoading, error } = useQuery({
    queryKey: ['legal-document-version', documentType],
    queryFn: async () => {
      if (!documentType) return null;
      
      const { data, error } = await supabase
        .from('legal_document_versions')
        .select('*')
        .eq('document_type', documentType)
        .eq('is_current', true)
        .maybeSingle();

      if (error) throw error;
      return data as LegalDocumentVersion | null;
    },
    enabled: !!documentType,
    staleTime: 1000 * 60 * 60 * 24, // 24 horas - documento muda raramente
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 dias no cache
  });

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('legal-documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handlePrint = () => {
    if (document) {
      window.open(getPublicUrl(document.file_path), '_blank');
    }
  };

  const handleDownload = () => {
    if (!document) return;
    const link = window.document.createElement('a');
    link.href = getPublicUrl(document.file_path);
    link.download = document.file_name;
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const docInfo = documentType ? TYPE_LABELS[documentType] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 print:hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <img
                  src={logoFull}
                  alt="RXFin"
                  width={90}
                  height={24}
                  className="h-6 w-auto object-contain"
                  style={{ width: 'auto' }}
                />
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Carregando documento...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !document || !docInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Documento não encontrado</h1>
          <p className="text-muted-foreground mb-4">
            O documento solicitado não existe ou ainda não foi publicado.
          </p>
          <Link to="/">
            <Button>Voltar ao início</Button>
          </Link>
        </div>
      </div>
    );
  }

  const pdfUrl = getPublicUrl(document.file_path);
  const DocIcon = docInfo.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <img
                src={logoFull}
                alt="RXFin"
                width={90}
                height={24}
                className="h-6 w-auto object-contain"
                style={{ width: 'auto' }}
              />
            </Link>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Baixar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Document Info Bar */}
      <div className="bg-muted/30 border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DocIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{docInfo.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="text-xs">
                    Versão {document.version_number}
                  </Badge>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Vigência: {document.effective_date 
                      ? format(new Date(document.effective_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : 'Indeterminada'
                    }
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <History className="h-3 w-3" />
              <span>Publicado: {format(new Date(document.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden h-[calc(100vh-220px)] min-h-[600px]">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
            className="w-full h-full"
            title={docInfo.title}
          />
        </div>
        
        {/* Fallback for mobile / no iframe support */}
        <div className="mt-4 text-center sm:hidden">
          <p className="text-sm text-muted-foreground mb-2">
            Caso o documento não carregue corretamente:
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4 mr-2" />
              Abrir PDF em nova aba
            </a>
          </Button>
        </div>
      </main>

      {/* Footer Notice */}
      <footer className="border-t border-border/40 py-4 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground text-center">
            Este documento foi publicado em {format(new Date(document.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}.
            <br />
            Para dúvidas, entre em contato: <a href="mailto:contato@rxfin.com.br" className="text-primary hover:underline">contato@rxfin.com.br</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LegalDocumentPage;
