import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  ChevronRight,
  TrendingDown, 
  TrendingUp, 
  Receipt,
  Layers,
  History,
} from 'lucide-react';

interface MobileActionSelectorProps {
  onContaPagar: () => void;
  onContaReceber: () => void;
  onLancamentoIndividual: (tipo: 'receita' | 'despesa') => void;
  onLancamentoMassa: () => void;
  onLancamentoHistorico: () => void;
}

export const MobileActionSelector: React.FC<MobileActionSelectorProps> = ({
  onContaPagar,
  onContaReceber,
  onLancamentoIndividual,
  onLancamentoMassa,
  onLancamentoHistorico,
}) => {
  const [contaDialogOpen, setContaDialogOpen] = useState(false);
  const [lancamentoDialogOpen, setLancamentoDialogOpen] = useState(false);
  const [lancamentoStep, setLancamentoStep] = useState<'tipo' | 'metodo'>('tipo');
  const [lancamentoTipo, setLancamentoTipo] = useState<'receita' | 'despesa' | null>(null);

  const handleOpenLancamentoDialog = () => {
    setLancamentoStep('tipo');
    setLancamentoTipo(null);
    setLancamentoDialogOpen(true);
  };

  const handleSelectTipo = (tipo: 'receita' | 'despesa') => {
    setLancamentoTipo(tipo);
    setLancamentoStep('metodo');
  };

  const handleCloseLancamentoDialog = () => {
    setLancamentoDialogOpen(false);
    setLancamentoStep('tipo');
    setLancamentoTipo(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-2 w-full">
        {/* Conta AP/AR Button */}
        <Button 
          className="w-full gap-2 bg-income hover:bg-income/90 text-white justify-center"
          onClick={() => setContaDialogOpen(true)}
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-center">Registrar Nova Conta AP/AR</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Button>

        {/* Lançamento Button */}
        <Button 
          className="w-full gap-2 bg-income hover:bg-income/90 text-white justify-center"
          onClick={handleOpenLancamentoDialog}
        >
          <Receipt className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-center">Fazer Lançamento</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Button>
      </div>

      {/* Dialog for Conta AP/AR */}
      <Dialog open={contaDialogOpen} onOpenChange={setContaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Provisionar Nova Conta</DialogTitle>
          </DialogHeader>
          
          {/* Explanatory text */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Provisão</strong> é o registro antecipado de uma receita ou despesa futura, 
              seguindo o <em>regime de competência</em>.
            </p>
            <p className="text-xs text-muted-foreground">
              💡 Se o pagamento ou recebimento já foi concretizado, utilize "Fazer Lançamento" para registro direto.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 py-4">
            {/* Conta a Receber primeiro */}
            <button
              onClick={() => {
                onContaReceber();
                setContaDialogOpen(false);
              }}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-income/30 bg-income/5 hover:bg-income/10 active:scale-95 transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-income/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-income" />
              </div>
              <span className="text-sm font-medium text-income">Conta a Receber</span>
              <span className="text-[10px] text-muted-foreground text-center">Vendas, aluguéis, serviços</span>
            </button>
            
            {/* Conta a Pagar depois */}
            <button
              onClick={() => {
                onContaPagar();
                setContaDialogOpen(false);
              }}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-expense/30 bg-expense/5 hover:bg-expense/10 active:scale-95 transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-expense/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-expense" />
              </div>
              <span className="text-sm font-medium text-expense">Conta a Pagar</span>
              <span className="text-[10px] text-muted-foreground text-center">Fornecedores, contas fixas</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for Lançamento - Step 1: Tipo (Receita/Despesa) */}
      <Dialog open={lancamentoDialogOpen} onOpenChange={handleCloseLancamentoDialog}>
        <DialogContent className="sm:max-w-md">
          {lancamentoStep === 'tipo' ? (
            <>
              <DialogHeader>
                <DialogTitle>Novo Lançamento</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <button
                  onClick={() => handleSelectTipo('receita')}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-income/30 bg-income/5 hover:border-income hover:bg-income/10 active:scale-95 transition-all"
                >
                  <div className="h-12 w-12 rounded-full bg-income/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-income" />
                  </div>
                  <span className="font-semibold text-foreground">Receita</span>
                  <span className="text-xs text-muted-foreground text-center">Salários, vendas, aluguéis e rendimentos recebidos</span>
                </button>
                
                <button
                  onClick={() => handleSelectTipo('despesa')}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-expense/30 bg-expense/5 hover:border-expense hover:bg-expense/10 active:scale-95 transition-all"
                >
                  <div className="h-12 w-12 rounded-full bg-expense/20 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-expense" />
                  </div>
                  <span className="font-semibold text-foreground">Despesa</span>
                  <span className="text-xs text-muted-foreground text-center">Contas, compras e pagamentos realizados</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {lancamentoTipo === 'receita' ? (
                    <><TrendingUp className="h-5 w-5 text-income" /> Nova Receita</>
                  ) : (
                    <><TrendingDown className="h-5 w-5 text-expense" /> Nova Despesa</>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-4">
                <button
                  onClick={() => {
                    onLancamentoIndividual(lancamentoTipo!);
                    handleCloseLancamentoDialog();
                  }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:bg-muted/50 active:scale-[0.98] transition-all text-left"
                >
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                    lancamentoTipo === 'receita' ? 'bg-income/10' : 'bg-expense/10'
                  }`}>
                    <Plus className={`h-6 w-6 ${lancamentoTipo === 'receita' ? 'text-income' : 'text-expense'}`} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium">Lançamento Individual</span>
                    <span className="text-sm text-muted-foreground">
                      {lancamentoTipo === 'receita' ? 'Registrar uma única entrada' : 'Registrar uma única saída'}
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    onLancamentoMassa();
                    handleCloseLancamentoDialog();
                  }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:bg-muted/50 active:scale-[0.98] transition-all text-left"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Layers className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium">Lançamentos em Massa</span>
                    <span className="text-sm text-muted-foreground">Adicionar vários itens de uma vez</span>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    onLancamentoHistorico();
                    handleCloseLancamentoDialog();
                  }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:bg-muted/50 active:scale-[0.98] transition-all text-left"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <History className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium">Dados Históricos</span>
                    <span className="text-sm text-muted-foreground">Importar lançamentos de meses anteriores</span>
                  </div>
                </button>

                <Button 
                  variant="ghost" 
                  onClick={() => setLancamentoStep('tipo')} 
                  className="w-full mt-2"
                >
                  Voltar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
