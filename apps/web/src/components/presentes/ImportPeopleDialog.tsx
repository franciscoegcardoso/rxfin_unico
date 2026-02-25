import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Smartphone, ClipboardPaste, Users, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface ImportedPerson {
  name: string;
  selected: boolean;
}

interface ImportPeopleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (names: string[]) => Promise<void>;
}

export const ImportPeopleDialog: React.FC<ImportPeopleDialogProps> = ({
  open,
  onOpenChange,
  onImport,
}) => {
  const [step, setStep] = useState<'choose' | 'paste' | 'preview'>('choose');
  const [pasteText, setPasteText] = useState('');
  const [importedPeople, setImportedPeople] = useState<ImportedPerson[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supportsContactPicker = typeof navigator !== 'undefined' && 'contacts' in navigator;

  const resetState = () => {
    setStep('choose');
    setPasteText('');
    setImportedPeople([]);
    setIsSubmitting(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const parseTextList = (text: string): ImportedPerson[] => {
    return text
      .split(/[\n,;]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0)
      .map(name => ({ name, selected: true }));
  };

  const handleImportFromContacts = async () => {
    try {
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      // @ts-ignore - Contact Picker API
      const contacts = await navigator.contacts.select(props, opts);
      const imported: ImportedPerson[] = contacts
        .map((c: any) => ({
          name: c.name?.[0] || '',
          selected: true,
        }))
        .filter((p: ImportedPerson) => p.name.length > 0);

      if (imported.length === 0) {
        toast.info('Nenhum contato selecionado');
        return;
      }
      setImportedPeople(imported);
      setStep('preview');
    } catch {
      toast.error('Não foi possível acessar os contatos');
    }
  };

  const handleParsePaste = () => {
    const parsed = parseTextList(pasteText);
    if (parsed.length === 0) {
      toast.error('Nenhum nome encontrado na lista');
      return;
    }
    setImportedPeople(parsed);
    setStep('preview');
  };

  const togglePerson = (index: number) => {
    setImportedPeople(prev =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const toggleAll = () => {
    const allSelected = importedPeople.every(p => p.selected);
    setImportedPeople(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const selectedCount = importedPeople.filter(p => p.selected).length;

  const handleConfirmImport = async () => {
    const names = importedPeople.filter(p => p.selected).map(p => p.name);
    if (names.length === 0) return;

    setIsSubmitting(true);
    try {
      await onImport(names);
      handleOpenChange(false);
    } catch {
      toast.error('Erro ao importar pessoas');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== 'choose' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -ml-1"
                onClick={() => setStep(step === 'preview' && pasteText ? 'paste' : 'choose')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 'choose' && 'Importar Pessoas'}
            {step === 'paste' && 'Colar Lista de Nomes'}
            {step === 'preview' && 'Selecionar Pessoas'}
          </DialogTitle>
        </DialogHeader>

        {step === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={handleImportFromContacts}
              disabled={!supportsContactPicker}
              className="w-full flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Contatos do Celular</p>
                <p className="text-sm text-muted-foreground">
                  {supportsContactPicker
                    ? 'Selecione contatos da sua agenda'
                    : 'Disponível apenas no Chrome para Android'}
                </p>
              </div>
            </button>

            <button
              onClick={() => setStep('paste')}
              className="w-full flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ClipboardPaste className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Colar Lista de Nomes</p>
                <p className="text-sm text-muted-foreground">
                  Cole nomes do Instagram, Facebook, etc.
                </p>
              </div>
            </button>
          </div>
        )}

        {step === 'paste' && (
          <div className="space-y-4">
            <Textarea
              placeholder="Cole os nomes aqui, um por linha ou separados por vírgula..."
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Dica: No Instagram, vá em Configurações → Sua Atividade → Baixar dados. No Facebook, vá em Configurações → Informações → Baixar dados.
            </p>
            <DialogFooter>
              <Button onClick={handleParsePaste} disabled={!pasteText.trim()}>
                Continuar
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleAll}
                className="text-sm text-primary hover:underline"
              >
                {importedPeople.every(p => p.selected)
                  ? 'Desmarcar todas'
                  : 'Selecionar todas'}
              </button>
              <span className="text-sm text-muted-foreground">
                {selectedCount} de {importedPeople.length} selecionados
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
              {importedPeople.map((person, index) => (
                <label
                  key={index}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={person.selected}
                    onCheckedChange={() => togglePerson(index)}
                  />
                  <span className="text-sm">{person.name}</span>
                </label>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={selectedCount === 0 || isSubmitting}
              >
                <Users className="h-4 w-4 mr-2" />
                Adicionar {selectedCount} {selectedCount === 1 ? 'pessoa' : 'pessoas'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
