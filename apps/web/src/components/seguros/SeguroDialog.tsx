import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Insurance, InsuranceType, insuranceTypeOptions } from '@/types/seguro';
import { useSeguros, getApoliceDownloadUrl } from '@/hooks/useSeguros';
import { useFinancial } from '@/contexts/FinancialContext';
import { useContasPagarReceber } from '@/hooks/useContasPagarReceber';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import {
  Car,
  Home,
  Heart,
  Stethoscope,
  Smile,
  Plane,
  Building2,
  Dog,
  Smartphone,
  Bike,
  Briefcase,
  ShieldCheck,
  Shield,
  Link2,
  Upload,
  FileText,
  X,
  Download,
} from 'lucide-react';

interface SeguroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seguro?: Insurance | null;
  preSelectedAssetId?: string;
}

const insuranceIcons: Record<InsuranceType, React.ElementType> = {
  auto: Car,
  residencial: Home,
  vida: Heart,
  saude: Stethoscope,
  odontologico: Smile,
  viagem: Plane,
  empresarial: Building2,
  pet: Dog,
  celular: Smartphone,
  bike: Bike,
  rc_profissional: Briefcase,
  garantia_estendida: ShieldCheck,
  outro: Shield,
};

const formasPagamento = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'a_vista', label: 'À Vista' },
];

