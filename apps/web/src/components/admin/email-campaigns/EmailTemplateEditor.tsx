import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAdminDeferredMutations } from '@/hooks/useAdminDeferredMutations';
import type { Json } from '@/integrations/supabase/types';

export interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  trigger_type: string;
  trigger_config: Json;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'transactional', label: 'Transacional' },
  { value: 'engajamento', label: 'Engajamento' },
  { value: 'lembrete', label: 'Lembrete' },
  { value: 'relatorio', label: 'Relatório' },
  { value: 'assinatura', label: 'Assinatura' },
];

const TRIGGER_TYPES = [
  { value: 'event', label: 'Evento (automático)' },
  { value: 'scheduled', label: 'Agendado (cron)' },
  { value: 'manual', label: 'Manual' },
];

const COMMON_VARIABLES = ['name', 'email', 'app_url'];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function EmailTemplateEditor({
  open,
  onOpenChange,
  template,
  onClose,
}: EmailTemplateEditorProps) {
  const { deferSaveEmailTemplate } = useAdminDeferredMutations();
  const isEditing = !!template;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subject: '',
    body: '',
    category: 'transactional',
    trigger_type: 'manual',
    trigger_description: '',
    variables: [] as string[],
    is_active: true,
  });

  useEffect(() => {
    if (template) {
      const config = template.trigger_config as Record<string, unknown>;
      setFormData({
        name: template.name,
        slug: template.slug,
        subject: template.subject,
        body: template.body,
        category: template.category,
        trigger_type: template.trigger_type,
        trigger_description: (config?.description as string) || '',
        variables: template.variables || [],
        is_active: template.is_active,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        subject: '',
        body: '',
        category: 'transactional',
        trigger_type: 'manual',
        trigger_description: '',
        variables: [...COMMON_VARIABLES],
        is_active: true,
      });
    }
  }, [template, open]);

  const handleSave = () => {
    const payload = {
      name: formData.name,
      slug: formData.slug || generateSlug(formData.name),
      subject: formData.subject,
      body: formData.body,
      category: formData.category,
      trigger_type: formData.trigger_type,
      trigger_config: { description: formData.trigger_description } as Json,
      variables: formData.variables,
      is_active: formData.is_active,
    };

    deferSaveEmailTemplate(payload, isEditing, template?.id);
    toast.info('Alteração adicionada para revisão');
    onClose();
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const addVariable = (variable: string) => {
    if (variable && !formData.variables.includes(variable)) {
      setFormData((prev) => ({
        ...prev,
        variables: [...prev.variables, variable],
      }));
    }
  };

  const removeVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v !== variable),
    }));
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-body') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody =
        formData.body.substring(0, start) +
        `{{${variable}}}` +
        formData.body.substring(end);
      setFormData((prev) => ({ ...prev, body: newBody }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Template' : 'Criar Novo Template'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Edite as informações do template de e-mail.'
              : 'Configure um novo template de e-mail automático.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Nome *</Label>
            <Input
              id="template-name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Nome do template"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="template-slug">Slug</Label>
            <Input
              id="template-slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="slug-do-template"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Gerado automaticamente a partir do nome
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trigger Type */}
          <div className="space-y-2">
            <Label>Tipo de Disparo</Label>
            <Select
              value={formData.trigger_type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, trigger_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((trigger) => (
                  <SelectItem key={trigger.value} value={trigger.value}>
                    {trigger.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trigger Description */}
          <div className="space-y-2">
            <Label htmlFor="trigger-desc">Descrição do Disparo</Label>
            <Input
              id="trigger-desc"
              value={formData.trigger_description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, trigger_description: e.target.value }))
              }
              placeholder="Ex: Dia 1 de cada mês às 09:00"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="template-subject">Assunto *</Label>
            <Input
              id="template-subject"
              value={formData.subject}
              onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Assunto do email"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="template-body">Corpo HTML *</Label>
            <Textarea
              id="template-body"
              value={formData.body}
              onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
              placeholder="<h1>Olá {{name}}!</h1>"
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Variables */}
          <div className="space-y-2">
            <Label>Variáveis disponíveis</Label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-muted/50 border">
              {formData.variables.map((variable) => (
                <Badge
                  key={variable}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => insertVariable(variable)}
                >
                  {`{{${variable}}}`}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeVariable(variable);
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              <Input
                placeholder="+ Adicionar"
                className="w-24 h-6 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.target as HTMLInputElement;
                    addVariable(input.value.trim());
                    input.value = '';
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Clique em uma variável para inserir no corpo. Pressione Enter para adicionar novas.
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: checked }))
              }
            />
            <Label>Template ativo</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name || !formData.subject || !formData.body}
          >
            {isEditing ? 'Salvar Alterações' : 'Criar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
