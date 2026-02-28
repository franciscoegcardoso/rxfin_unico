import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Pencil, Trash2, Check, X, FileText, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmailTemplateEditor, type EmailTemplate } from './EmailTemplateEditor';
import { EmailTemplatePreview } from './EmailTemplatePreview';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAdminDeferredMutations } from '@/hooks/useAdminDeferredMutations';

const CATEGORY_COLORS: Record<string, string> = {
  transactional: 'bg-blue-500/10 text-blue-700 border-blue-200',
  engajamento: 'bg-purple-500/10 text-purple-700 border-purple-200',
  lembrete: 'bg-amber-500/10 text-amber-700 border-amber-200',
  relatorio: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  assinatura: 'bg-rose-500/10 text-rose-700 border-rose-200',
};

const TRIGGER_ICONS: Record<string, typeof Zap> = {
  event: Zap,
  scheduled: Clock,
  manual: FileText,
};

export function EmailTemplatesList() {
  const { deferToggleEmailTemplate, deferDeleteEmailTemplate } = useAdminDeferredMutations();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsEditorOpen(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setIsEditorOpen(true);
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setSelectedTemplate(null);
  };

  const handleToggle = (template: EmailTemplate, checked: boolean) => {
    deferToggleEmailTemplate(template.id, template.name, checked);
    toast.info('Alteração adicionada para revisão');
  };

  const handleConfirmDelete = () => {
    if (templateToDelete) {
      deferDeleteEmailTemplate(templateToDelete.id, templateToDelete.name);
      toast.info('Exclusão adicionada para revisão');
      setTemplateToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Templates ({templates?.length || 0})</h3>
        </div>
        <Button onClick={handleNewTemplate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%]">Nome</TableHead>
              <TableHead className="w-[15%]">Categoria</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[20%]">Última Edição</TableHead>
              <TableHead className="w-[20%] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates?.map((template) => {
              const TriggerIcon = TRIGGER_ICONS[template.trigger_type] || FileText;
              return (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <TriggerIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {template.subject}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={CATEGORY_COLORS[template.category] || ''}
                    >
                      {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={template.is_active}
                        onCheckedChange={(checked) => handleToggle(template, checked)}
                      />
                      {template.is_active ? (
                        <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
                          <Check className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <X className="h-3 w-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(template.updated_at), "dd/MM/yyyy, HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handlePreview(template)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(template)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setTemplateToDelete(template)}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!templates || templates.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum template encontrado. Crie o primeiro!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Editor Dialog */}
      <EmailTemplateEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        template={selectedTemplate}
        onClose={handleEditorClose}
      />

      {/* Preview Dialog */}
      <EmailTemplatePreview
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        template={selectedTemplate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
