import React from 'react';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useFinancial } from '@/contexts/FinancialContext';
import { Receipt, Users, Scale, Briefcase, Landmark, CalendarDays, Gift, Info, AlertTriangle } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { BackLink } from '@/components/shared/BackLink';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { calcularSaqueAniversario, calcularProximoSaque } from '@/components/bens/FGTSManagementDialog';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const ConfiguracoesFiscais: React.FC = () => {
  const { config, updateUserProfile } = useFinancial();
  const { userProfile } = config;
  
  // Calcular saldo total de FGTS para exibir valor do saque
  const fgtsAssets = config.assets.filter(
    asset => asset.type === 'investment' && asset.investmentType === 'fgts'
  );
  const saldoTotalFGTS = fgtsAssets.reduce((sum, asset) => sum + asset.value, 0);
  const saqueInfo = calcularSaqueAniversario(saldoTotalFGTS);
  const proximoSaque = userProfile.fgtsBirthMonth 
    ? calcularProximoSaque(userProfile.fgtsBirthMonth)
    : null;

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Scale}
          title="Configurações Fiscais"
          subtitle="Configure informações usadas no cálculo de deduções do Imposto de Renda"
        />

        {/* Dependents */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Dependentes
            </CardTitle>
            <CardDescription>
              Quantidade de dependentes para cálculo de dedução de educação. 
              O limite é de R$ 3.561,50 por pessoa (você + dependentes).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={0}
                max={10}
                value={userProfile.dependentsCount ?? 0}
                onChange={(e) => updateUserProfile({ 
                  dependentsCount: Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)) 
                })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                dependente{(userProfile.dependentsCount ?? 0) !== 1 ? 's' : ''}
              </span>
              <Badge variant="secondary" className="ml-auto">
                Limite educação: {formatCurrency(3561.50 * ((userProfile.dependentsCount ?? 0) + 1))}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Alimony */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-purple-500" />
                  Pensão Alimentícia Judicial
                </CardTitle>
                <CardDescription>
                  Valor mensal pago de pensão alimentícia determinada judicialmente (100% dedutível)
                </CardDescription>
              </div>
              <Switch
                checked={!userProfile.irNotApplicableCategories?.includes('pensao')}
                onCheckedChange={(checked) => {
                  const current = userProfile.irNotApplicableCategories || [];
                  if (checked) {
                    updateUserProfile({ irNotApplicableCategories: current.filter(c => c !== 'pensao') });
                  } else {
                    updateUserProfile({ 
                      irNotApplicableCategories: [...current, 'pensao'],
                      alimonyValue: 0
                    });
                  }
                }}
              />
            </div>
          </CardHeader>
          <CardContent>
            {!userProfile.irNotApplicableCategories?.includes('pensao') ? (
              <div className="flex items-center gap-4">
                <CurrencyInput
                  value={userProfile.alimonyValue ?? 0}
                  onChange={(value) => updateUserProfile({ alimonyValue: value })}
                  className="w-40"
                  placeholder="R$ 0,00"
                />
                <span className="text-sm text-muted-foreground">por mês</span>
                {(userProfile.alimonyValue ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    Anual: {formatCurrency((userProfile.alimonyValue ?? 0) * 12)}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Não aplicável à sua situação
              </p>
            )}
          </CardContent>
        </Card>

        {/* Livro Caixa */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-amber-500" />
                  Livro Caixa (Autônomos)
                </CardTitle>
                <CardDescription>
                  Para profissionais autônomos que recebem de pessoas físicas
                </CardDescription>
              </div>
              <Switch
                checked={!userProfile.irNotApplicableCategories?.includes('profissional')}
                onCheckedChange={(checked) => {
                  const current = userProfile.irNotApplicableCategories || [];
                  if (checked) {
                    updateUserProfile({ irNotApplicableCategories: current.filter(c => c !== 'profissional') });
                  } else {
                    updateUserProfile({ irNotApplicableCategories: [...current, 'profissional'] });
                  }
                }}
              />
            </div>
          </CardHeader>
          <CardContent>
            {!userProfile.irNotApplicableCategories?.includes('profissional') ? (
              <p className="text-sm text-muted-foreground">
                Suas despesas profissionais podem ser deduzidas do carnê-leão mensal.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Não aplicável à sua situação
              </p>
            )}
          </CardContent>
        </Card>

        {/* FGTS */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-blue-700" />
                  FGTS - Saque Aniversário
                </CardTitle>
                <CardDescription>
                  Configure a modalidade de saque para receber parte do FGTS anualmente
                </CardDescription>
              </div>
              <Switch
                checked={userProfile.fgtsSaqueAniversarioEnabled || false}
                onCheckedChange={(checked) => 
                  updateUserProfile({ fgtsSaqueAniversarioEnabled: checked })
                }
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {userProfile.fgtsSaqueAniversarioEnabled ? (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Mês de Aniversário
                  </Label>
                  <Select
                    value={userProfile.fgtsBirthMonth?.toString() || ''}
                    onValueChange={(value) => 
                      updateUserProfile({ fgtsBirthMonth: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((month, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {saldoTotalFGTS > 0 && userProfile.fgtsBirthMonth && (
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-green-50 border border-green-200">
                    <Gift className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">
                        Valor estimado do saque: {formatCurrency(saqueInfo.valor)}
                      </p>
                      {proximoSaque && (
                        <p className="text-xs text-green-600">
                          Próximo saque: {proximoSaque.month}/{proximoSaque.year}
                          {proximoSaque.daysUntil > 0 && ` (em ${proximoSaque.daysUntil} dias)`}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      Alíquota: {saqueInfo.aliquota}%
                    </Badge>
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Ao optar pelo Saque Aniversário, você abre mão do saque total em caso de 
                    demissão sem justa causa. Para voltar à modalidade Saque Rescisão, 
                    aguarde 25 meses.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Você está na modalidade Saque Rescisão (padrão)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Receipt className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Estas configurações são usadas no Organizador Fiscal
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Os valores configurados aqui serão usados automaticamente para calcular 
                  limites de dedução e economia estimada na seção "Meu IR".
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
};

export default ConfiguracoesFiscais;