export const SeguroDialog: React.FC<SeguroDialogProps> = ({
  open,
  onOpenChange,
  seguro,
  preSelectedAssetId,
}) => {
  const { seguros, addSeguro, updateSeguro, uploadFile, deleteFile } = useSeguros();
  const { config } = useFinancial();
  const { addConta, deleteContasByVinculoAtivo, getContasByVinculoAtivo } = useContasPagarReceber();
  const assets = config.assets || [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [vincularPlanejamento, setVincularPlanejamento] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFile, setExistingFile] = useState<{ path: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'auto' as InsuranceType,
    seguradora: '',
    numero_apolice: '',
    premio_mensal: 0,
    premio_anual: 0,
    valor_cobertura: 0,
    franquia: 0,
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    renovacao_automatica: false,
    asset_id: '',
    forma_pagamento: 'mensal' as Insurance['forma_pagamento'],
    dia_vencimento: 1,
    observacoes: '',
  });

  useEffect(() => {
    if (seguro) {
      setFormData({
        nome: seguro.nome,
        tipo: seguro.tipo,
        seguradora: seguro.seguradora,
        numero_apolice: seguro.numero_apolice || '',
        premio_mensal: seguro.premio_mensal,
        premio_anual: seguro.premio_anual,
        valor_cobertura: seguro.valor_cobertura,
        franquia: seguro.franquia || 0,
        data_inicio: seguro.data_inicio,
        data_fim: seguro.data_fim,
        renovacao_automatica: seguro.renovacao_automatica,
        asset_id: seguro.asset_id || '',
        forma_pagamento: seguro.forma_pagamento || 'mensal',
        dia_vencimento: seguro.dia_vencimento || 1,
        observacoes: seguro.observacoes || '',
      });
      // Set existing file if present
      if (seguro.arquivo_path && seguro.arquivo_nome) {
        setExistingFile({ path: seguro.arquivo_path, name: seguro.arquivo_nome });
      } else {
        setExistingFile(null);
      }
      setSelectedFile(null);
    } else {
      // Reset form
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      setFormData({
        nome: '',
        tipo: 'auto',
        seguradora: '',
        numero_apolice: '',
        premio_mensal: 0,
        premio_anual: 0,
        valor_cobertura: 0,
        franquia: 0,
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: oneYearFromNow.toISOString().split('T')[0],
        renovacao_automatica: false,
        asset_id: preSelectedAssetId || '',
        forma_pagamento: 'mensal',
        dia_vencimento: 1,
        observacoes: '',
      });
      setExistingFile(null);
      setSelectedFile(null);
    }
  }, [seguro, open, preSelectedAssetId]);

  // Auto-calcular prêmio anual quando mensal mudar
  const handlePremioMensalChange = (value: number) => {
    setFormData(prev => ({
      ...prev,
      premio_mensal: value,
      premio_anual: value * 12,
    }));
  };

  // Auto-calcular prêmio mensal quando anual mudar
  const handlePremioAnualChange = (value: number) => {
    setFormData(prev => ({
      ...prev,
      premio_anual: value,
      premio_mensal: Math.round((value / 12) * 100) / 100,
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Apenas arquivos PDF são aceitos');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Arquivo muito grande. Máximo 10MB');
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

  const handleRemoveExistingFile = async () => {
    if (existingFile && seguro) {
      await deleteFile(existingFile.path);
      await updateSeguro.mutateAsync({ 
        id: seguro.id, 
        arquivo_path: undefined, 
        arquivo_nome: undefined 
      });
      setExistingFile(null);
      toast.success('Arquivo removido');
    }
  };

  const handleDownloadFile = async () => {
    if (existingFile) {
      const url = await getApoliceDownloadUrl(existingFile.path);
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.error('Erro ao obter link de download');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      // Handle file upload first if there's a new file
      let arquivo_path = existingFile?.path;
      let arquivo_nome = existingFile?.name;

      if (selectedFile) {
        // Delete old file if exists
        if (existingFile) {
          await deleteFile(existingFile.path);
        }
        
        const uploadResult = await uploadFile(selectedFile);
        if (uploadResult) {
          arquivo_path = uploadResult.path;
          arquivo_nome = uploadResult.name;
        }
      }

      const payload = {
        ...formData,
        asset_id: formData.asset_id || undefined,
        numero_apolice: formData.numero_apolice || undefined,
        franquia: formData.franquia || undefined,
        observacoes: formData.observacoes || undefined,
        arquivo_path,
        arquivo_nome,
      };

      let seguroId: string;
      
      if (seguro) {
        await updateSeguro.mutateAsync({ id: seguro.id, ...payload });
        seguroId = seguro.id;
        
        // Se vincular ao planejamento está ativo, recria as contas
        if (vincularPlanejamento) {
          // Remove contas anteriores vinculadas a este seguro
          await deleteContasByVinculoAtivo(`seguro_${seguroId}`);
          await createRecurringExpenses(seguroId, payload);
        }
      } else {
        const result = await addSeguro.mutateAsync(payload);
        seguroId = result?.id;
        
        // Se vincular ao planejamento e foi criado com sucesso
        if (vincularPlanejamento && seguroId) {
          await createRecurringExpenses(seguroId, payload);
        }
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving seguro:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const createRecurringExpenses = async (seguroId: string, data: typeof formData) => {
    const { forma_pagamento, premio_mensal, premio_anual, dia_vencimento, nome, data_inicio, data_fim } = data;
    
    // Define valor e recorrência baseado na forma de pagamento
    let valor = premio_mensal;
    let recorrente = true;
    let tipoCobranca: 'recorrente' | 'unica' = 'recorrente';
    
    if (forma_pagamento === 'a_vista' || forma_pagamento === 'anual') {
      valor = premio_anual;
      recorrente = false;
      tipoCobranca = 'unica';
    } else if (forma_pagamento === 'trimestral') {
      valor = premio_anual / 4;
    } else if (forma_pagamento === 'semestral') {
      valor = premio_anual / 2;
    }

    try {
      await addConta({
        tipo: 'pagar',
        nome: `Seguro: ${nome}`,
        valor,
        dataVencimento: data_inicio,
        categoria: 'Seguros',
        formaPagamento: 'boleto',
        recorrente,
        tipoCobranca,
        diaRecorrencia: dia_vencimento || 1,
        dataFimRecorrencia: data_fim,
        semDataFim: false,
        vinculoAtivoId: `seguro_${seguroId}`,
        observacoes: `Prêmio de seguro - ${insuranceTypeOptions.find(o => o.value === data.tipo)?.label || 'Seguro'}`,
      });
      
      toast.success('Despesas recorrentes criadas no planejamento!');
    } catch (error) {
      console.error('Error creating recurring expenses:', error);
      toast.error('Erro ao criar despesas recorrentes');
    }
  };

  // Filtrar ativos que podem ter seguro (veículos e imóveis)
  const assetsForLinking = assets.filter(a => 
    a.type === 'property' || a.type === 'vehicle'
  );

  // Verificar se já existe seguro vinculado ao mesmo bem
  const existingInsuranceForAsset = React.useMemo(() => {
    if (!formData.asset_id) return null;
    
    // Encontrar seguros ativos vinculados ao mesmo bem (exceto o atual sendo editado)
    const existingSeguro = seguros?.find(s => 
      s.asset_id === formData.asset_id && 
      s.id !== seguro?.id &&
      new Date(s.data_fim) >= new Date() // Apenas seguros vigentes
    );
    
    if (existingSeguro) {
      const linkedAsset = assets.find(a => a.id === formData.asset_id);
      return {
        seguro: existingSeguro,
        assetName: linkedAsset?.name || 'Bem'
      };
    }
    
    return null;
  }, [formData.asset_id, seguros, seguro?.id, assets]);

  const IconComponent = insuranceIcons[formData.tipo];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-primary" />
            {seguro ? 'Editar Seguro' : 'Novo Seguro'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo e Nome */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v as InsuranceType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {insuranceTypeOptions.map(opt => {
                      const Icon = insuranceIcons[opt.value];
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Seguro do Carro"
                  required
                />
              </div>
            </div>

            {/* Seguradora e Apólice */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Seguradora</Label>
                <Input
                  value={formData.seguradora}
                  onChange={(e) => setFormData(prev => ({ ...prev, seguradora: e.target.value }))}
                  placeholder="Ex: Porto Seguro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Nº Apólice</Label>
                <Input
                  value={formData.numero_apolice}
                  onChange={(e) => setFormData(prev => ({ ...prev, numero_apolice: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prêmio Mensal</Label>
                <CurrencyInput
                  value={formData.premio_mensal}
                  onChange={handlePremioMensalChange}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Prêmio Anual</Label>
                <CurrencyInput
                  value={formData.premio_anual}
                  onChange={handlePremioAnualChange}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor da Cobertura</Label>
                <CurrencyInput
                  value={formData.valor_cobertura}
                  onChange={(v) => setFormData(prev => ({ ...prev, valor_cobertura: v }))}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Franquia</Label>
                <CurrencyInput
                  value={formData.franquia}
                  onChange={(v) => setFormData(prev => ({ ...prev, franquia: v }))}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Vigência */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início da Vigência</Label>
                <Input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Fim da Vigência</Label>
                <Input
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_fim: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Pagamento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={formData.forma_pagamento}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, forma_pagamento: v as Insurance['forma_pagamento'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map(fp => (
                      <SelectItem key={fp.value} value={fp.value}>
                        {fp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dia de Vencimento</Label>
                <Select
                  value={String(formData.dia_vencimento)}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, dia_vencimento: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={String(day)}>
                        Dia {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vínculo com Bem */}
            {assetsForLinking.length > 0 && (
              <div className="space-y-2">
                <Label>Vincular a um Bem</Label>
                <Select
                  value={formData.asset_id || 'none'}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, asset_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um bem (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {assetsForLinking.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} ({asset.type === 'property' ? 'Imóvel' : 'Veículo'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Alerta de seguro existente para o mesmo bem */}
                {existingInsuranceForAsset && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{existingInsuranceForAsset.assetName}</strong> já possui um seguro vigente: 
                      <span className="font-medium"> {existingInsuranceForAsset.seguro.nome}</span> 
                      ({existingInsuranceForAsset.seguro.seguradora}, até {new Date(existingInsuranceForAsset.seguro.data_fim).toLocaleDateString('pt-BR')}).
                      Você pode continuar, mas verifique se não é uma duplicidade.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Vincular ao Planejamento */}
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Vincular ao Planejamento</p>
                  <p className="text-xs text-muted-foreground">
                    Gerar despesas recorrentes automaticamente
                  </p>
                </div>
              </div>
              <Switch
                checked={vincularPlanejamento}
                onCheckedChange={setVincularPlanejamento}
              />
            </div>

            {/* Renovação automática */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Renovação Automática</p>
                <p className="text-xs text-muted-foreground">
                  Gerar alerta antes do vencimento
                </p>
              </div>
              <Switch
                checked={formData.renovacao_automatica}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, renovacao_automatica: v }))}
              />
            </div>

            {/* Upload de Apólice */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Apólice (PDF)
              </Label>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Existing file display */}
              {existingFile && !selectedFile && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm truncate">{existingFile.name}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleDownloadFile}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={handleRemoveExistingFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* New file selected */}
              {selectedFile && (
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm truncate">{selectedFile.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Upload button */}
              {!existingFile && !selectedFile && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Arquivo
                </Button>
              )}

              {/* Replace file button */}
              {(existingFile || selectedFile) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Substituir arquivo
                </Button>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Notas sobre o seguro..."
                rows={2}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={addSeguro.isPending || updateSeguro.isPending || isUploading}
              >
                {isUploading ? 'Enviando...' : seguro ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
