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

  const renderResultStep = () => {
    if (!lastImport) return null;

    const totalBens = lastImport.bensDireitos.reduce((sum, b) => sum + b.situacaoAtual, 0);
    const totalRendimentos = lastImport.rendimentosTributaveis.reduce((sum, r) => sum + r.valor, 0);
    const totalDividas = lastImport.dividas.reduce((sum, d) => sum + d.situacaoAtual, 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Importação concluída!</span>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">Declaração {lastImport.anoExercicio}</span>
            <Badge variant="outline">
              {lastImport.sourceType.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 bg-blue-500/10 rounded">
              <p className="text-muted-foreground">Bens e Direitos</p>
              <p className="font-semibold text-blue-600">
                {lastImport.bensDireitos.length} itens
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalBens)}
              </p>
            </div>

            <div className="p-2 bg-green-500/10 rounded">
              <p className="text-muted-foreground">Rendimentos</p>
              <p className="font-semibold text-green-600">
                {lastImport.rendimentosTributaveis.length + lastImport.rendimentosIsentos.length} fontes
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalRendimentos)}
              </p>
            </div>

            <div className="p-2 bg-orange-500/10 rounded col-span-2">
              <p className="text-muted-foreground">Dívidas e Ônus</p>
              <p className="font-semibold text-orange-600">
                {lastImport.dividas.length} itens • {formatCurrency(totalDividas)}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setStep('upload')}>
            Importar outro
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
