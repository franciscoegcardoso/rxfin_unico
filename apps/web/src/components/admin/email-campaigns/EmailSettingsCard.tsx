import { useState, useEffect } from 'react';
import { Settings, Mail, Server, Lock, Eye, EyeOff, Send, CheckCircle2, AlertTriangle, Info, Webhook, ExternalLink, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';

type EmailProvider = 'n8n' | 'resend' | 'smtp';

interface EmailSettings {
  provider: EmailProvider;
  // n8n settings (primary)
  n8nWebhookUrl: string;
  n8nWebhookConfigured: boolean;
  // Sender settings (used by n8n)
  senderEmail: string;
  senderName: string;
  // Legacy Resend settings
  resendApiKey: string;
  resendFromEmail: string;
  resendFromName: string;
  // Legacy SMTP settings
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  smtpFromName: string;
  smtpUseTls: boolean;
}

const DEFAULT_SETTINGS: EmailSettings = {
  provider: 'n8n',
  n8nWebhookUrl: '',
  n8nWebhookConfigured: false,
  senderEmail: 'noreply@rxfin.com.br',
  senderName: 'RXFin',
  resendApiKey: '',
  resendFromEmail: 'noreply@rxfin.com.br',
  resendFromName: 'RXFin',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPassword: '',
  smtpFromName: 'RXFin',
  smtpUseTls: true,
};

const SMTP_PRESETS = [
  { name: 'Gmail', host: 'smtp.gmail.com', port: '587' },
  { name: 'Office 365', host: 'smtp.office365.com', port: '587' },
  { name: 'Hostinger', host: 'smtp.hostinger.com', port: '587' },
];

// N8N Payload documentation for display
const N8N_PAYLOAD_EXAMPLE = `{
  "type": "verification | password_reset | invitation | campaign | test | welcome | alert | report",
  "timestamp": "2025-02-03T12:00:00.000Z",
  "environment": "production | test",
  "recipient": {
    "email": "usuario@email.com",
    "name": "Nome do Usuário",
    "userId": "uuid-opcional"
  },
  "sender": {
    "email": "noreply@seudominio.com",
    "name": "RXFin"
  },
  "content": {
    "subject": "Assunto do E-mail",
    "preheader": "Texto de pré-visualização (opcional)",
    "body": "<html>...</html>",
    "templateSlug": "email-verification",
    "variables": {
      "otpCode": "123456",
      "userName": "João",
      "magicLink": "https://...",
      "expiresInMinutes": 15,
      "brandName": "RXFin"
    }
  },
  "metadata": {
    "campaignId": "uuid (para campanhas)",
    "segment": "all_users | pro_users | free_users"
  }
}`;

export function EmailSettingsCard() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<EmailSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<EmailSettings>(DEFAULT_SETTINGS);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // Load settings from app_settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'email_settings')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading email settings:', error);
          return;
        }

        if (data?.setting_value) {
          const loadedSettings = {
            ...DEFAULT_SETTINGS,
            ...(data.setting_value as object),
          };
          setSettings(loadedSettings);
          setSavedSettings(loadedSettings);
        }
      } catch (err) {
        console.error('Error loading email settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Prepare settings for save - sync sender info across providers
      const settingsToSave = {
        ...settings,
        // Keep legacy fields in sync for backwards compatibility
        resendFromEmail: settings.provider === 'n8n' ? settings.senderEmail : settings.resendFromEmail,
        resendFromName: settings.provider === 'n8n' ? settings.senderName : settings.resendFromName,
      };

      // Check if the setting already exists
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('setting_key', 'email_settings')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update({
            setting_value: settingsToSave as unknown as Json,
            description: 'Email provider configuration (n8n integration)',
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', 'email_settings');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert([{
            setting_key: 'email_settings',
            setting_value: settingsToSave as unknown as Json,
            description: 'Email provider configuration (n8n integration)',
          }]);

        if (error) throw error;
      }

      setSavedSettings(settingsToSave);
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de e-mail foram atualizadas.',
      });
    } catch (err) {
      console.error('Error saving email settings:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: 'E-mail obrigatório',
        description: 'Informe um e-mail para enviar o teste.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Não autenticado');
      }

      // Use the new n8n gateway function
      const { data, error } = await supabase.functions.invoke('send-email-n8n', {
        body: {
          type: 'test',
          email: testEmail,
          subject: 'Teste de Integração n8n',
          body: `
            <h2>🎉 Teste de E-mail via n8n</h2>
            <p>Este é um e-mail de teste para verificar a integração com o n8n.</p>
            <p>Se você recebeu este e-mail, a integração está funcionando!</p>
            <hr/>
            <p><strong>Remetente:</strong> ${settings.senderName} &lt;${settings.senderEmail}&gt;</p>
            <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Provedor:</strong> n8n Gateway</p>
          `,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'E-mail enviado!',
        description: `E-mail de teste enviado para ${testEmail} via n8n.`,
      });
    } catch (err) {
      console.error('Error sending test email:', err);
      toast({
        title: 'Erro ao enviar',
        description: 'Verifique se o webhook n8n está configurado corretamente.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const applySmtpPreset = (preset: typeof SMTP_PRESETS[0]) => {
    setSettings(prev => ({
      ...prev,
      smtpHost: preset.host,
      smtpPort: preset.port,
    }));
  };

  const copyPayloadToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(N8N_PAYLOAD_EXAMPLE);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
      toast({
        title: 'Copiado!',
        description: 'Estrutura do payload copiada para a área de transferência.',
      });
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o payload.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Provider Selection Card */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-4 pb-4">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Configurações de E-mail</CardTitle>
            <CardDescription>
              Configure a integração de e-mail com n8n para automação completa
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Provedor de E-mail</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, provider: 'n8n' }))}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  settings.provider === 'n8n'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <Webhook className={cn(
                  "h-6 w-6",
                  settings.provider === 'n8n' ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="text-center">
                  <span className={cn(
                    "font-medium",
                    settings.provider === 'n8n' ? "text-primary" : "text-foreground"
                  )}>n8n</span>
                  <p className="text-xs text-muted-foreground">Automação completa</p>
                </div>
                <Badge variant="default" className="text-[10px]">Recomendado</Badge>
              </button>
              
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, provider: 'resend' }))}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  settings.provider === 'resend'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <Mail className={cn(
                  "h-6 w-6",
                  settings.provider === 'resend' ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="text-center">
                  <span className={cn(
                    "font-medium",
                    settings.provider === 'resend' ? "text-primary" : "text-foreground"
                  )}>Resend</span>
                  <p className="text-xs text-muted-foreground">Direto (legado)</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, provider: 'smtp' }))}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  settings.provider === 'smtp'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <Server className={cn(
                  "h-6 w-6",
                  settings.provider === 'smtp' ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="text-center">
                  <span className={cn(
                    "font-medium",
                    settings.provider === 'smtp' ? "text-primary" : "text-foreground"
                  )}>SMTP</span>
                  <p className="text-xs text-muted-foreground">Legado</p>
                </div>
              </button>
            </div>
          </div>

          {/* n8n Configuration (Primary) */}
          {settings.provider === 'n8n' && (
            <>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <div className="flex gap-3">
                  <Webhook className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm text-primary font-medium">
                      Integração n8n Ativa
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Todos os e-mails são enviados através do seu workflow n8n, permitindo:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Templates personalizados no n8n</li>
                      <li>Múltiplos provedores (Resend, SendGrid, SMTP)</li>
                      <li>Logs e analytics centralizados</li>
                      <li>Automações avançadas</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Webhook URL Field */}
              <div className="space-y-2">
                <Label htmlFor="n8n-webhook-url" className="flex items-center gap-2">
                  <Webhook className="h-3.5 w-3.5" />
                  URL do Webhook n8n *
                </Label>
                <Input
                  id="n8n-webhook-url"
                  type="url"
                  value={settings.n8nWebhookUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, n8nWebhookUrl: e.target.value }))}
                  placeholder="https://seu-n8n.app.n8n.cloud/webhook/..."
                />
                <p className="text-xs text-muted-foreground">
                  URL de produção do webhook (não use a URL de teste)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sender-email" className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    E-mail do Remetente *
                  </Label>
                  <Input
                    id="sender-email"
                    type="email"
                    value={settings.senderEmail}
                    onChange={(e) => setSettings(prev => ({ ...prev, senderEmail: e.target.value }))}
                    placeholder="noreply@seudominio.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usado nos templates do n8n
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender-name" className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    Nome do Remetente
                  </Label>
                  <Input
                    id="sender-name"
                    value={settings.senderName}
                    onChange={(e) => setSettings(prev => ({ ...prev, senderName: e.target.value }))}
                    placeholder="RXFin"
                  />
                </div>
              </div>

              {/* n8n Documentation */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="payload" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Documentação do Payload n8n</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Estrutura JSON enviada para o webhook n8n:
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyPayloadToClipboard}
                          className="gap-2"
                        >
                          {copiedPayload ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copiar
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto">
                        <code>{N8N_PAYLOAD_EXAMPLE}</code>
                      </pre>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Headers enviados:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li><code className="bg-muted px-1 rounded">Authorization: Bearer [N8N_WEBHOOK_SECRET]</code></li>
                          <li><code className="bg-muted px-1 rounded">X-Webhook-Source: rxfin</code></li>
                          <li><code className="bg-muted px-1 rounded">X-Email-Type: [tipo do email]</code></li>
                        </ul>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open('https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/', '_blank')}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Documentação n8n Webhook
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="templates" className="border rounded-lg px-4 mt-2">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Template Slugs Disponíveis</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-muted/50 rounded">
                          <code className="text-primary">email-verification</code>
                          <p className="text-xs text-muted-foreground mt-1">Código OTP + Magic Link</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <code className="text-primary">password-reset</code>
                          <p className="text-xs text-muted-foreground mt-1">Redefinição de senha</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <code className="text-primary">invitation</code>
                          <p className="text-xs text-muted-foreground mt-1">Convites de usuário</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <code className="text-primary">campaign</code>
                          <p className="text-xs text-muted-foreground mt-1">Campanhas de marketing</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <code className="text-primary">welcome</code>
                          <p className="text-xs text-muted-foreground mt-1">Boas-vindas</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <code className="text-primary">test</code>
                          <p className="text-xs text-muted-foreground mt-1">E-mails de teste</p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          )}

          {/* Legacy Resend Configuration */}
          {settings.provider === 'resend' && (
            <>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <strong>Modo Legado:</strong> Considere migrar para n8n para mais flexibilidade e controle.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="resend-api-key" className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    API Key *
                  </Label>
                  <div className="relative">
                    <Input
                      id="resend-api-key"
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.resendApiKey}
                      onChange={(e) => setSettings(prev => ({ ...prev, resendApiKey: e.target.value }))}
                      placeholder="re_xxxxxxxxxxxx"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resend-from-email" className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    E-mail de Envio *
                  </Label>
                  <Input
                    id="resend-from-email"
                    type="email"
                    value={settings.resendFromEmail}
                    onChange={(e) => setSettings(prev => ({ ...prev, resendFromEmail: e.target.value }))}
                    placeholder="noreply@seudominio.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resend-from-name" className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  Nome do Remetente
                </Label>
                <Input
                  id="resend-from-name"
                  value={settings.resendFromName}
                  onChange={(e) => setSettings(prev => ({ ...prev, resendFromName: e.target.value }))}
                  placeholder="Sua Empresa"
                  className="max-w-md"
                />
              </div>
            </>
          )}

          {/* Legacy SMTP Configuration */}
          {settings.provider === 'smtp' && (
            <>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <strong>Modo Legado:</strong> SMTP direto pode ter limitações. Considere n8n para mais flexibilidade.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host" className="flex items-center gap-2">
                    <Server className="h-3.5 w-3.5" />
                    Servidor SMTP *
                  </Label>
                  <Input
                    id="smtp-host"
                    value={settings.smtpHost}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                    placeholder="smtp.exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-port" className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    Porta *
                  </Label>
                  <Input
                    id="smtp-port"
                    value={settings.smtpPort}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtpPort: e.target.value }))}
                    placeholder="587"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-user" className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    Usuário/E-mail *
                  </Label>
                  <Input
                    id="smtp-user"
                    type="email"
                    value={settings.smtpUser}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-password" className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    Senha *
                  </Label>
                  <div className="relative">
                    <Input
                      id="smtp-password"
                      type={showPassword ? 'text' : 'password'}
                      value={settings.smtpPassword}
                      onChange={(e) => setSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                      placeholder="••••••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-from-name" className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    Nome do Remetente
                  </Label>
                  <Input
                    id="smtp-from-name"
                    value={settings.smtpFromName}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtpFromName: e.target.value }))}
                    placeholder="Sua Empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    Usar TLS/SSL
                  </Label>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={settings.smtpUseTls}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, smtpUseTls: checked }))}
                    />
                    <Badge variant={settings.smtpUseTls ? 'default' : 'secondary'}>
                      {settings.smtpUseTls ? 'Ativado' : 'Desativado'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* SMTP Presets */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Configurações Comuns</Label>
                <div className="grid grid-cols-3 gap-2">
                  {SMTP_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applySmtpPreset(preset)}
                      className="p-3 text-left rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium text-sm">{preset.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {preset.host}:{preset.port}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Save Status Bar */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {hasUnsavedChanges ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                    Alterações não salvas
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    Configurações salvas
                  </span>
                </>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Email Card */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-4 pb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Send className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Testar Envio via n8n</CardTitle>
            <CardDescription>
              Envie um e-mail de teste para verificar a integração
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="seu@email.com"
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleTestEmail}
              disabled={isTesting || !testEmail}
              className="gap-2 shrink-0"
            >
              {isTesting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Testar n8n
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            O e-mail será enviado através do workflow n8n configurado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
