import React, { useState, useEffect } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users, Megaphone, Plus, Trash2, Save, UserPlus, Link as LinkIcon, DollarSign, Edit2, ToggleLeft
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAffiliatePrograms,
  useAffiliateTiers,
  useAffiliateInfluencers,
  useUpdateProgram,
  useUpsertTier,
  useDeleteTier,
  useCreateInfluencer,
  useUpdateInfluencer,
  useDeleteInfluencer,
  type AffiliateTier,
  type AffiliateInfluencer,
} from '@/hooks/useAffiliateProgramAdmin';

const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AdminAfiliados() {
  const { data: programs, isLoading: programsLoading } = useAffiliatePrograms();
  const standardProgram = programs?.find(p => p.program_type === 'standard');
  const influencerProgram = programs?.find(p => p.program_type === 'influencer');

  const { data: tiers, isLoading: tiersLoading } = useAffiliateTiers(standardProgram?.id);
  const { data: influencers, isLoading: influencersLoading } = useAffiliateInfluencers();

  const updateProgram = useUpdateProgram();
  const upsertTier = useUpsertTier();
  const deleteTier = useDeleteTier();
  const createInfluencer = useCreateInfluencer();
  const updateInfluencer = useUpdateInfluencer();
  const deleteInfluencer = useDeleteInfluencer();

  // --- Tiers editing state ---
  const [editingTiers, setEditingTiers] = useState<AffiliateTier[]>([]);
  useEffect(() => {
    if (tiers) setEditingTiers([...tiers]);
  }, [tiers]);

  const handleTierChange = (index: number, field: keyof AffiliateTier, value: any) => {
    setEditingTiers(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const addTier = () => {
    if (!standardProgram) return;
    const last = editingTiers[editingTiers.length - 1];
    setEditingTiers(prev => [...prev, {
      id: crypto.randomUUID(),
      program_id: standardProgram.id,
      min_referrals: last ? (last.max_referrals ?? last.min_referrals) + 1 : 1,
      max_referrals: null,
      commission_value: 0,
      sort_order: prev.length + 1,
      created_at: new Date().toISOString(),
    }]);
  };

  const removeTier = (index: number) => {
    const tier = editingTiers[index];
    setEditingTiers(prev => prev.filter((_, i) => i !== index));
    if (tiers?.find(t => t.id === tier.id)) {
      deleteTier.mutate(tier.id);
    }
  };

  const saveTiers = async () => {
    try {
      for (const tier of editingTiers) {
        await upsertTier.mutateAsync({
          id: tier.id,
          program_id: tier.program_id,
          min_referrals: tier.min_referrals,
          max_referrals: tier.max_referrals,
          commission_value: tier.commission_value,
          sort_order: tier.sort_order,
        });
      }
      toast.success('Faixas salvas com sucesso');
    } catch {
      toast.error('Erro ao salvar faixas');
    }
  };

  // --- Influencer dialog ---
  const [influencerDialog, setInfluencerDialog] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<Partial<AffiliateInfluencer> | null>(null);

  const openNewInfluencer = () => {
    setEditingInfluencer({
      name: '',
      email: '',
      slug: '',
      commission_per_referral: 0,
      is_active: true,
      notes: '',
    });
    setInfluencerDialog(true);
  };

  const openEditInfluencer = (inf: AffiliateInfluencer) => {
    setEditingInfluencer({ ...inf });
    setInfluencerDialog(true);
  };

  const saveInfluencer = async () => {
    if (!editingInfluencer || !influencerProgram) return;
    try {
      if (editingInfluencer.id) {
        await updateInfluencer.mutateAsync({
          id: editingInfluencer.id,
          updates: {
            name: editingInfluencer.name,
            email: editingInfluencer.email,
            slug: editingInfluencer.slug,
            commission_per_referral: editingInfluencer.commission_per_referral,
            is_active: editingInfluencer.is_active,
            notes: editingInfluencer.notes,
          },
        });
      } else {
        await createInfluencer.mutateAsync({
          user_id: editingInfluencer.user_id!,
          program_id: influencerProgram.id,
          name: editingInfluencer.name!,
          email: editingInfluencer.email || null,
          slug: editingInfluencer.slug!,
          commission_per_referral: editingInfluencer.commission_per_referral!,
          is_active: editingInfluencer.is_active ?? true,
          notes: editingInfluencer.notes || null,
        });
      }
      toast.success('Influencer salvo');
      setInfluencerDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar influencer');
    }
  };

  const isLoading = programsLoading || tiersLoading || influencersLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Afiliados" description="Gerencie programas de afiliados e influencers" />
        <div className="grid gap-6">
          {[1, 2, 3].map(i => <Card key={i}><CardContent className="py-8"><Skeleton className="h-32 w-full" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Afiliados"
        description="Configure programas de indicação e gerencie influencers"
      />

      {/* ── Overview Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Afiliados Comuns</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {standardProgram?.is_active ? 'Ativo' : 'Inativo'}
            </p>
            <p className="text-xs text-muted-foreground">{editingTiers.length} faixas configuradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Megaphone className="h-4 w-4" />
              <span className="text-xs font-medium">Influencers</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{influencers?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {influencers?.filter(i => i.is_active).length ?? 0} ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Retenção</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{standardProgram?.retention_days ?? 30} dias</p>
            <p className="text-xs text-muted-foreground">Para validar indicação</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Programa 1: Standard ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Programa Indique & Ganhe
              </CardTitle>
              <CardDescription>Comissão escalonada por número de indicações validadas (retenção {standardProgram?.retention_days}d)</CardDescription>
            </div>
            {standardProgram && (
              <div className="flex items-center gap-2">
                <Label htmlFor="std-active" className="text-xs">Ativo</Label>
                <Switch
                  id="std-active"
                  checked={standardProgram.is_active}
                  onCheckedChange={(checked) =>
                    updateProgram.mutate({ id: standardProgram.id, updates: { is_active: checked } },
                      { onSuccess: () => toast.success(checked ? 'Programa ativado' : 'Programa desativado') })
                  }
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {editingTiers.map((tier, idx) => (
              <div key={tier.id} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">De</Label>
                    <Input
                      type="number"
                      className="w-20 h-8 text-sm"
                      value={tier.min_referrals}
                      onChange={e => handleTierChange(idx, 'min_referrals', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Até</Label>
                    <Input
                      type="number"
                      className="w-20 h-8 text-sm"
                      placeholder="∞"
                      value={tier.max_referrals ?? ''}
                      onChange={e => handleTierChange(idx, 'max_referrals', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">R$</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-24 h-8 text-sm"
                      value={tier.commission_value}
                      onChange={e => handleTierChange(idx, 'commission_value', parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-xs text-muted-foreground">/ indicação</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTier(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addTier}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar faixa
            </Button>
            <Button size="sm" onClick={saveTiers} disabled={upsertTier.isPending}>
              <Save className="h-4 w-4 mr-1" /> Salvar faixas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Programa 2: Influencers ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Programa Influencer
              </CardTitle>
              <CardDescription>Valor fixo por indicação, negociado individualmente com cada influencer</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {influencerProgram && (
                <>
                  <Label htmlFor="inf-active" className="text-xs">Ativo</Label>
                  <Switch
                    id="inf-active"
                    checked={influencerProgram.is_active}
                    onCheckedChange={(checked) =>
                      updateProgram.mutate({ id: influencerProgram.id, updates: { is_active: checked } },
                        { onSuccess: () => toast.success(checked ? 'Programa ativado' : 'Programa desativado') })
                    }
                  />
                </>
              )}
              <Button size="sm" onClick={openNewInfluencer}>
                <UserPlus className="h-4 w-4 mr-1" /> Cadastrar influencer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {influencers && influencers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug / Link</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Indicações</TableHead>
                  <TableHead>Total Pago</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {influencers.map(inf => (
                  <TableRow key={inf.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{inf.name}</p>
                        {inf.email && <p className="text-xs text-muted-foreground">{inf.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <LinkIcon className="h-3 w-3 text-muted-foreground" />
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{inf.slug}</code>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatBRL(inf.commission_per_referral)}</TableCell>
                    <TableCell>{inf.total_referrals}</TableCell>
                    <TableCell>{formatBRL(inf.total_paid)}</TableCell>
                    <TableCell>
                      <Badge variant={inf.is_active ? 'default' : 'secondary'}>
                        {inf.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditInfluencer(inf)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => {
                            if (confirm('Remover influencer?')) {
                              deleteInfluencer.mutate(inf.id, { onSuccess: () => toast.success('Influencer removido') });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum influencer cadastrado</p>
              <p className="text-xs">Cadastre influencers para gerar links personalizados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Influencer Dialog ── */}
      <Dialog open={influencerDialog} onOpenChange={setInfluencerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingInfluencer?.id ? 'Editar Influencer' : 'Cadastrar Influencer'}</DialogTitle>
          </DialogHeader>
          {editingInfluencer && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingInfluencer.name ?? ''}
                  onChange={e => setEditingInfluencer(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={editingInfluencer.email ?? ''}
                  onChange={e => setEditingInfluencer(prev => prev ? { ...prev, email: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (para link personalizado)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">rxfin.com.br/signup?aff=</span>
                  <Input
                    value={editingInfluencer.slug ?? ''}
                    onChange={e => setEditingInfluencer(prev => prev ? { ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') } : null)}
                    placeholder="nome-influencer"
                  />
                </div>
              </div>
              {!editingInfluencer.id && (
                <div className="space-y-2">
                  <Label>User ID (do cadastro na plataforma)</Label>
                  <Input
                    value={editingInfluencer.user_id ?? ''}
                    onChange={e => setEditingInfluencer(prev => prev ? { ...prev, user_id: e.target.value } : null)}
                    placeholder="UUID do usuário"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Comissão por indicação (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingInfluencer.commission_per_referral ?? 0}
                  onChange={e => setEditingInfluencer(prev => prev ? { ...prev, commission_per_referral: parseFloat(e.target.value) || 0 } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Input
                  value={editingInfluencer.notes ?? ''}
                  onChange={e => setEditingInfluencer(prev => prev ? { ...prev, notes: e.target.value } : null)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingInfluencer.is_active ?? true}
                  onCheckedChange={checked => setEditingInfluencer(prev => prev ? { ...prev, is_active: checked } : null)}
                />
                <Label>Ativo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInfluencerDialog(false)}>Cancelar</Button>
            <Button onClick={saveInfluencer} disabled={createInfluencer.isPending || updateInfluencer.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
