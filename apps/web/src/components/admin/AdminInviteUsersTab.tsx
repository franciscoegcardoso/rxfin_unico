import { useState, useMemo } from 'react';
import { UserPlus, Upload, Trash2, Send, Download, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useAdminAudit } from '@/hooks/useAdminAudit';

interface InviteUser {
  email: string;
  full_name: string;
  phone: string;
  plan_slug: string;
  role: string;
}

interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
}

const TEMPLATE_CONTENT = `email,nome,telefone,plano,papel
joao@exemplo.com,João Silva,(11) 99999-0001,,
maria@exemplo.com,Maria Santos,(11) 99999-0002,,
`;

export function AdminInviteUsersTab() {
  const [mode, setMode] = useState<'manual' | 'bulk'>('manual');
  const [manualUser, setManualUser] = useState<InviteUser>({
    email: '', full_name: '', phone: '', plan_slug: '', role: '',
  });
  const [bulkText, setBulkText] = useState('');
  const [parsedUsers, setParsedUsers] = useState<InviteUser[]>([]);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: plans } = useSubscriptionPlans(true);
  const { logAction } = useAdminAudit();

  const parseBulkText = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    const users: InviteUser[] = [];

    for (const line of lines) {
      // Skip header line
      if (line.toLowerCase().includes('email') && line.toLowerCase().includes('nome')) continue;

      const parts = line.split(/[,;\t]/).map(p => p.trim());
      const email = parts[0] || '';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;

      users.push({
        email,
        full_name: parts[1] || '',
        phone: parts[2] || '',
        plan_slug: parts[3] || '',
        role: parts[4] || '',
      });
    }

    setParsedUsers(users);
  };

  const handleBulkTextChange = (text: string) => {
    setBulkText(text);
    parseBulkText(text);
  };

  const removeUser = (index: number) => {
    setParsedUsers(prev => prev.filter((_, i) => i !== index));
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CONTENT], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_usuarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitInvites = async (users: InviteUser[]) => {
    if (users.length === 0) {
      toast.error('Nenhum usuário para convidar');
      return;
    }

    setIsSubmitting(true);
    setResults(null);

    try {
      const sanitizedUsers = users.map(u => ({
        ...u,
        plan_slug: u.plan_slug === '__default__' ? '' : u.plan_slug,
      }));
      const { data, error } = await supabase.functions.invoke('admin-invite-users', {
        body: {
          users: sanitizedUsers,
          redirect_url: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setResults(data.results);

      const { success, failed } = data.summary;
      if (failed === 0) {
        toast.success(`${success} usuário(s) convidado(s) com sucesso!`);
      } else if (success === 0) {
        toast.error(`Falha ao convidar todos os ${failed} usuário(s)`);
      } else {
        toast.warning(`${success} convidado(s), ${failed} com falha`);
      }

      // Log audit for admin-role invites
      const adminInvites = users.filter(u => u.role === 'admin');
      for (const invite of adminInvites) {
        logAction('INVITE_ADMIN', 'user_roles', null, { email: invite.email }, 'critical');
      }

      // Clear form on full success
      if (failed === 0) {
        if (mode === 'manual') {
          setManualUser({ email: '', full_name: '', phone: '', plan_slug: '', role: '' });
        } else {
          setBulkText('');
          setParsedUsers([]);
        }
      }
    } catch (err) {
      toast.error('Erro ao enviar convites: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const validManualUser = manualUser.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualUser.email);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cadastro de Usuários</h3>
          <p className="text-sm text-muted-foreground">
            Adicione usuários manualmente ou em massa. Eles receberão um e-mail para confirmar o cadastro.
          </p>
        </div>
      </div>

      <Tabs value={mode} onValueChange={(v) => { setMode(v as 'manual' | 'bulk'); setResults(null); }}>
        <TabsList>
          <TabsTrigger value="manual" className="flex items-center gap-1.5">
            <UserPlus className="h-4 w-4" />
            Cadastro Manual
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-1.5">
            <Upload className="h-4 w-4" />
            Cadastro em Massa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Novo Usuário</CardTitle>
              <CardDescription>Preencha os dados para enviar o convite</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={manualUser.email}
                    onChange={(e) => setManualUser(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    placeholder="João Silva"
                    value={manualUser.full_name}
                    onChange={(e) => setManualUser(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-0000"
                    value={manualUser.phone}
                    onChange={(e) => setManualUser(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select
                    value={manualUser.plan_slug}
                    onValueChange={(v) => setManualUser(prev => ({ ...prev, plan_slug: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Plano padrão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Plano padrão</SelectItem>
                      {plans?.map(plan => (
                        <SelectItem key={plan.id} value={plan.name}>{plan.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => submitInvites([manualUser])}
                  disabled={!validManualUser || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar Convite
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Colar Lista de Usuários</CardTitle>
              <CardDescription>
                Cole os dados separados por vírgula, ponto-e-vírgula ou tab.
                Formato: email, nome, telefone, plano, papel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Baixar Template CSV
                </Button>
              </div>

              <Textarea
                placeholder={`email,nome,telefone,plano,papel\njoao@exemplo.com,João Silva,(11) 99999-0001,,\nmaria@exemplo.com,Maria Santos,(11) 99999-0002,,`}
                rows={8}
                value={bulkText}
                onChange={(e) => handleBulkTextChange(e.target.value)}
                className="font-mono text-sm"
              />

              {parsedUsers.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {parsedUsers.length} usuário(s) identificado(s) na lista
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {parsedUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pré-visualização ({parsedUsers.length} usuários)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedUsers.map((user, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">{user.email}</TableCell>
                          <TableCell>{user.full_name || '-'}</TableCell>
                          <TableCell>{user.phone || '-'}</TableCell>
                          <TableCell>{user.plan_slug || 'Padrão'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon-sm" onClick={() => removeUser(idx)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => submitInvites(parsedUsers)}
                    disabled={parsedUsers.length === 0 || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar {parsedUsers.length} Convite(s)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Results */}
      {results && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado do Envio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{result.email}</TableCell>
                      <TableCell>
                        {result.success ? (
                          <Badge variant="default" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Enviado
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Falha
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {result.success ? 'Convite enviado por e-mail' : result.error}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
