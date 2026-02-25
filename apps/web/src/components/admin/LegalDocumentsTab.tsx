import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Upload, 
  FileText, 
  Shield, 
  Calendar, 
  User, 
  Download, 
  Check,
  Loader2,
  History,
  AlertCircle,
  Cookie
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DocumentType = 'terms_of_use' | 'privacy_policy' | 'cookie_policy';

interface LegalDocumentVersion {
  id: string;
  document_type: DocumentType;
  version_number: number;
  file_path: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string | null;
  change_description: string | null;
  effective_date: string;
  is_current: boolean;
  created_at: string;
}

const DOCUMENT_LABELS: Record<DocumentType, { title: string; icon: React.ElementType }> = {
  terms_of_use: { title: 'Termos de Uso', icon: FileText },
  privacy_policy: { title: 'Política de Privacidade', icon: Shield },
  cookie_policy: { title: 'Política de Cookies', icon: Cookie },
};

export const LegalDocumentsTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DocumentType>('terms_of_use');
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documentos Legais</h2>
          <p className="text-muted-foreground">
            Gerencie os termos de uso, política de privacidade e política de cookies
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentType)}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="terms_of_use" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Termos de Uso</span>
            <span className="sm:hidden">Termos</span>
          </TabsTrigger>
          <TabsTrigger value="privacy_policy" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacidade</span>
            <span className="sm:hidden">Privac.</span>
          </TabsTrigger>
          <TabsTrigger value="cookie_policy" className="gap-2">
            <Cookie className="h-4 w-4" />
            <span className="hidden sm:inline">Cookies</span>
            <span className="sm:hidden">Cookies</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="terms_of_use" className="mt-6">
          <DocumentManager documentType="terms_of_use" />
        </TabsContent>

        <TabsContent value="privacy_policy" className="mt-6">
          <DocumentManager documentType="privacy_policy" />
        </TabsContent>

        <TabsContent value="cookie_policy" className="mt-6">
          <DocumentManager documentType="cookie_policy" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface DocumentManagerProps {
  documentType: DocumentType;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ documentType }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [changeDescription, setChangeDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['legal-document-versions', documentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_document_versions')
        .select('*')
        .eq('document_type', documentType)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as LegalDocumentVersion[];
    },
  });

  const currentVersion = versions.find(v => v.is_current);
  const nextVersionNumber = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1;

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Nenhum arquivo selecionado');

      setIsUploading(true);

      // Generate unique file path
      const timestamp = Date.now();
      const filePath = `${documentType}/v${nextVersionNumber}_${timestamp}.pdf`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('legal-documents')
        .upload(filePath, selectedFile, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // If there's a current version, mark it as not current
      if (currentVersion) {
        const { error: updateError } = await supabase
          .from('legal_document_versions')
          .update({ is_current: false })
          .eq('id', currentVersion.id);

        if (updateError) throw updateError;
      }

      // Insert new version record
      const { error: insertError } = await supabase
        .from('legal_document_versions')
        .insert({
          document_type: documentType,
          version_number: nextVersionNumber,
          file_path: filePath,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          change_description: changeDescription || null,
          effective_date: isIndeterminate ? null : effectiveDate,
          is_current: true,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success('Documento enviado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['legal-document-versions', documentType] });
      setSelectedFile(null);
      setChangeDescription('');
      setEffectiveDate(format(new Date(), 'yyyy-MM-dd'));
      setIsIndeterminate(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar documento: ${error.message}`);
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Apenas arquivos PDF são permitidos');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('O arquivo deve ter no máximo 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('legal-documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const docLabel = DOCUMENT_LABELS[documentType];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Nova Versão
          </CardTitle>
          <CardDescription>
            Envie uma nova versão do documento. A versão anterior será mantida no histórico.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Arquivo PDF *</Label>
            <div 
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                selectedFile ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <FileText className="h-6 w-6" />
                  <span className="font-medium">{selectedFile.name}</span>
                  <Badge variant="secondary">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p>Clique para selecionar ou arraste o arquivo</p>
                  <p className="text-xs mt-1">Apenas PDF, máximo 10MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="effective-date">Data de Vigência {!isIndeterminate && '*'}</Label>
            <div className="space-y-3">
              <Input
                id="effective-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                disabled={isIndeterminate}
                className={isIndeterminate ? 'opacity-50' : ''}
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="indeterminate-date"
                  checked={isIndeterminate}
                  onCheckedChange={(checked) => setIsIndeterminate(checked === true)}
                />
                <Label 
                  htmlFor="indeterminate-date" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Vigência indeterminada
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="change-description">Descrição das Alterações</Label>
            <Textarea
              id="change-description"
              placeholder="Descreva as principais alterações nesta versão..."
              value={changeDescription}
              onChange={(e) => setChangeDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              Próxima versão: <Badge variant="outline">v{nextVersionNumber}</Badge>
            </div>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Publicar Versão
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Version Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <docLabel.icon className="h-5 w-5" />
            Versão Atual
          </CardTitle>
          <CardDescription>
            Documento ativo atualmente na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : currentVersion ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="text-sm">
                  Versão {currentVersion.version_number}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Check className="h-3 w-3" />
                  Ativa
                </Badge>
              </div>

              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Vigência: {currentVersion.effective_date 
                    ? format(new Date(currentVersion.effective_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : 'Indeterminada'
                  }</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <History className="h-4 w-4" />
                  <span>Publicado: {format(new Date(currentVersion.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              </div>

              {currentVersion.change_description && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">{currentVersion.change_description}</p>
                </div>
              )}

              <Button variant="outline" className="w-full" asChild>
                <a href={getPublicUrl(currentVersion.file_path)} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Visualizar PDF
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhuma versão publicada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Envie a primeira versão do documento
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version History */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </CardTitle>
          <CardDescription>
            Registro permanente de todas as versões publicadas (sem possibilidade de exclusão)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Versão</TableHead>
                    <TableHead>Data de Vigência</TableHead>
                    <TableHead>Publicado em</TableHead>
                    <TableHead className="hidden md:table-cell">Alterações</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((version) => (
                    <TableRow key={version.id}>
                      <TableCell>
                        <Badge variant="outline">v{version.version_number}</Badge>
                      </TableCell>
                      <TableCell>
                        {version.effective_date 
                          ? format(new Date(version.effective_date), 'dd/MM/yyyy')
                          : 'Indeterminada'
                        }
                      </TableCell>
                      <TableCell>
                        {format(new Date(version.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">
                        {version.change_description || '—'}
                      </TableCell>
                      <TableCell>
                        {version.is_current ? (
                          <Badge variant="default" className="gap-1">
                            <Check className="h-3 w-3" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Arquivada</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={getPublicUrl(version.file_path)} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <History className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum histórico disponível</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
