import React, { useState, useMemo } from 'react';
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
import { TrendingUp, TrendingDown, ArrowLeft, Loader2 } from 'lucide-react';
import { useLancamentosRealizados, LancamentoInput } from '@/hooks/useLancamentosRealizados';
import { useTransactionCategories } from '@/hooks/useTransactionCategories';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type TransactionType = 'receita' | 'despesa' | null;

interface QuickTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: TransactionType;
}

const paymentMethods = [
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'auto_debit', label: 'Débito Automático' },
  { value: 'cash', label: 'Dinheiro em Espécie' },
];

export const QuickTransactionDialog: React.FC<QuickTransactionDialogProps> = ({
  open,
  onOpenChange,
  defaultType = null,
}) => {
  const { addLancamento, loading } = useLancamentosRealizados();
  const { incomeCategories, expenseGroups, expenseItems, isLoading: loadingCategories } = useTransactionCategories();
  
  const [transactionType, setTransactionType] = useState<TransactionType>(defaultType);
  const [formData, setFormData] = useState({
    nome: '',
    valor: 0,
    categoria: '',
    categoriaId: '',
    expenseNature: '' as 'essential' | 'variable' | '',
    formaPagamento: 'pix',
    data: format(new Date(), 'yyyy-MM-dd'),
  });

  // Get unique category names for expense dropdown
  const expenseCategoryNames = useMemo(() => 
    [...new Set(expenseGroups.map(g => g.name))],
    [expenseGroups]
  );

  const resetForm = () => {
    setFormData({
      nome: '',
      valor: 0,
      categoria: '',
      categoriaId: '',
      expenseNature: '',
      formaPagamento: 'pix',
      data: format(new Date(), 'yyyy-MM-dd'),
    });
    setTransactionType(defaultType);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast.error('Informe a descrição');
      return;
    }
    if (formData.valor <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    if (!formData.categoria) {
      toast.error('Selecione a categoria');
      return;
    }

    const mesReferencia = formData.data.substring(0, 7); // YYYY-MM

    const lancamentoInput: LancamentoInput = {
      tipo: transactionType as 'receita' | 'despesa',
      categoria: formData.categoria,
      nome: formData.nome.trim(),
      valor_previsto: formData.valor,
      valor_realizado: formData.valor,
      mes_referencia: mesReferencia,
      data_pagamento: formData.data,
      forma_pagamento: transactionType === 'despesa' ? formData.formaPagamento : undefined,
    };

    const result = await addLancamento(lancamentoInput);
    
    if (result) {
      toast.success(
        transactionType === 'receita' 
          ? 'Receita registrada com sucesso!' 
          : 'Despesa registrada com sucesso!'
      );
      handleClose();
    }
  };

  // Quando o modal abre com tipo default, já vai direto pro form
  React.useEffect(() => {
    if (open && defaultType) {
      setTransactionType(defaultType);
    }
  }, [open, defaultType]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!transactionType ? (
          // Step 1: Escolher tipo
          <>
            <DialogHeader>
              <DialogTitle>Novo Lançamento</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 border-income/30 hover:bg-income/10 hover:border-income/50"
                onClick={() => setTransactionType('receita')}
              >
                <TrendingUp className="h-8 w-8 text-income" />
                <span className="text-income font-medium">Receita</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 border-expense/30 hover:bg-expense/10 hover:border-expense/50"
                onClick={() => setTransactionType('despesa')}
              >
                <TrendingDown className="h-8 w-8 text-expense" />
                <span className="text-expense font-medium">Despesa</span>
              </Button>
            </div>
          </>
        ) : (
          // Step 2: Formulário
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {transactionType === 'receita' ? (
                  <TrendingUp className="h-5 w-5 text-income" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-expense" />
                )}
                {transactionType === 'receita' ? 'Nova Receita' : 'Nova Despesa'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Descrição *</Label>
                <Input
                  id="nome"
                  placeholder={transactionType === 'receita' ? 'Ex: Salário, Freelance...' : 'Ex: Supermercado, Uber...'}
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
                <Label htmlFor="categoria">
                  {transactionType === 'receita' ? 'Tipo de Receita *' : 'Categoria *'}
                </Label>
                {loadingCategories ? (
                  <div className="flex items-center justify-center h-10 border rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => {
                      if (transactionType === 'despesa') {
                        // Find the expense item to get expense_nature
                        const expenseItem = expenseItems.find(item => item.categoryName === value);
                        setFormData(prev => ({ 
                          ...prev, 
                          categoria: value,
                          categoriaId: expenseItem?.categoryId || '',
                          expenseNature: expenseItem?.expenseNature || 'variable',
                        }));
                      } else {
                        setFormData(prev => ({ ...prev, categoria: value }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionType === 'receita' ? (
                        incomeCategories.map((income) => (
                          <SelectItem key={income.id} value={income.name}>
                            {income.name}
                          </SelectItem>
                        ))
                      ) : (
                        expenseCategoryNames.map((categoryName) => (
                          <SelectItem key={categoryName} value={categoryName}>
                            {categoryName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {transactionType === 'despesa' && (
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
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setTransactionType(null)}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className={cn(
                  "flex-1",
                  transactionType === 'receita' 
                    ? "bg-income hover:bg-income/90" 
                    : "bg-expense hover:bg-expense/90"
                )}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
