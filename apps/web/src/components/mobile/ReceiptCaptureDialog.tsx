import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Camera, 
  Upload, 
  Loader2, 
  Check, 
  X, 
  Edit2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { parseReceiptWithAuth } from '@/lib/parseReceipt';
import { useFinancial } from '@/contexts/FinancialContext';
import { useLancamentosRealizados, LancamentoInput } from '@/hooks/useLancamentosRealizados';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ReceiptCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedReceipt {
  estabelecimento: string;
  valor: number;
  data: string;
  categoria_sugerida: string;
  forma_pagamento: string;
  confianca: number;
}

type Step = 'capture' | 'processing' | 'review' | 'manual';

export const ReceiptCaptureDialog: React.FC<ReceiptCaptureDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { config } = useFinancial();
  const { addLancamento, loading: savingLancamento } = useLancamentosRealizados();
  
  const [step, setStep] = useState<Step>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedReceipt | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data for review/edit
  const [formData, setFormData] = useState({
    nome: '',
    valor: 0,
    categoria: '',
    formaPagamento: 'crédito',
    data: format(new Date(), 'yyyy-MM-dd'),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Get expense categories from config
  const expenseCategories = config.expenseItems
    .filter(item => item.enabled)
    .map(item => item.name);

  const resetDialog = useCallback(() => {
    setStep('capture');
    setCapturedImage(null);
    setParsedData(null);
    setIsProcessing(false);
    setError(null);
    setFormData({
      nome: '',
      valor: 0,
      categoria: '',
      formaPagamento: 'crédito',
      data: format(new Date(), 'yyyy-MM-dd'),
    });
  }, []);

  const handleClose = useCallback(() => {
    resetDialog();
    onOpenChange(false);
  }, [resetDialog, onOpenChange]);

  const processImage = async (imageBase64: string) => {
    setStep('processing');
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await parseReceiptWithAuth({ imageBase64 });

      if (fnError) throw fnError;

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao processar comprovante');
      }

      const receipt = data.data as ParsedReceipt;
      setParsedData(receipt);
      
      // Map AI category to user's configured categories
      const mappedCategory = findClosestCategory(receipt.categoria_sugerida, expenseCategories);
      
      setFormData({
        nome: receipt.estabelecimento,
        valor: receipt.valor,
        categoria: mappedCategory,
        formaPagamento: receipt.forma_pagamento === 'crédito' ? 'credito' : 'debito',
        data: receipt.data,
      });
      
      setStep('review');
    } catch (err) {
      console.error('Error processing receipt:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar comprovante');
      setStep('capture');
      toast.error('Não foi possível ler o comprovante. Tente novamente ou insira manualmente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const findClosestCategory = (aiCategory: string, userCategories: string[]): string => {
    // Direct match
    const direct = userCategories.find(c => c.toLowerCase() === aiCategory.toLowerCase());
    if (direct) return direct;

    // Partial match
    const partial = userCategories.find(c => 
      c.toLowerCase().includes(aiCategory.toLowerCase()) ||
      aiCategory.toLowerCase().includes(c.toLowerCase())
    );
    if (partial) return partial;

    // Category mapping
    const categoryMap: Record<string, string[]> = {
      'alimentação': ['alimentação', 'comida', 'refeição', 'restaurante', 'mercado', 'supermercado'],
      'transporte': ['transporte', 'uber', 'gasolina', 'combustível', 'estacionamento'],
      'lazer': ['lazer', 'entretenimento', 'diversão', 'cinema', 'streaming'],
      'saúde': ['saúde', 'farmácia', 'médico', 'plano de saúde'],
      'educação': ['educação', 'curso', 'escola', 'faculdade'],
      'moradia': ['moradia', 'aluguel', 'condomínio', 'luz', 'água', 'gás'],
      'compras': ['compras', 'vestuário', 'roupas', 'shopping'],
      'serviços': ['serviços', 'assinaturas', 'internet', 'telefone'],
    };

    for (const [key, aliases] of Object.entries(categoryMap)) {
      if (aliases.some(a => aiCategory.toLowerCase().includes(a))) {
        const match = userCategories.find(c => 
          aliases.some(a => c.toLowerCase().includes(a))
        );
        if (match) return match;
      }
    }

    // Return first category as fallback
    return userCategories[0] || '';
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setCapturedImage(base64);
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.valor || !formData.categoria) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const mesReferencia = formData.data.substring(0, 7); // YYYY-MM
    
    const lancamento: LancamentoInput = {
      tipo: 'despesa',
      categoria: formData.categoria,
      nome: formData.nome,
      valor_previsto: formData.valor,
      valor_realizado: formData.valor,
      mes_referencia: mesReferencia,
      data_pagamento: formData.data,
      forma_pagamento: formData.formaPagamento,
    };

    const result = await addLancamento(lancamento);
    
    if (result) {
      toast.success('Despesa registrada com sucesso!');
      handleClose();
    }
  };

  const goToManual = () => {
    setStep('manual');
    setFormData({
      nome: '',
      valor: 0,
      categoria: expenseCategories[0] || '',
      formaPagamento: 'credito',
      data: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {step === 'capture' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">Registrar Despesa</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground text-center">
                Aponte a câmera para a filipeta da maquininha de cartão
              </p>

              <div className="grid gap-3">
                <Button
                  onClick={handleCameraCapture}
                  className="h-32 flex-col gap-3 bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  <Camera className="h-10 w-10" />
                  <span className="text-lg font-medium">Tirar Foto</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleGallerySelect}
                  className="h-16 flex-col gap-2"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">Escolher da Galeria</span>
                </Button>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="ghost"
                  onClick={goToManual}
                  className="w-full text-muted-foreground"
                >
                  Inserir manualmente
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Lendo comprovante...</p>
            <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
          </div>
        )}

        {(step === 'review' || step === 'manual') && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setStep('capture')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {step === 'review' ? 'Confirmar Dados' : 'Nova Despesa'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {step === 'review' && parsedData && (
                <div className={cn(
                  "flex items-center gap-2 p-2 rounded-lg text-sm",
                  parsedData.confianca >= 80 
                    ? "bg-income/10 text-income" 
                    : parsedData.confianca >= 50
                    ? "bg-warning/10 text-warning"
                    : "bg-destructive/10 text-destructive"
                )}>
                  {parsedData.confianca >= 80 ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span>
                    {parsedData.confianca >= 80 
                      ? 'Dados extraídos com alta confiança'
                      : 'Verifique os dados antes de salvar'}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="nome">Estabelecimento *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Restaurante, Uber..."
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <CurrencyInput
                  value={formData.valor}
                  onChange={(value) => setFormData(prev => ({ ...prev, valor: value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                <Select
                  value={formData.formaPagamento}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, formaPagamento: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="debito">Cartão de Débito</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={savingLancamento || !formData.nome || !formData.valor || !formData.categoria}
                  className="flex-1"
                >
                  {savingLancamento ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
