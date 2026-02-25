import React, { useState } from 'react';
import { Plus, Trash2, Loader2, Pencil, Key } from 'lucide-react';
import { RXSplitAvatar } from './RXSplitAvatar';
import { PhoneInput } from './PhoneInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useRXSplitContacts, useCreateContact, useDeleteContact, useUpdateContact } from '@/hooks/useRXSplit';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';

const COLORS = ['bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-rose-500'];

export const PeopleTab: React.FC = () => {
  const { user } = useAuth();
  const { data: contacts = [], isLoading } = useRXSplitContacts();
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const updateContact = useUpdateContact();

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Edit PIX drawer
  const [editingContact, setEditingContact] = useState<typeof contacts[0] | null>(null);
  const [editPixKey, setEditPixKey] = useState('');

  const handleAdd = () => {
    if (!newName || !user) return;
    const color = COLORS[contacts.length % COLORS.length];
    createContact.mutate({
      user_id: user.id,
      name: newName,
      phone: newPhone || null,
      email: null,
      pix_key: null,
      avatar_color: color,
    });
    setNewName('');
    setNewPhone('');
  };

  const handleSavePix = () => {
    if (!editingContact) return;
    updateContact.mutate({
      id: editingContact.id,
      updates: { pix_key: editPixKey || null },
    });
    setEditingContact(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-card p-4 rounded-2xl shadow-sm border border-border">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          Adicionar Pessoa
        </h3>
        <div className="flex flex-col gap-3">
          <Input placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} />
          <div className="flex gap-2">
            <div className="flex-1">
              <PhoneInput value={newPhone} onChange={setNewPhone} placeholder="Telefone (opcional)" />
            </div>
            <Button onClick={handleAdd} disabled={!newName || createContact.isPending} size="icon" className="h-[46px] w-[46px]">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
          Meus Contatos ({contacts.length})
        </h3>
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhum contato adicionado</div>
        ) : (
          contacts.map(contact => (
            <div key={contact.id} className="flex items-center justify-between bg-card p-3 rounded-xl shadow-sm border border-border">
              <div className="flex items-center gap-3">
                <RXSplitAvatar name={contact.name} color={contact.avatar_color} size="md" />
                <div>
                  <p className="font-medium text-foreground text-sm">{contact.name}</p>
                  {contact.phone && <p className="text-[10px] text-muted-foreground">{contact.phone}</p>}
                  {contact.pix_key && (
                    <p className="text-[10px] text-primary flex items-center gap-0.5">
                      <Key className="w-2.5 h-2.5" /> PIX cadastrado
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditingContact(contact);
                    setEditPixKey(contact.pix_key || '');
                  }}
                  className="text-muted-foreground hover:text-primary p-2 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmDeleteId(contact.id)}
                  className="text-muted-foreground hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit PIX Drawer */}
      <Drawer open={!!editingContact} onOpenChange={(o) => { if (!o) setEditingContact(null); }}>
        <DrawerContent className="pb-safe">
          <DrawerHeader>
            <DrawerTitle>Chave PIX - {editingContact?.name}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            <p className="text-xs text-muted-foreground">
              A chave PIX será usada para facilitar os acertos de contas entre o grupo.
            </p>
            <Input
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              value={editPixKey}
              onChange={e => setEditPixKey(e.target.value)}
            />
            <Button onClick={handleSavePix} className="w-full h-11" disabled={updateContact.isPending}>
              Salvar Chave PIX
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDeleteId) deleteContact.mutate(confirmDeleteId); setConfirmDeleteId(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
