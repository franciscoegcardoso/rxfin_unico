import { useState, useMemo, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Eye, Mail, User, Calendar, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EmailTemplate } from './EmailTemplateEditor';

interface EmailTemplatePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
}

const DEFAULT_VARIABLE_VALUES: Record<string, string> = {
  name: 'João Silva',
  email: 'joao@exemplo.com',
  confirmation_link: 'https://rxfin.com.br/confirm/abc123',
  app_url: 'https://rxfin.com.br',
  previous_month: 'Janeiro 2026',
  total_income: 'R$ 12.500,00',
  total_expenses: 'R$ 8.350,00',
  balance: 'R$ 4.150,00',
  top_categories: 'Alimentação, Transporte, Lazer',
  plan_name: 'Plano Pro',
  expiry_date: '15/02/2026',
  inviter_name: 'Maria Santos',
  invite_link: 'https://rxfin.com.br/invite/xyz789',
  renewal_url: 'https://rxfin.com.br/renovar',
};

export function EmailTemplatePreview({
  open,
  onOpenChange,
  template,
}: EmailTemplatePreviewProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'preview' | 'variables'>('preview');

  // Initialize variable values when template changes
  useEffect(() => {
    if (template?.variables) {
      const initialValues: Record<string, string> = {};
      template.variables.forEach((variable) => {
        initialValues[variable] = DEFAULT_VARIABLE_VALUES[variable] || `[${variable}]`;
      });
      setVariableValues(initialValues);
    }
  }, [template]);

  const processedSubject = useMemo(() => {
    if (!template) return '';
    let subject = template.subject;
    Object.entries(variableValues).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return subject;
  }, [template, variableValues]);

  const processedBody = useMemo(() => {
    if (!template) return '';
    let body = template.body;
    Object.entries(variableValues).forEach(([key, value]) => {
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return DOMPurify.sanitize(body, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'div', 'span', 'img'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i,
    });
  }, [template, variableValues]);

  const handleVariableChange = (variable: string, value: string) => {
    setVariableValues((prev) => ({
      ...prev,
      [variable]: value,
    }));
  };

  const resetVariables = () => {
    if (template?.variables) {
      const initialValues: Record<string, string> = {};
      template.variables.forEach((variable) => {
        initialValues[variable] = DEFAULT_VARIABLE_VALUES[variable] || `[${variable}]`;
      });
      setVariableValues(initialValues);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Pré-visualização: {template.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'variables')} className="flex-1">
          <div className="px-6">
            <TabsList className="grid w-full max-w-[300px] grid-cols-2">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="variables">
                Variáveis ({template.variables?.length || 0})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="variables" className="px-6 pb-6 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Edite os valores das variáveis para visualizar como o email ficará:
                </p>
                <Button variant="outline" size="sm" onClick={resetVariables} className="gap-2">
                  <RefreshCw className="h-3 w-3" />
                  Resetar
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {template.variables?.map((variable) => (
                  <div key={variable} className="space-y-1.5">
                    <Label htmlFor={variable} className="text-xs font-mono">
                      {`{{${variable}}}`}
                    </Label>
                    <Input
                      id={variable}
                      value={variableValues[variable] || ''}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                      placeholder={`Valor para ${variable}`}
                    />
                  </div>
                ))}
              </div>

              {(!template.variables || template.variables.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Este template não possui variáveis.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-0 flex-1">
            <ScrollArea className="h-[60vh]">
              {/* Email Client Mockup */}
              <div className="p-6 pt-4">
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
                            {template.category}
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
                          <span>{variableValues.email || variableValues.name || 'usuario@exemplo.com'}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground w-12">Assunto:</span>
                        <span className="font-medium">{processedSubject}</span>
                      </div>
                    </div>
                  </div>

                  {/* Email Body - iframe for isolated rendering */}
                  <div className="bg-white">
                    <iframe
                      srcDoc={processedBody}
                      className="w-full border-0"
                      style={{ minHeight: '300px' }}
                      sandbox="allow-same-origin"
                      title="Email template preview"
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
