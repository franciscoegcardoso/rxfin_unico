import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Save, Loader2, Variable, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CollapsibleModule } from '@/components/shared/CollapsibleModule';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminDeferredMutations } from '@/hooks/useAdminDeferredMutations';
import { useAdminPendingChanges } from '@/contexts/AdminPendingChangesContext';

interface NotificationTemplate {
  id: string;
  slug: string;
  name: string;
  title_template: string;
  message_template: string;
  type: string;
  priority: string;
  action_url_template: string | null;
  available_variables: string[] | null;
  is_active: boolean;
}

const typeLabels: Record<string, string> = {
  payment: 'Pagamento',
  expiration: 'Vencimento',
  gift: 'Presente',
  insurance: 'Seguro',
  budget: 'Orçamento',
};

export const NotificationTemplatesManager: React.FC = () => {
  const queryClient = useQueryClient();
  const { deferUpdateNotificationTemplate, deferToggleNotificationTemplate } = useAdminDeferredMutations();
  const { addChange, removeChange } = useAdminPendingChanges();
  const [editState, setEditState] = useState<Record<string, Partial<NotificationTemplate>>>({});
  const editStateRef = useRef(editState);
  editStateRef.current = editState;
  const changeIdRef = useRef<string | null>(null);
  const [focusedField, setFocusedField] = useState<{ id: string; field: 'title_template' | 'message_template' | 'action_url_template' } | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('type', { ascending: true });
      if (error) throw error;
      return data as NotificationTemplate[];
    },
  });

  // Removed direct updateMutation - now using deferred mutations
  // Sync edit state with AdminPendingChanges for navigation guard
  const anyChanges = Object.keys(editState).length > 0;
  useEffect(() => {
    if (anyChanges && !changeIdRef.current) {
      changeIdRef.current = addChange({
        type: 'update',
        category: 'Template',
        description: 'Alterações em templates de notificação',
        execute: async () => {
          const currentEdits = editStateRef.current;
          for (const [id, changes] of Object.entries(currentEdits)) {
            if (Object.keys(changes).length > 0) {
              const { error } = await supabase
                .from('notification_templates')
                .update(changes)
                .eq('id', id);
              if (error) throw error;
            }
          }
          queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
          setEditState({});
        },
      });
    } else if (!anyChanges && changeIdRef.current) {
      removeChange(changeIdRef.current);
      changeIdRef.current = null;
    }
  }, [anyChanges, addChange, removeChange, queryClient]);
  const getEdit = (id: string) => editState[id] || {};


  const setEdit = (id: string, field: string, value: any) => {
    setEditState(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = (template: NotificationTemplate) => {
    const changes = getEdit(template.id);
    if (Object.keys(changes).length === 0) return;
    deferUpdateNotificationTemplate(template.id, changes, template.name);
    toast.info('Alteração adicionada para revisão');
    setEditState(prev => {
      const next = { ...prev };
      delete next[template.id];
      return next;
    });
  };

  const handleCancel = (id: string) => {
    setEditState(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleToggle = (template: NotificationTemplate) => {
    deferToggleNotificationTemplate(template.id, template.name, template.is_active);
    toast.info('Alteração adicionada para revisão');
  };

  const insertVariable = (templateId: string, varName: string) => {
    if (!focusedField || focusedField.id !== templateId) return;
    const ref = inputRefs.current[`${templateId}-${focusedField.field}`];
    if (!ref) return;

    const insertion = `{{${varName}}}`;
    const start = ref.selectionStart ?? ref.value.length;
    const end = ref.selectionEnd ?? ref.value.length;
    const currentVal = ref.value;
    const newVal = currentVal.slice(0, start) + insertion + currentVal.slice(end);

    setEdit(templateId, focusedField.field, newVal);

    setTimeout(() => {
      ref.focus();
      const newPos = start + insertion.length;
      ref.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const hasChanges = (id: string) => Object.keys(getEdit(id)).length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates de Notificação Automática
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {templates.map((tpl) => {
        const edit = getEdit(tpl.id);
        const changed = hasChanges(tpl.id);

        return (
          <CollapsibleModule
            key={tpl.id}
            title={tpl.name}
            description={`${typeLabels[tpl.type] || tpl.type} · ${tpl.slug}`}
            defaultOpen={false}
            actions={
              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                <Label htmlFor={`toggle-${tpl.id}`} className="text-xs text-muted-foreground">Ativo</Label>
                <Switch
                  id={`toggle-${tpl.id}`}
                  checked={tpl.is_active}
                  onCheckedChange={() => handleToggle(tpl)}
                />
              </div>
            }
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-mono">{tpl.slug}</Badge>
                <Badge variant="secondary" className="text-xs">{typeLabels[tpl.type] || tpl.type}</Badge>
                <Badge variant="secondary" className="text-xs capitalize">{tpl.priority}</Badge>
              </div>

              <div className="grid gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Título</Label>
                  <Input
                    ref={el => { inputRefs.current[`${tpl.id}-title_template`] = el; }}
                    value={edit.title_template ?? tpl.title_template}
                    onChange={e => setEdit(tpl.id, 'title_template', e.target.value)}
                    onFocus={() => setFocusedField({ id: tpl.id, field: 'title_template' })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Mensagem</Label>
                  <Textarea
                    ref={el => { inputRefs.current[`${tpl.id}-message_template`] = el; }}
                    value={edit.message_template ?? tpl.message_template}
                    onChange={e => setEdit(tpl.id, 'message_template', e.target.value)}
                    onFocus={() => setFocusedField({ id: tpl.id, field: 'message_template' })}
                    className="text-sm min-h-[60px]"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">URL de ação (aceita variáveis)</Label>
                  <Input
                    ref={el => { inputRefs.current[`${tpl.id}-action_url_template`] = el; }}
                    value={edit.action_url_template ?? tpl.action_url_template ?? ''}
                    onChange={e => setEdit(tpl.id, 'action_url_template', e.target.value)}
                    onFocus={() => setFocusedField({ id: tpl.id, field: 'action_url_template' })}
                    placeholder="/seguros/{{id}}"
                    className="text-sm font-mono"
                  />
                </div>
              </div>

              {tpl.available_variables && tpl.available_variables.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <TooltipProvider delayDuration={200}>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Variable className="h-3 w-3" />
                      Variáveis:
                    </span>
                    {tpl.available_variables.map((v) => (
                      <Tooltip key={v}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => insertVariable(tpl.id, v)}
                            className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors"
                          >
                            {`{{${v}}}`}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">Clique para inserir no campo ativo</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              )}

              {changed && (
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancel(tpl.id)}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(tpl)}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Salvar
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleModule>
        );
      })}
    </div>
  );
};
