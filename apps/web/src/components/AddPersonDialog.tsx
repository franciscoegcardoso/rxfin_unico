import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Mail, User, TrendingUp, Loader2 } from 'lucide-react';
import { useFinancial } from '@/contexts/FinancialContext';
import { InvitationDialog } from './InvitationDialog';

interface AddPersonDialogProps {
  onAddPerson: (name: string, email?: string, defaultIncomeIds?: string[]) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  inviterName?: string;
}

export const AddPersonDialog: React.FC<AddPersonDialogProps> = ({
  onAddPerson,
  disabled,
  children,
  inviterName = 'Você',
}) => {
  const { config } = useFinancial();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Default income items that will be enabled for new users
  const defaultIncomeItems = config.incomeItems.filter(item => item.isSystemDefault);
  const [selectedIncomeIds, setSelectedIncomeIds] = useState<string[]>(
    defaultIncomeItems.map(item => item.id)
  );

  // Invitation dialog state
  const [showInvitation, setShowInvitation] = useState(false);
  const [addedPersonName, setAddedPersonName] = useState('');
  const [addedPersonEmail, setAddedPersonEmail] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onAddPerson(name.trim(), email.trim() || undefined, selectedIncomeIds);
      
      // If email is provided, show invitation dialog
      if (email.trim()) {
        setAddedPersonName(name.trim());
        setAddedPersonEmail(email.trim());
        setOpen(false);
        setShowInvitation(true);
      } else {
        setOpen(false);
      }
      
      // Reset form
      setName('');
      setEmail('');
      setSelectedIncomeIds(defaultIncomeItems.map(item => item.id));
    }
  };

  const isValidEmail = (email: string) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const toggleIncomeItem = (id: string) => {
    setSelectedIncomeIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAllIncomes = () => {
    setSelectedIncomeIds(defaultIncomeItems.map(item => item.id));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children || (
            <Button variant="outline" size="sm" disabled={disabled}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="bg-card max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Adicionar Pessoa
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="person-name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Nome *
              </Label>
              <Input
                id="person-name"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="person-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                E-mail (para convite)
              </Label>
              <Input
                id="person-email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={100}
              />
              {email && !isValidEmail(email) && (
                <p className="text-xs text-destructive">E-mail inválido</p>
              )}
              {email && isValidEmail(email) && (
                <p className="text-xs text-muted-foreground">
                  Será enviado um convite para esta pessoa
                </p>
              )}
            </div>

            {/* Income Items Selection */}
            {defaultIncomeItems.length > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Receitas padrão
                  </Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={selectAllIncomes}
                    className="text-xs h-7"
                  >
                    Selecionar todas
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecione as receitas que esta pessoa terá acesso
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                  {defaultIncomeItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`income-${item.id}`}
                        checked={selectedIncomeIds.includes(item.id)}
                        onCheckedChange={() => toggleIncomeItem(item.id)}
                      />
                      <Label 
                        htmlFor={`income-${item.id}`} 
                        className="text-sm cursor-pointer flex-1"
                      >
                        {item.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || (email !== '' && !isValidEmail(email))}
              >
                {email.trim() ? 'Adicionar e Convidar' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invitation Dialog */}
      <InvitationDialog
        open={showInvitation}
        onOpenChange={setShowInvitation}
        email={addedPersonEmail}
        name={addedPersonName}
        role="shared_user"
        inviterName={inviterName}
        metadata={{
          defaultIncomeIds: selectedIncomeIds,
        }}
      />
    </>
  );
};
