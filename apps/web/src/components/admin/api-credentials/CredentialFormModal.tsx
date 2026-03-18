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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ApiCredential, ApiCredentialCategory, ApiCredentialEnvironment } from '@/types/apiCredentials';

const CATEGORIES: { value: ApiCredentialCategory; label: string }[] = [
  { value: 'open_finance', label: 'Open Finance' },
  { value: 'ai', label: 'Inteligência Artificial' },
  { value: 'market_data', label: 'Dados de Mercado' },
  { value: 'infra', label: 'Infraestrutura' },
  { value: 'automation', label: 'Automação' },
  { value: 'communication', label: 'Comunicação' },
  { value: 'mobile', label: 'Mobile' },
];

const ENVIRONMENTS: { value: ApiCredentialEnvironment; label: string }[] = [
  { value: 'production', label: 'Produção' },
  { value: 'sandbox', label: 'Sandbox' },
  { value: 'development', label: 'Desenvolvimento' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial?: ApiCredential | null;
  onSubmit: (values: {
    name: string;
    service: string;
    category: ApiCredentialCategory;
    environment: ApiCredentialEnvironment;
    key_value: string;
    secret_value: string;
    endpoint_url: string;
    description: string;
    expires_at: string;
  }) => Promise<void>;
  submitting: boolean;
}

export function CredentialFormModal({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
  submitting,
}: Props) {
  const [name, setName] = useState('');
  const [service, setService] = useState('');
  const [category, setCategory] = useState<ApiCredentialCategory>('infra');
  const [environment, setEnvironment] = useState<ApiCredentialEnvironment>('production');
  const [keyValue, setKeyValue] = useState('');
  const [secretValue, setSecretValue] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setName(initial.name);
      setService(initial.service);
      setCategory(initial.category);
      setEnvironment(initial.environment);
      setKeyValue('');
      setSecretValue('');
      setEndpointUrl(initial.endpoint_url ?? '');
      setDescription(initial.description ?? '');
      setExpiresAt(initial.expires_at ? initial.expires_at.slice(0, 10) : '');
    } else {
      setName('');
      setService('');
      setCategory('open_finance');
      setEnvironment('production');
      setKeyValue('');
      setSecretValue('');
      setEndpointUrl('');
      setDescription('');
      setExpiresAt('');
    }
  }, [open, mode, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !service.trim()) return;
    if (mode === 'create' && !keyValue.trim()) return;
    await onSubmit({
      name: name.trim(),
      service: service.trim(),
      category,
      environment,
      key_value: keyValue,
      secret_value: secretValue,
      endpoint_url: endpointUrl.trim(),
      description: description.trim(),
      expires_at: expiresAt,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {mode === 'create' ? 'Nova credencial' : 'Editar credencial'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cred-name">Nome *</Label>
            <Input
              id="cred-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pluggy produção"
              className="bg-background"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-service">Serviço *</Label>
            <Input
              id="cred-service"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="pluggy, openai, resend..."
              className="bg-background"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ApiCredentialCategory)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ambiente *</Label>
              <Select
                value={environment}
                onValueChange={(v) => setEnvironment(v as ApiCredentialEnvironment)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-key">Key value {mode === 'create' ? '*' : ''}</Label>
            <Input
              id="cred-key"
              type="password"
              autoComplete="new-password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={mode === 'edit' ? 'Deixe vazio para manter o valor atual' : '••••••••'}
              className="bg-muted/80 font-mono text-sm"
              required={mode === 'create'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-secret">Secret (opcional)</Label>
            <Input
              id="cred-secret"
              type="password"
              autoComplete="new-password"
              value={secretValue}
              onChange={(e) => setSecretValue(e.target.value)}
              placeholder={
                mode === 'edit' ? 'Deixe vazio para manter o valor atual' : 'Opcional'
              }
              className="bg-muted/80 font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-endpoint">Endpoint URL</Label>
            <Input
              id="cred-endpoint"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://..."
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-desc">Descrição</Label>
            <Textarea
              id="cred-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="bg-background resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-exp">Expira em</Label>
            <Input
              id="cred-exp"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="bg-background"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando…' : mode === 'create' ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
