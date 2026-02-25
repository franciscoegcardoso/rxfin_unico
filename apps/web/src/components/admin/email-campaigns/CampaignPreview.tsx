import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Eye, Mail, User, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CampaignPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subject: string;
  segment: string;
  body: string;
}

const segmentLabels: Record<string, string> = {
  all_users: 'Todos os Usuários',
  beta_users: 'Usuários Beta',
  inactive_users: 'Usuários Inativos',
  pro_users: 'Usuários Pro',
  free_users: 'Usuários Free',
};

export function CampaignPreview({
  open,
  onOpenChange,
  title,
  subject,
  segment,
  body,
}: CampaignPreviewProps) {
  const sanitizedHtml = useMemo(() => {
    return DOMPurify.sanitize(body, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'div', 'span', 'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'style', 'head', 'body', 'html', 'meta', 'title', 'center', 'section', 'header', 'footer'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style', 'width', 'height', 'cellpadding', 'cellspacing', 'border', 'align', 'valign', 'bgcolor', 'color', 'content', 'http-equiv', 'name', 'charset'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i,
      WHOLE_DOCUMENT: true,
    });
  }, [body]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Pré-visualização: {title || 'Campanha'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div className="p-6 pt-2">
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              {/* Email Header */}
              <div className="bg-muted/50 p-4 space-y-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">RXFin</span>
                      <Badge variant="secondary" className="text-xs">
                        {segmentLabels[segment] || segment}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">noreply@rxfin.com.br</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Agora
                  </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-12">Para:</span>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3" />
                      <span>{segmentLabels[segment] || segment}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground w-12">Assunto:</span>
                    <span className="font-medium">{subject || '(sem assunto)'}</span>
                  </div>
                </div>
              </div>

              {/* Email Body - iframe */}
              <div className="bg-white">
                <iframe
                  srcDoc={sanitizedHtml}
                  className="w-full border-0"
                  style={{ minHeight: '400px' }}
                  sandbox="allow-same-origin"
                  title="Email preview"
                  onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    if (iframe.contentDocument?.body) {
                      iframe.style.height = `${iframe.contentDocument.body.scrollHeight + 20}px`;
                    }
                  }}
                />
              </div>

              {/* Email Footer */}
              <div className="bg-muted/30 px-6 py-4 border-t">
                <p className="text-xs text-center text-muted-foreground">
                  Este é um email automático enviado pelo RXFin.
                  <br />
                  Você está recebendo este email porque está cadastrado em nossa plataforma.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
