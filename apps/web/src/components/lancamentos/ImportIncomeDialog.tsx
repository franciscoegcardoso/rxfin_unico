import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useFinancial } from '@/contexts/FinancialContext';
import { useLancamentosRealizados, LancamentoInput } from '@/hooks/useLancamentosRealizados';
import { format } from 'date-fns';
import { IncomeItem } from '@/types/financial';

interface ImportIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (entries: ImportedEntry[]) => void;
}

interface ExtractedIncome {
  name: string;
  value: number;
  type: string;
  confidence: number;
  sourceField?: string;
}

interface ImportedEntry {
  id: string;
  name: string;
  value: number;
  type: string;
  mappedItemId: string;
  selected: boolean;
  confidence: number;
}

type Step = 'upload' | 'processing' | 'review';

export const ImportIncomeDialog: React.FC<ImportIncomeDialogProps> = ({
  open,
  onOpenChange,
  onImportComplete
}) => {
  const { config } = useFinancial();
  const { addMultipleLancamentos, loading: savingLancamentos } = useLancamentosRealizados();
  const enabledIncomes = config.incomeItems.filter(i => i.enabled);

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [referenceMonth, setReferenceMonth] = useState<string>('');
  const [referenceYear, setReferenceYear] = useState<string>(new Date().getFullYear().toString());
  const [extractedIncomes, setExtractedIncomes] = useState<ImportedEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetDialog = useCallback(() => {
    setStep('upload');
    setFile(null);
    setDocumentType('');
    setReferenceMonth('');
    setReferenceYear(new Date().getFullYear().toString());
    setExtractedIncomes([]);
    setIsProcessing(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Formato de arquivo não suportado. Use PDF, PNG, JPG ou WebP.');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const findBestMatch = (incomeName: string, incomeType: string): string => {
    const lowerName = incomeName.toLowerCase();
    const lowerType = incomeType.toLowerCase();
    
    // Direct matches
    for (const item of enabledIncomes) {
      const itemLower = item.name.toLowerCase();
      if (lowerName.includes(itemLower) || itemLower.includes(lowerName)) {
        return item.id;
      }
      if (lowerType.includes(itemLower) || itemLower.includes(lowerType)) {
        return item.id;
      }
    }

    // Keyword matches
    const keywords: Record<string, string[]> = {
      'salário': ['salário', 'salario', 'vencimento', 'remuneração', 'remuneracao'],
      '13º salário': ['13', 'décimo terceiro', 'decimo terceiro', 'gratificação natalina'],
      'vale refeição / vale alimentação': ['vale', 'alimentação', 'alimentacao', 'refeição', 'refeicao', 'vr', 'va'],
      'bônus': ['bônus', 'bonus', 'gratificação', 'gratificacao', 'plr', 'participação', 'lucros'],
      'remuneração extra': ['extra', 'adicional', 'hora extra', 'horas extras'],
    };

    for (const item of enabledIncomes) {
      const itemLower = item.name.toLowerCase();
      const itemKeywords = keywords[itemLower];
      if (itemKeywords) {
        for (const keyword of itemKeywords) {
          if (lowerName.includes(keyword) || lowerType.includes(keyword)) {
            return item.id;
          }
        }
      }
    }

    // Default to first income item or 'outro'
    const outroItem = enabledIncomes.find(i => i.name.toLowerCase().includes('outro'));
    return outroItem?.id || enabledIncomes[0]?.id || '';
  };

  const processDocument = async () => {
    if (!file) {
      toast.error('Selecione um arquivo para importar.');
      return;
    }

    setStep('processing');
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('incomeItems', JSON.stringify(enabledIncomes.map(i => ({ id: i.id, name: i.name }))));

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/parse-income-document`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Limite de requisições excedido. Tente novamente em alguns segundos.');
        }
        if (response.status === 402) {
          throw new Error('Créditos insuficientes para processar o documento.');
        }
        throw new Error('Falha ao processar documento');
      }

      const result = await response.json();

      if (!result.success || result.extractedIncomes.length === 0) {
        toast.error(result.error || 'Não foi possível extrair dados do documento.');
        setStep('upload');
        setIsProcessing(false);
        return;
      }

      setDocumentType(result.documentType);
      if (result.referenceMonth) setReferenceMonth(result.referenceMonth);
      if (result.referenceYear) setReferenceYear(result.referenceYear);

      const mappedIncomes: ImportedEntry[] = result.extractedIncomes.map((income: ExtractedIncome, index: number) => ({
        id: `extracted-${index}`,
        name: income.name,
        value: income.value,
        type: income.type,
        mappedItemId: findBestMatch(income.name, income.type),
        selected: true,
        confidence: income.confidence,
      }));

      setExtractedIncomes(mappedIncomes);
      setStep('review');
      toast.success(`${mappedIncomes.length} receitas encontradas no documento.`);

    } catch (error) {
      console.error('Error processing document:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar documento');
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleEntrySelection = (id: string) => {
    setExtractedIncomes(prev => prev.map(entry => 
      entry.id === id ? { ...entry, selected: !entry.selected } : entry
    ));
  };

  const updateEntryMapping = (id: string, mappedItemId: string) => {
    setExtractedIncomes(prev => prev.map(entry => 
      entry.id === id ? { ...entry, mappedItemId } : entry
    ));
  };

  const updateEntryValue = (id: string, value: number) => {
    setExtractedIncomes(prev => prev.map(entry => 
      entry.id === id ? { ...entry, value } : entry
    ));
  };

  const handleConfirmImport = async () => {
    const selectedEntries = extractedIncomes.filter(e => e.selected && e.mappedItemId);
    
    if (selectedEntries.length === 0) {
      toast.error('Selecione pelo menos uma receita para importar.');
      return;
    }

    // Build entries for database
    const today = format(new Date(), 'yyyy-MM-dd');
    const mesReferencia = referenceMonth && referenceYear 
      ? `${referenceYear}-${referenceMonth.padStart(2, '0')}`
      : format(new Date(), 'yyyy-MM');

    const lancamentosToSave: LancamentoInput[] = selectedEntries.map(entry => {
      const incomeItem = enabledIncomes.find(i => i.id === entry.mappedItemId);
      return {
        tipo: 'receita' as const,
        categoria: 'Receitas',
        nome: incomeItem?.name || entry.name,
        valor_previsto: entry.value,
        valor_realizado: entry.value,
        mes_referencia: mesReferencia,
        data_pagamento: today,
        forma_pagamento: null,
      };
    });

    const success = await addMultipleLancamentos(lancamentosToSave);
    if (!success) {
      toast.error('Erro ao salvar lançamentos no banco de dados.');
      return;
    }

    onImportComplete(selectedEntries);
    toast.success(`${selectedEntries.length} receitas importadas e salvas com sucesso!`);
    resetDialog();
    onOpenChange(false);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">Alta</Badge>;
    }
    if (confidence >= 0.5) {
      return <Badge variant="default" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Média</Badge>;
    }
    return <Badge variant="default" className="bg-red-500/20 text-red-600 border-red-500/30">Baixa</Badge>;
  };

  const getIncomeItemName = (itemId: string) => {
    return enabledIncomes.find(i => i.id === itemId)?.name || 'Não mapeado';
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const documentTypeLabels: Record<string, string> = {
    'contracheque': 'Contracheque',
    'declaracao_anual': 'Declaração Anual IR',
    'unknown': 'Documento',
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetDialog();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar Receitas com IA
          </DialogTitle>
          <DialogDescription>
            Importe contracheques ou declarações anuais para preencher automaticamente suas receitas.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
                id="income-file-upload"
              />
              <label htmlFor="income-file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  {file ? (
                    <>
                      <FileText className="h-12 w-12 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); setFile(null); }}>
                        <X className="h-4 w-4 mr-1" /> Remover
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">Clique para selecionar</p>
                        <p className="text-sm text-muted-foreground">
                          PDF, PNG, JPG ou WebP (máx. 10MB)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </label>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Documentos suportados:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Contracheque (Holerite)</strong> - Extrai salário, VR/VA, bônus, etc.</li>
                <li>• <strong>Declaração Anual IR</strong> - Extrai rendimentos tributáveis e isentos</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={processDocument} disabled={!file}>
                <Sparkles className="h-4 w-4 mr-2" />
                Analisar com IA
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Processando documento...</p>
              <p className="text-sm text-muted-foreground">
                A IA está analisando o conteúdo para extrair as receitas.
              </p>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">
                  {documentTypeLabels[documentType] || 'Documento'} analisado
                </p>
                <p className="text-sm text-muted-foreground">
                  {referenceMonth && referenceYear 
                    ? `Referência: ${referenceMonth}/${referenceYear}`
                    : referenceYear 
                      ? `Ano: ${referenceYear}` 
                      : ''}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Receitas encontradas ({extractedIncomes.length})</h4>
              <p className="text-sm text-muted-foreground">
                Revise e confirme a associação das receitas antes de importar.
              </p>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {extractedIncomes.map((entry) => (
                  <Card key={entry.id} className={`transition-opacity ${!entry.selected ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={entry.selected}
                          onCheckedChange={() => toggleEntrySelection(entry.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{entry.name}</p>
                              <p className="text-sm text-muted-foreground">{entry.type}</p>
                            </div>
                            {getConfidenceBadge(entry.confidence)}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Valor</Label>
                              <Input
                                type="number"
                                value={entry.value}
                                onChange={(e) => updateEntryValue(entry.id, parseFloat(e.target.value) || 0)}
                                className="h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Associar a</Label>
                              <Select
                                value={entry.mappedItemId}
                                onValueChange={(value) => updateEntryMapping(entry.id, value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {enabledIncomes.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  {extractedIncomes.filter(e => e.selected).length} de {extractedIncomes.length} selecionadas
                </span>
                <span className="font-medium">
                  Total: {formatCurrency(extractedIncomes.filter(e => e.selected).reduce((acc, e) => acc + e.value, 0))}
                </span>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Voltar
                </Button>
                <Button onClick={handleConfirmImport} disabled={savingLancamentos}>
                  {savingLancamentos ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Importação
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
