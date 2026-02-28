import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Upload, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  Loader2,
  FileText,
  CreditCard,
  Info,
  ExternalLink
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { expenseCategories, financialInstitutions } from '@/data/defaultData';
import { PendingTransaction, useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { useCreditCardImports } from '@/hooks/useCreditCardImports';
import { useCreditCardBills } from '@/hooks/useCreditCardBills';
import { useFinancial } from '@/contexts/FinancialContext';
import { toast } from 'sonner';
import { TransactionReviewTable } from './TransactionReviewTable';
import { format, addMonths, setDate as setDateFns } from 'date-fns';

interface ImportFaturaDialogProps {
  onImportComplete?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export function ImportFaturaDialog({ onImportComplete }: ImportFaturaDialogProps) {
  const { config } = useFinancial();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'select-card' | 'bill-dates' | 'input' | 'review'>('select-card');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [isCategorizingAI, setIsCategorizingAI] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Bill date fields
  const [closingDate, setClosingDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  // Get cards from config
  const cardsWithInfo = useMemo(() => {
    return config.financialInstitutions
      .filter(fi => fi.hasCreditCard)
      .map(fi => {
        const institution = financialInstitutions.find(i => i.id === fi.institutionId);
        return {
          id: fi.id,
          name: institution?.name || 'Cartão',
          color: institution?.color || '#6366f1',
          brand: fi.creditCardBrand || '',
        };
      });
  }, [config.financialInstitutions]);

  const selectedCard = useMemo(() => 
    cardsWithInfo.find(c => c.id === selectedCardId),
    [cardsWithInfo, selectedCardId]
  );

  // Get selected institution id for export instructions
  const selectedInstitutionId = useMemo(() => {
    if (!selectedCardId) return null;
    const userInst = config.financialInstitutions.find(fi => fi.id === selectedCardId);
    return userInst?.institutionId || null;
  }, [selectedCardId, config.financialInstitutions]);

  // Export instructions per bank
  const getExportInstructions = (institutionId: string | null): { steps: string[]; link?: string; linkText?: string } => {
    switch (institutionId) {
      case 'nubank':
        return {
          steps: [
            'Abra o app do Nubank e toque em "Cartão de crédito"',
            'Toque na fatura desejada',
            'Role até o final e toque em "Exportar fatura"',
            'Selecione o formato CSV ou PDF',
            'O arquivo será enviado para seu e-mail'
          ],
          link: 'https://nubank.com.br/perguntas/exportar-fatura/',
          linkText: 'Ajuda Nubank'
        };
      case 'itau':
        return {
          steps: [
            'Acesse o Internet Banking ou app Itaú',
            'Vá em "Cartões" > "Fatura"',
            'Clique em "Baixar fatura" ou "Exportar"',
            'Selecione o formato PDF ou XLS',
            'Faça o download do arquivo'
          ],
          link: 'https://www.itau.com.br/atendimento-itau',
          linkText: 'Ajuda Itaú'
        };
      case 'bradesco':
        return {
          steps: [
            'Acesse o app Bradesco ou Internet Banking',
            'Vá em "Cartões" > "Fatura"',
            'Selecione a fatura desejada',
            'Clique no ícone de download ou "Salvar PDF"',
            'O arquivo será baixado para seu dispositivo'
          ],
          link: 'https://banco.bradesco/html/classic/atendimento/index.shtm',
          linkText: 'Ajuda Bradesco'
        };
      case 'santander':
        return {
          steps: [
            'Acesse o app Santander Way ou Internet Banking',
            'Vá em "Cartões" > "Faturas"',
            'Selecione a fatura que deseja exportar',
            'Toque em "Baixar PDF" ou "Exportar"',
            'O arquivo será salvo no seu dispositivo'
          ],
          link: 'https://www.santander.com.br/atendimento',
          linkText: 'Ajuda Santander'
        };
      case 'inter':
        return {
          steps: [
            'Abra o app do Inter',
            'Vá em "Cartão" > "Fatura"',
            'Selecione a fatura desejada',
            'Toque em "Compartilhar" ou "Exportar"',
            'Escolha o formato PDF'
          ],
          link: 'https://www.bancointer.com.br/ajuda/',
          linkText: 'Ajuda Inter'
        };
      case 'c6':
        return {
          steps: [
            'Abra o app do C6 Bank',
            'Acesse a área de "Cartão"',
            'Selecione "Fatura"',
            'Toque nos três pontos e selecione "Exportar"',
            'Escolha PDF ou envie por e-mail'
          ],
          link: 'https://www.c6bank.com.br/faq',
          linkText: 'Ajuda C6'
        };
      case 'bb':
        return {
          steps: [
            'Acesse o app BB ou Internet Banking',
            'Vá em "Cartões" > "Fatura"',
            'Selecione a fatura desejada',
            'Clique em "Salvar" ou "Exportar PDF"',
            'O arquivo será baixado'
          ],
          link: 'https://www.bb.com.br/pbb/pagina-inicial/atendimento',
          linkText: 'Ajuda BB'
        };
      case 'caixa':
        return {
          steps: [
            'Acesse o app Caixa ou Internet Banking',
            'Vá em "Cartões" > "Extrato/Fatura"',
            'Selecione o período desejado',
            'Clique em "Imprimir" ou "Salvar PDF"',
            'Salve o arquivo no seu dispositivo'
          ],
          link: 'https://www.caixa.gov.br/atendimento',
          linkText: 'Ajuda Caixa'
        };
      default:
        return {
          steps: [
            'Acesse o app ou Internet Banking do seu banco',
            'Navegue até a seção de "Cartões" ou "Fatura"',
            'Procure pela opção "Exportar", "Baixar" ou "Compartilhar"',
            'Selecione o formato PDF, CSV ou XLS',
            'Faça o download ou envie para seu e-mail'
          ]
        };
    }
  };

  const [showInstructions, setShowInstructions] = useState(false);
  
  // Form state for manual entry
  const [storeName, setStoreName] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { categorizeWithAI, parseStatementFile, importTransactions } = useCreditCardTransactions();
  const { saveImport, fetchImports } = useCreditCardImports();
  const { createBill, updateBillTotal } = useCreditCardBills();

  // Calculate default dates when card is selected
  const initializeBillDates = useCallback((cardId: string) => {
    const userInst = config.financialInstitutions.find(fi => fi.id === cardId);
    const dueDay = userInst?.creditCardDueDay || 10;
    
    // Default closing date: today or last day of previous month
    const today = new Date();
    const defaultClosingDate = format(today, 'yyyy-MM-dd');
    
    // Default due date: dueDay of next month
    const nextMonth = addMonths(today, 1);
    const defaultDueDate = format(setDateFns(nextMonth, dueDay), 'yyyy-MM-dd');
    
    setClosingDate(defaultClosingDate);
    setDueDate(defaultDueDate);
  }, [config.financialInstitutions]);

  const handleSelectCard = (cardId: string) => {
    setSelectedCardId(cardId);
    initializeBillDates(cardId);
    setStep('bill-dates');
  };

  const handleConfirmBillDates = () => {
    if (!closingDate || !dueDate) {
      toast.error('Informe as datas de fechamento e vencimento');
      return;
    }
    setStep('input');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    const validExtensions = ['.pdf', '.csv', '.xls', '.xlsx', '.txt'];
    const isValidType = validTypes.includes(file.type) || 
                        validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      toast.error('Formato não suportado. Use PDF, CSV, XLS ou XLSX.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setIsParsingFile(true);
    try {
      const transactions = await parseStatementFile(file);
      setPendingTransactions(transactions);
      setUploadedFile(file); // Store the file for later saving
      setStep('review');
      toast.success(`${transactions.length} transações encontradas!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setIsParsingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddTransaction = () => {
    if (!storeName.trim()) {
      toast.error('Informe o nome da loja');
      return;
    }
    
    const numValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    if (!date) {
      toast.error('Informe a data');
      return;
    }

    setPendingTransactions(prev => [
      ...prev,
      {
        storeName: storeName.trim(),
        value: numValue,
        date,
        selectedCategoryId: 'outros',
        selectedCategory: 'Não atribuído',
      }
    ]);

    setStoreName('');
    setValue('');
  };

  const handleRemoveTransaction = (index: number) => {
    setPendingTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const handleCategorizeWithAI = async () => {
    if (pendingTransactions.length === 0) {
      toast.error('Adicione pelo menos uma transação');
      return;
    }

    setIsCategorizingAI(true);
    try {
      const categorized = await categorizeWithAI(pendingTransactions);
      setPendingTransactions(categorized);
      setStep('review');
      toast.success('Categorias sugeridas pela IA!');
    } catch (err) {
      toast.error('Erro ao categorizar. Tente novamente.');
    } finally {
      setIsCategorizingAI(false);
    }
  };

  const handleCategoryChange = (index: number, categoryId: string) => {
    const allCategories = [...expenseCategories, { id: 'outros', name: 'Não atribuído', reference: '' }];
    const category = allCategories.find(c => c.id === categoryId);
    setPendingTransactions(prev => 
      prev.map((t, i) => 
        i === index 
          ? { ...t, selectedCategoryId: categoryId, selectedCategory: category?.name || 'Não atribuído' }
          : t
      )
    );
  };

  const handleInstallmentChange = (index: number, current: number | undefined, total: number | undefined) => {
    setPendingTransactions(prev => 
      prev.map((t, i) => 
        i === index 
          ? { 
              ...t, 
              installmentCurrent: current, 
              installmentTotal: total,
              installment: current && total ? `${current}/${total}` : undefined
            }
          : t
      )
    );
  };

  const handleBatchCategoryChange = (indices: number[], categoryId: string) => {
    const found = expenseCategories.find((c: any) => c.id === categoryId);
    const categoryName = found?.name ?? 'Não atribuído';
    setPendingTransactions(prev =>
      prev.map((t, i) =>
        indices.includes(i)
          ? { ...t, selectedCategoryId: categoryId, selectedCategory: categoryName }
          : t
      )
    );
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      // Generate batch ID for linking file and transactions
      const batchId = crypto.randomUUID();
      
      // Create the bill first
      const bill = await createBill({
        card_id: selectedCardId,
        card_name: selectedCard?.name,
        closing_date: closingDate,
        due_date: dueDate,
        total_value: totalValue,
        status: 'open',
      });

      if (!bill) {
        toast.error('Erro ao criar fatura');
        return;
      }
      
      // Import transactions with bill ID
      const result = await importTransactions(pendingTransactions, selectedCardId, batchId, bill.id);
      
      if (result.success) {
        // Save the file to storage if we have one
        if (uploadedFile) {
          await saveImport(
            uploadedFile,
            batchId,
            selectedCardId || null,
            pendingTransactions.length,
            totalValue
          );
          await fetchImports(); // Refresh imports list
        }
        
        toast.success(`Fatura criada com ${pendingTransactions.length} transações!`);
        setOpen(false);
        resetDialog();
        onImportComplete?.();
      }
    } finally {
      setIsImporting(false);
    }
  };

  const resetDialog = () => {
    setStep('select-card');
    setSelectedCardId('');
    setPendingTransactions([]);
    setUploadedFile(null);
    setStoreName('');
    setValue('');
    setDate(new Date().toISOString().split('T')[0]);
    setClosingDate('');
    setDueDate('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetDialog();
    }
  };

  const totalValue = useMemo(() => 
    pendingTransactions.reduce((sum, t) => sum + t.value, 0),
    [pendingTransactions]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Fatura
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-hidden flex flex-col",
        step === 'review' ? "max-w-5xl" : "max-w-3xl"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {step === 'select-card' ? 'Selecionar Cartão' : step === 'input' ? 'Importar Fatura' : 'Revisar Categorias'}
            {selectedCard && <Badge variant="secondary">{selectedCard.name} {selectedCard.brand && `(${selectedCard.brand})`}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {step === 'select-card' 
              ? 'Selecione o cartão de crédito para importar a fatura.'
              : step === 'bill-dates'
                ? 'Informe as datas de fechamento e vencimento da fatura.'
                : step === 'input' 
                  ? 'Adicione as transações da sua fatura. A IA vai sugerir as categorias automaticamente.'
                  : 'Revise e confirme as categorias sugeridas pela IA antes de importar.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select-card' ? (
          <div className="space-y-4 py-4">
            {cardsWithInfo.length > 0 ? (
              <div className="space-y-3">
                <Label>Cartão de Crédito</Label>
                <div className="grid gap-3">
                  {cardsWithInfo.map(card => (
                    <button
                      key={card.id}
                      onClick={() => handleSelectCard(card.id)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border text-left transition-all",
                        "hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      <div 
                        className="h-10 w-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: card.color + '20' }}
                      >
                        <CreditCard className="h-5 w-5" style={{ color: card.color }} />
                      </div>
                      <div>
                        <p className="font-medium">{card.name}</p>
                        {card.brand && (
                          <p className="text-sm text-muted-foreground">{card.brand}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum cartão cadastrado</p>
                <p className="text-sm">Cadastre um cartão em Instituições Financeiras</p>
              </div>
            )}
          </div>
        ) : step === 'bill-dates' ? (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: selectedCard?.color + '20' }}
              >
                <CreditCard className="h-5 w-5" style={{ color: selectedCard?.color }} />
              </div>
              <div>
                <p className="font-medium">{selectedCard?.name}</p>
                {selectedCard?.brand && (
                  <p className="text-sm text-muted-foreground">{selectedCard.brand}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="closing-date">Data de Fechamento</Label>
                <Input
                  id="closing-date"
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Data em que a fatura fechou
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date">Data de Vencimento</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Data para pagamento da fatura
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep('select-card')}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleConfirmBillDates}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : step === 'input' ? (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Export Instructions */}
            <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-sm text-muted-foreground hover:text-foreground">
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Como exportar a fatura do {selectedCard?.name || 'banco'}?
                  </span>
                  <span className="text-xs">{showInstructions ? 'Ocultar' : 'Ver instruções'}</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                    {getExportInstructions(selectedInstitutionId).steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  {getExportInstructions(selectedInstitutionId).link && (
                    <a
                      href={getExportInstructions(selectedInstitutionId).link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {getExportInstructions(selectedInstitutionId).linkText}
                    </a>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* File Upload Section */}
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center bg-primary/5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.xls,.xlsx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {isParsingFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <p className="font-medium text-primary">Processando arquivo...</p>
                    <p className="text-sm text-muted-foreground">A IA está extraindo as transações</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-primary/60" />
                    <p className="font-medium">Arraste o arquivo ou clique para selecionar</p>
                    <p className="text-sm text-muted-foreground">PDF, CSV, XLS ou XLSX (máx. 10MB)</p>
                  </div>
                )}
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">ou adicione manualmente</span>
              <Separator className="flex-1" />
            </div>

            {/* Manual Entry Form */}
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-5">
                <Label htmlFor="store">Loja / Estabelecimento</Label>
                <Input
                  id="store"
                  placeholder="Ex: Supermercado Extra"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTransaction()}
                />
              </div>
              <div className="col-span-3">
                <Label htmlFor="value">Valor (R$)</Label>
                <Input
                  id="value"
                  placeholder="0,00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTransaction()}
                />
              </div>
              <div className="col-span-3">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="col-span-1">
                <Button onClick={handleAddTransaction} size="icon" variant="secondary">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Pending Transactions List */}
            {pendingTransactions.length > 0 && (
              <>
                <Separator />
                <ScrollArea className="flex-1 min-h-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loja</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTransactions.map((t, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{t.storeName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(t.value)}</TableCell>
                          <TableCell>{formatDate(t.date)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveTransaction(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </>
            )}

            {/* Footer */}
            {pendingTransactions.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{pendingTransactions.length}</span> transações • 
                  Total: <span className="font-medium text-foreground">{formatCurrency(totalValue)}</span>
                </div>
                <Button 
                  onClick={handleCategorizeWithAI}
                  disabled={isCategorizingAI}
                  className="gap-2"
                >
                  {isCategorizingAI ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Categorizando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Categorizar com IA
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <TransactionReviewTable
              transactions={pendingTransactions}
              onCategoryChange={handleCategoryChange}
              onInstallmentChange={handleInstallmentChange}
              onBatchCategoryChange={handleBatchCategoryChange}
              cardName={selectedCard?.name}
            />

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setStep('input')}
              >
                Voltar
              </Button>
              <Button 
                onClick={handleImport}
                disabled={isImporting}
                className="gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirmar Importação
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
