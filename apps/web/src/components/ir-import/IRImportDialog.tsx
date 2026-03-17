import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  FileText,
  Shield,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Building,
  Banknote,
  TrendingUp,
  Trash2,
  FileCode,
} from 'lucide-react';
import { useIRImport, IRImportData } from '@/hooks/useIRImport';
import { cn } from '@/lib/utils';

interface IRImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (data: IRImportData) => void;
}

export const IRImportDialog: React.FC<IRImportDialogProps> = ({
  open,
  onOpenChange,
  onImportComplete,
}) => {
  const { isLoading, imports, processFile, fetchImports, deleteImport } = useIRImport();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState<'terms' | 'upload' | 'result'>('terms');
  const [lastImport, setLastImport] = useState<IRImportData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchImports();
    }
  }, [open]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    const result = await processFile(file);
    if (result) {
      setLastImport(result);
      setStep('result');
      onImportComplete?.(result);
      fetchImports();
    }
  }, [processFile, onImportComplete, fetchImports]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files?.[0]) {
      await handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (file) {
      await handleFileUpload(file);
      if (input) input.value = '';
    }
  }, [handleFileUpload]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const renderTermsStep = () => (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <Shield className="h-5 w-5 text-primary mt-0.5" />
        <div className="space-y-2 text-sm">
          <p className="font-medium">Segurança e Privacidade (LGPD)</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Seus dados são processados de forma segura e criptografada</li>
            <li>O arquivo original é descartado imediatamente após processamento</li>
            <li>Apenas os dados extraídos são salvos, vinculados à sua conta</li>
            <li>Você pode excluir os dados importados a qualquer momento</li>
            <li>Nenhum dado é compartilhado com terceiros</li>
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Dados que serão extraídos:</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
            <Building className="h-4 w-4 text-blue-500" />
            <span>Bens e Direitos</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
            <Banknote className="h-4 w-4 text-green-500" />
            <span>Rendimentos</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span>Investimentos</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span>Dívidas</span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 pt-2">
        <Checkbox
          id="terms"
          checked={acceptedTerms}
          onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
        />
        <Label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
          Li e concordo com os termos de uso e política de privacidade. Autorizo o processamento dos dados da minha declaração de Imposto de Renda.
        </Label>
      </div>

      <Button
        className="w-full"
        disabled={!acceptedTerms}
        onClick={() => setStep('upload')}
      >
        Continuar
      </Button>
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          isLoading && 'opacity-50 pointer-events-none'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Processando arquivo...</p>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">Arraste o arquivo aqui</p>
            <p className="text-sm text-muted-foreground mb-4">
              ou clique para selecionar
            </p>
            <input
              ref={fileInputRef}
              type="file"
              id="ir-file"
              className="hidden"
              accept=".xml,.dec,.pdf"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-4 w-4 mr-2" />
              Selecionar arquivo
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileCode className="h-4 w-4" />
        <span>Formatos aceitos: XML, DEC (programa IRPF), PDF</span>
      </div>

      {imports.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">Importações anteriores</p>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {imports.map((imp) => (
                  <div
                    key={imp.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{imp.anoExercicio}</Badge>
                      <span className="text-muted-foreground">
                        {imp.bensDireitos.length} bens • {imp.rendimentosTributaveis.length} rendimentos
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteImport(imp.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );

  const handleImportAnother = useCallback(() => {
    setStep('upload');
    setTimeout(() => fileInputRef.current?.click(), 100);
  }, []);

  const renderResultStep = () => {
    if (!lastImport) return null;

    const totalBens = lastImport.bensDireitos.reduce((sum, b) => sum + (b as { situacaoAtual?: number }).situacaoAtual, 0);
    const totalRendTrib = lastImport.rendimentosTributaveis.reduce((sum, r) => sum + (r as { valor?: number }).valor, 0);
    const totalRendIsentos = lastImport.rendimentosIsentos.reduce((sum, r) => sum + (r as { valor?: number }).valor, 0);
    const totalRendimentos = totalRendTrib + totalRendIsentos;
    const totalDividas = lastImport.dividas.reduce((sum, d) => sum + (d as { situacaoAtual?: number }).situacaoAtual, 0);
    const numFontes = lastImport.rendimentosTributaveis.length + lastImport.rendimentosIsentos.length;
    const isEmpty =
      lastImport.bensDireitos.length === 0 &&
      lastImport.rendimentosTributaveis.length === 0 &&
      lastImport.rendimentosIsentos.length === 0 &&
      lastImport.dividas.length === 0;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {isEmpty ? (
            <>
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="font-medium text-foreground">Registrado sem dados detalhados</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <span className="font-medium text-foreground">Importação concluída!</span>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Declaração {lastImport.anoExercicio} (ano-base {lastImport.anoCalendario})
        </p>

        {isEmpty && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">Provavelmente é um Recibo</p>
            <p className="text-muted-foreground text-xs">
              O arquivo foi registrado, mas não contém dados detalhados. Para análise completa, importe o XML ou arquivo .dec da declaração.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-3 border-blue-500/20 bg-blue-500/5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bens e Direitos</p>
            <p className="font-semibold text-blue-600 dark:text-blue-400">
              {lastImport.bensDireitos.length} itens
            </p>
            <p className="text-sm font-medium">{formatCurrency(totalBens)}</p>
          </Card>
          <Card className="p-3 border-green-500/20 bg-green-500/5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rendimentos</p>
            <p className="text-xs text-muted-foreground">
              Trib. {formatCurrency(totalRendTrib)} · Isentos {formatCurrency(totalRendIsentos)}
            </p>
            <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(totalRendimentos)}</p>
            <p className="text-xs text-muted-foreground">{numFontes} fontes pagadoras</p>
          </Card>
          <Card className="p-3 border-orange-500/20 bg-orange-500/5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Dívidas e Ônus</p>
            <p className="font-semibold text-orange-600 dark:text-orange-400">
              {lastImport.dividas.length} itens
            </p>
            <p className="text-sm font-medium">{formatCurrency(totalDividas)}</p>
          </Card>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button variant="outline" className="sm:flex-1" onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-1" onClick={handleImportAnother}>
            <Upload className="h-4 w-4 mr-2" />
            Importar outro ano
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(step === 'result' ? 'sm:max-w-lg' : 'sm:max-w-md')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar Imposto de Renda
          </DialogTitle>
          <DialogDescription>
            {step === 'terms' && 'Revise os termos antes de continuar'}
            {step === 'upload' && 'Envie sua declaração do IRPF'}
            {step === 'result' && 'Resumo dos dados importados'}
          </DialogDescription>
        </DialogHeader>

        {step === 'terms' && renderTermsStep()}
        {step === 'upload' && renderUploadStep()}
        {step === 'result' && renderResultStep()}
      </DialogContent>
    </Dialog>
  );
};
