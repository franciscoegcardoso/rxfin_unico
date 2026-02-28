import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Plus,
  Trash2,
  Heart,
  GraduationCap,
  PiggyBank,
  Briefcase,
  FileText,
  CheckCircle2,
  XCircle,
  Calendar,
  Upload,
  Paperclip,
  Download,
  Shield,
  X,
  FileImage,
  File,
  Pencil,
} from 'lucide-react';
import { Comprovante } from '@/hooks/useFiscalOrganizer';
import { cn } from '@/lib/utils';

interface ComprovantesListProps {
  comprovantes: Comprovante[];
  onAdd: (data: Omit<Comprovante, 'id' | 'created_at'>, file?: File) => Promise<Comprovante | null>;
  onUpdate: (id: string, data: Partial<Omit<Comprovante, 'id' | 'created_at' | 'ano_fiscal'>>, file?: File) => Promise<Comprovante | null>;
  onDelete: (id: string) => void;
  onDownload: (filePath: string, fileName: string) => void;
  openWithCategory?: string | null;
  onClearOpenCategory?: () => void;
}

const CATEGORIA_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  color: string;
}> = {
  saude: { label: 'Saúde', icon: <Heart className="h-4 w-4" />, color: 'text-red-500' },
  educacao: { label: 'Educação', icon: <GraduationCap className="h-4 w-4" />, color: 'text-blue-500' },
  previdencia: { label: 'Previdência', icon: <PiggyBank className="h-4 w-4" />, color: 'text-green-500' },
  profissional: { label: 'Livro Caixa', icon: <Briefcase className="h-4 w-4" />, color: 'text-purple-500' },
  outros: { label: 'Outros', icon: <FileText className="h-4 w-4" />, color: 'text-muted-foreground' },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
};

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
    return <FileImage className="h-4 w-4" />;
  }
  return <File className="h-4 w-4" />;
};

