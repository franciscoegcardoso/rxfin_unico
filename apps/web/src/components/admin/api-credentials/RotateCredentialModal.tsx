import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { ApiCredential } from '@/types/apiCredentials';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: ApiCredential | null;
  onRotate: (newKey: string, newSecret: string) => Promise<void>;
  submitting: boolean;
}

export function RotateCredentialModal({
  open,
  onOpenChange,
  credential,
  onRotate,
  submitting,
}: Props) {
  const [newKey, setNewKey] = useState('');
  const [newSecret, setNewSecret] = useState('');

  useEffect(() => {
    if (open) {
      setNewKey('');
      setNewSecret('');
    }
  }, [open, credential?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRotate(newKey.trim(), newSecret.trim());
  };

  const canSubmit =
    newKey.trim() !== '' || (credential?.has_secret === true && newSecret.trim() !== '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Rotacionar credencial</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert className="border-amber-500/50 bg-amber-500/10 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-900 dark:text-amber-200 text-sm">
              Atenção: ao rotacionar, o valor anterior será permanentemente substituído.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">{credential?.name}</p>
          <div className="space-y-2">
            <Label htmlFor="rot-key">Nova key</Label>
            <Input
              id="rot-key"
              type="password"
              autoComplete="new-password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="bg-muted/80 font-mono text-sm"
              placeholder="Nova chave"
            />
          </div>
          {credential?.has_secret && (
            <div className="space-y-2">
              <Label htmlFor="rot-secret">Novo secret (opcional)</Label>
              <Input
                id="rot-secret"
                type="password"
                autoComplete="new-password"
                value={newSecret}
                onChange={(e) => setNewSecret(e.target.value)}
                className="bg-muted/80 font-mono text-sm"
                placeholder="Novo secret"
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Pelo menos um campo deve ser preenchido
            {credential?.has_secret ? ' (key e/ou secret).' : ' (nova key).'}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !canSubmit}>
              {submitting ? 'Rotacionando…' : 'Rotacionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
