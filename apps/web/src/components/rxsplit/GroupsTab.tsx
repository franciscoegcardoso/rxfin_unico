import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Star, UsersRound, Loader2, UserPlus, UserMinus } from 'lucide-react';
import { RXSplitAvatar } from './RXSplitAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import {
  useRXSplitGroups, useRXSplitContacts, useCreateGroup, useUpdateGroup, useDeleteGroup,
  useGroupMembers,
} from '@/hooks/useRXSplit';
import * as rxsplitService from '@/core/services/rxsplit';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const GroupsTab: React.FC = () => {
  const { user } = useAuth();
  const { data: groups = [], isLoading } = useRXSplitGroups();
  const { data: contacts = [] } = useRXSplitContacts();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Expanded group to show members
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const { data: expandedMembers = [] } = useGroupMembers(expandedGroupId);

  // Form
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [limitTotal, setLimitTotal] = useState('');
  const [limitPerUser, setLimitPerUser] = useState('');

  const resetForm = () => {
    setName(''); setSelectedMembers([]); setDeadline(''); setLimitTotal(''); setLimitPerUser('');
    setEditingId(null); setShowForm(false);
  };

  const handleSave = () => {
    if (!name || !user) return;
    if (editingId) {
      updateGroup.mutate({
        id: editingId,
        updates: {
          name,
          deadline: deadline || null,
          limit_total: limitTotal ? parseFloat(limitTotal) : null,
          limit_per_user: limitPerUser ? parseFloat(limitPerUser) : null,
        },
      });
    } else {
      createGroup.mutate({
        group: {
          user_id: user.id, name, is_active: true, is_main: groups.length === 0,
          deadline: deadline || null,
          limit_total: limitTotal ? parseFloat(limitTotal) : null,
          limit_per_user: limitPerUser ? parseFloat(limitPerUser) : null,
        },
        memberContactIds: selectedMembers,
      });
    }
    resetForm();
  };

  const handleToggleFavorite = (id: string) => {
    const group = groups.find(g => g.id === id);
    if (!group) return;
    if (group.is_favorite) {
      updateGroup.mutate({ id, updates: { is_favorite: false } });
    } else {
      const currentFavorites = groups.filter(g => g.is_favorite);
      if (currentFavorites.length >= 2) {
        toast.error('Máximo de 2 grupos favoritos');
        return;
      }
      updateGroup.mutate({ id, updates: { is_favorite: true } });
    }
  };

  const handleSetMain = (id: string) => {
    groups.forEach(g => {
      if (g.is_main && g.id !== id) updateGroup.mutate({ id: g.id, updates: { is_main: false } });
    });
    updateGroup.mutate({ id, updates: { is_main: true } });
  };

  const handleAddMember = async (groupId: string, contactId: string) => {
    try {
      await rxsplitService.addGroupMember(groupId, contactId);
      qc.invalidateQueries({ queryKey: ['rxsplit-group-members', groupId] });
      toast.success('Membro adicionado');
    } catch { toast.error('Erro ao adicionar membro'); }
  };

  const handleRemoveMember = async (groupId: string, contactId: string) => {
    try {
      await rxsplitService.removeGroupMember(groupId, contactId);
      qc.invalidateQueries({ queryKey: ['rxsplit-group-members', groupId] });
      toast.success('Membro removido');
    } catch { toast.error('Erro ao remover membro'); }
  };

  const getMemberContact = (contactId: string) => contacts.find(c => c.id === contactId);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Seus Grupos</h3>
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> Criar Grupo
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
          <UsersRound className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum grupo criado</p>
          <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4">Criar seu primeiro grupo</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const isExpanded = expandedGroupId === group.id;
            const memberContactIds = isExpanded ? expandedMembers.map(m => m.contact_id) : [];
            const nonMembers = isExpanded ? contacts.filter(c => !memberContactIds.includes(c.id)) : [];

            return (
              <div
                key={group.id}
                className={`bg-card rounded-2xl shadow-sm border flex flex-col transition-all ${
                  group.is_main ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border'
                }`}
              >
                <div className="p-4 flex justify-between items-start">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                  >
                    <p className="font-bold text-foreground">{group.name}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {group.is_main && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded border border-amber-500/20 inline-flex items-center gap-1">
                          <Star className="w-3 h-3" /> Principal
                        </span>
                      )}
                      {group.is_favorite && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 inline-flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" /> Favorito
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleToggleFavorite(group.id)} className={`p-1.5 rounded-lg transition-colors ${group.is_favorite ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
                      <Star className={`w-4 h-4 ${group.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(group.id); setName(group.name);
                        setDeadline(group.deadline || ''); setLimitTotal(group.limit_total?.toString() || '');
                        setLimitPerUser(group.limit_per_user?.toString() || ''); setShowForm(true);
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDeleteId(group.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded members section */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Membros ({expandedMembers.length})
                    </p>
                    {expandedMembers.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Nenhum membro neste grupo</p>
                    ) : (
                      expandedMembers.map(m => {
                        const c = getMemberContact(m.contact_id);
                        if (!c) return null;
                        return (
                          <div key={m.id} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              <RXSplitAvatar name={c.name} color={c.avatar_color} size="sm" />
                              <span className="text-sm text-foreground">{c.name}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveMember(group.id, m.contact_id)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}

                    {nonMembers.length > 0 && (
                      <>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-2">Adicionar</p>
                        <div className="flex flex-wrap gap-1.5">
                          {nonMembers.map(c => (
                            <button
                              key={c.id}
                              onClick={() => handleAddMember(group.id, c.id)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-dashed border-primary/30 text-xs text-primary hover:bg-primary/5 transition-colors"
                            >
                              <UserPlus className="w-3 h-3" />
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Drawer */}
      <Drawer open={showForm} onOpenChange={(o) => { if (!o) resetForm(); }}>
        <DrawerContent className="pb-safe">
          <DrawerHeader>
            <DrawerTitle>{editingId ? 'Editar Grupo' : 'Novo Grupo'}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            <Input placeholder="Nome do grupo" value={name} onChange={e => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Prazo</label>
                <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Limite total</label>
                <Input type="number" placeholder="R$ 0" value={limitTotal} onChange={e => setLimitTotal(e.target.value)} />
              </div>
            </div>

            {!editingId && contacts.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-2 block">Membros</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {contacts.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-2 rounded-xl border border-border cursor-pointer hover:bg-muted/50">
                      <Checkbox
                        checked={selectedMembers.includes(c.id)}
                        onCheckedChange={(checked) => {
                          setSelectedMembers(checked ? [...selectedMembers, c.id] : selectedMembers.filter(id => id !== c.id));
                        }}
                      />
                      <RXSplitAvatar name={c.name} color={c.avatar_color} size="sm" />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={!name} className="w-full h-11">
              {editingId ? 'Salvar Alterações' : 'Criar Grupo'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo</AlertDialogTitle>
            <AlertDialogDescription>Todas as despesas vinculadas perderão o vínculo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDeleteId) deleteGroup.mutate(confirmDeleteId); setConfirmDeleteId(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