export const ComprovantesList: React.FC<ComprovantesListProps> = ({
  comprovantes,
  onAdd,
  onUpdate,
  onDelete,
  onDownload,
  openWithCategory,
  onClearOpenCategory,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingComprovante, setEditingComprovante] = useState<Comprovante | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    categoria: 'saude',
    subcategoria: '',
    valor: 0,
    data_comprovante: new Date().toISOString().split('T')[0],
    prestador_nome: '',
    prestador_cpf_cnpj: '',
    beneficiario_nome: '',
    beneficiario_cpf: '',
    descricao: '',
    is_valid_deduction: true,
  });
  const [editFormData, setEditFormData] = useState({
    categoria: 'saude',
    subcategoria: '',
    valor: 0,
    data_comprovante: new Date().toISOString().split('T')[0],
    prestador_nome: '',
    prestador_cpf_cnpj: '',
    beneficiario_nome: '',
    beneficiario_cpf: '',
    descricao: '',
    is_valid_deduction: true,
  });

  // Open dialog when openWithCategory changes
  React.useEffect(() => {
    if (openWithCategory) {
      setFormData(prev => ({ ...prev, categoria: openWithCategory }));
      setIsDialogOpen(true);
      onClearOpenCategory?.();
    }
  }, [openWithCategory, onClearOpenCategory]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Formato não suportado. Use JPG, PNG, WebP ou PDF.');
        return;
      }
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo 10MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.valor <= 0) return;

    setIsSubmitting(true);
    const result = await onAdd(
      {
        ...formData,
        ano_fiscal: new Date().getFullYear(),
      },
      selectedFile || undefined
    );

    if (result) {
      setIsDialogOpen(false);
      setSelectedFile(null);
      setFormData({
        categoria: 'saude',
        subcategoria: '',
        valor: 0,
        data_comprovante: new Date().toISOString().split('T')[0],
        prestador_nome: '',
        prestador_cpf_cnpj: '',
        beneficiario_nome: '',
        beneficiario_cpf: '',
        descricao: '',
        is_valid_deduction: true,
      });
    }
    setIsSubmitting(false);
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Formato não suportado. Use JPG, PNG, WebP ou PDF.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo 10MB.');
        return;
      }
      setEditSelectedFile(file);
    }
  };

  const handleRemoveEditFile = () => {
    setEditSelectedFile(null);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const openEditDialog = (comp: Comprovante) => {
    setEditingComprovante(comp);
    setEditFormData({
      categoria: comp.categoria,
      subcategoria: comp.subcategoria || '',
      valor: comp.valor,
      data_comprovante: comp.data_comprovante,
      prestador_nome: comp.prestador_nome || '',
      prestador_cpf_cnpj: comp.prestador_cpf_cnpj || '',
      beneficiario_nome: comp.beneficiario_nome || '',
      beneficiario_cpf: comp.beneficiario_cpf || '',
      descricao: comp.descricao || '',
      is_valid_deduction: comp.is_valid_deduction,
    });
    setEditSelectedFile(null);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComprovante || editFormData.valor <= 0) return;

    setIsSubmitting(true);
    const result = await onUpdate(
      editingComprovante.id,
      editFormData,
      editSelectedFile || undefined
    );

    if (result) {
      setIsEditDialogOpen(false);
      setEditingComprovante(null);
      setEditSelectedFile(null);
    }
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <CardTitle className="text-base">Comprovantes Arquivados</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Comprovante</DialogTitle>
              <DialogDescription>
                Preencha os dados do comprovante fiscal e anexe o documento
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* File Upload Section */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Anexar Comprovante
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Clique para selecionar</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, WebP ou PDF (máx. 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="p-2 rounded bg-primary/10 text-primary">
                      {getFileIcon(selectedFile.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleRemoveFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3 text-green-500" />
                  <span>Arquivo será criptografado e armazenado com segurança</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, categoria: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIA_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span className={config.color}>{config.icon}</span>
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subcategoria</Label>
                  <Input
                    value={formData.subcategoria}
                    onChange={(e) => setFormData(prev => ({ ...prev, subcategoria: e.target.value }))}
                    placeholder="Ex: Consulta médica"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor *</Label>
                  <CurrencyInput
                    value={formData.valor}
                    onChange={(v) => setFormData(prev => ({ ...prev, valor: v }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={formData.data_comprovante}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_comprovante: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Prestador</Label>
                  <Input
                    value={formData.prestador_nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, prestador_nome: e.target.value }))}
                    placeholder="Nome ou razão social"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ do Prestador</Label>
                  <Input
                    value={formData.prestador_cpf_cnpj}
                    onChange={(e) => setFormData(prev => ({ ...prev, prestador_cpf_cnpj: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Beneficiário</Label>
                  <Input
                    value={formData.beneficiario_nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, beneficiario_nome: e.target.value }))}
                    placeholder="Você ou dependente"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF do Beneficiário</Label>
                  <Input
                    value={formData.beneficiario_cpf}
                    onChange={(e) => setFormData(prev => ({ ...prev, beneficiario_cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Detalhes do serviço prestado"
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || formData.valor <= 0}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Comprovante'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {comprovantes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum comprovante arquivado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Prestador</TableHead>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Anexo</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comprovantes.map((comp) => {
                  const cat = CATEGORIA_CONFIG[comp.categoria] || CATEGORIA_CONFIG.outros;
                  return (
                    <TableRow key={comp.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={cat.color}>{cat.icon}</span>
                          <span className="text-sm">{cat.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="text-sm font-medium truncate">
                            {comp.subcategoria || comp.descricao || '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px]">
                          <p className="text-sm truncate">{comp.prestador_nome || '-'}</p>
                          {comp.prestador_cpf_cnpj && (
                            <p className="text-xs text-muted-foreground truncate">
                              {comp.prestador_cpf_cnpj}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(comp.data_comprovante)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(comp.valor)}
                      </TableCell>
                      <TableCell className="text-center">
                        {comp.arquivo_path && comp.arquivo_nome ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-primary"
                            onClick={() => onDownload(comp.arquivo_path!, comp.arquivo_nome!)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only">Baixar</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {comp.is_valid_deduction ? (
                          <Badge variant="outline" className="text-green-600 border-green-600/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Dedutível
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-600/30">
                            <XCircle className="h-3 w-3 mr-1" />
                            Não deduz
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(comp)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover comprovante?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O documento e o arquivo anexo serão removidos permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDelete(comp.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Comprovante</DialogTitle>
            <DialogDescription>
              Atualize os dados do comprovante fiscal
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* File Upload Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexo
              </Label>
              <input
                ref={editFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleEditFileSelect}
                className="hidden"
              />
              {!editSelectedFile && editingComprovante?.arquivo_nome ? (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    {getFileIcon(editingComprovante.arquivo_nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{editingComprovante.arquivo_nome}</p>
                    <p className="text-xs text-muted-foreground">Arquivo atual</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    Substituir
                  </Button>
                </div>
              ) : editSelectedFile ? (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    {getFileIcon(editSelectedFile.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{editSelectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(editSelectedFile.size / 1024).toFixed(1)} KB (novo)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRemoveEditFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => editFileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, WebP ou PDF (máx. 10MB)
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={editFormData.categoria}
                  onValueChange={(v) => setEditFormData(prev => ({ ...prev, categoria: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIA_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span className={config.color}>{config.icon}</span>
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategoria</Label>
                <Input
                  value={editFormData.subcategoria}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, subcategoria: e.target.value }))}
                  placeholder="Ex: Consulta médica"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <CurrencyInput
                  value={editFormData.valor}
                  onChange={(v) => setEditFormData(prev => ({ ...prev, valor: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={editFormData.data_comprovante}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, data_comprovante: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Prestador</Label>
                <Input
                  value={editFormData.prestador_nome}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, prestador_nome: e.target.value }))}
                  placeholder="Nome ou razão social"
                />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ do Prestador</Label>
                <Input
                  value={editFormData.prestador_cpf_cnpj}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, prestador_cpf_cnpj: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Beneficiário</Label>
                <Input
                  value={editFormData.beneficiario_nome}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, beneficiario_nome: e.target.value }))}
                  placeholder="Você ou dependente"
                />
              </div>
              <div className="space-y-2">
                <Label>CPF do Beneficiário</Label>
                <Input
                  value={editFormData.beneficiario_cpf}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, beneficiario_cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={editFormData.descricao}
                onChange={(e) => setEditFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Detalhes do serviço prestado"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || editFormData.valor <= 0}>
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
