import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Share2, Download, Loader2, X, MessageCircle, Mail, Instagram } from 'lucide-react';
import { toPng } from 'html-to-image';
import { cn } from '@/lib/utils';

interface CostBreakdown {
  ipva: number;
  seguro: number;
  combustivel: number;
  manutencao: number;
  depreciacao: number;
  custoOportunidade: number;
}

interface CarData {
  nome: string;
  valorFipe: number;
  custoMensalTotal: number;
  tco5Anos: number;
  depreciacao5Anos?: number;
  valorFinal5Anos?: number;
  perdaPercentual?: number;
  custos?: CostBreakdown;
}

interface DepreciationPoint {
  year: number;
  valueA: number;
  valueB: number;
  label: string;
}

interface ComparisonCardGeneratorProps {
  carroA: CarData;
  carroB: CarData;
  horizonte: number;
  economiaMensal: number;
  vencedor: 'A' | 'B' | null;
  depreciationData?: DepreciationPoint[];
}

export const ComparisonCardGenerator: React.FC<ComparisonCardGeneratorProps> = ({
  carroA,
  carroB,
  horizonte,
  economiaMensal,
  vencedor,
  depreciationData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'simple' | 'detailed'>('simple');
  const cardRef = useRef<HTMLDivElement>(null);

  const formatMoney = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const formatMoneyShort = (value: number): string => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return formatMoney(value);
  };

  const formatNumberShort = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toFixed(0);
  };

  const carroVencedor = vencedor === 'A' ? carroA : carroB;
  const carroPerdedor = vencedor === 'A' ? carroB : carroA;
  const economiaTotal = economiaMensal * 12 * horizonte;

  // Calculate depreciation percentages
  const perdaPercentualA = carroA.valorFipe > 0 && carroA.depreciacao5Anos 
    ? ((carroA.depreciacao5Anos) / carroA.valorFipe) * 100 
    : 0;
  const perdaPercentualB = carroB.valorFipe > 0 && carroB.depreciacao5Anos 
    ? ((carroB.depreciacao5Anos) / carroB.valorFipe) * 100 
    : 0;

  // Simple depreciation projection for chart (if not provided externally)
  const defaultDepreciationData: DepreciationPoint[] = [
    { year: 0, valueA: carroA.valorFipe, valueB: carroB.valorFipe, label: 'Hoje' },
    { year: 1, valueA: carroA.valorFipe * 0.92, valueB: carroB.valorFipe * 0.92, label: '1A' },
    { year: 2, valueA: carroA.valorFipe * 0.85, valueB: carroB.valorFipe * 0.85, label: '2A' },
    { year: 3, valueA: carroA.valorFipe * 0.79, valueB: carroB.valorFipe * 0.79, label: '3A' },
    { year: 5, valueA: carroA.valorFipe * 0.70, valueB: carroB.valorFipe * 0.70, label: '5A' },
  ];

  const chartData = depreciationData || defaultDepreciationData;

  // Calculate chart dimensions
  const maxValue = Math.max(carroA.valorFipe, carroB.valorFipe);
  const minValue = Math.min(...chartData.map(d => Math.min(d.valueA, d.valueB)));
  const chartHeight = 80;
  const chartWidth = 220;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };

  const getY = (value: number) => {
    const range = maxValue - minValue * 0.9;
    return padding.top + ((maxValue - value) / range) * (chartHeight - padding.top - padding.bottom);
  };

  const getX = (index: number) => {
    return padding.left + (index / (chartData.length - 1)) * (chartWidth - padding.left - padding.right);
  };

  const generateImageBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#0f172a',
      });
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (error) {
      console.error('Error generating image:', error);
      return null;
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#0f172a',
      });

      const link = document.createElement('a');
      link.download = `comparativo-${carroA.nome.replace(/\s+/g, '-')}-vs-${carroB.nome.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImageBlob();
      
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], 'comparativo.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Comparador: Carro A vs B - RXFin',
            text: `🚗 ${carroVencedor.nome} é ${formatMoney(economiaMensal)}/mês mais barato!\n\n📊 Economia total em ${horizonte} anos: ${formatMoneyShort(economiaTotal)}\n\nFeito com RXFin`,
          });
          setIsGenerating(false);
          return;
        }
      }
      
      // Fallback: WhatsApp Web with text only
      const text = encodeURIComponent(
        `🚗 Comparador: Carro A vs B - RXFin\n\n` +
        `✅ ${carroVencedor.nome} é ${formatMoney(economiaMensal)}/mês mais barato!\n\n` +
        `📊 Economia total em ${horizonte} anos: ${formatMoneyShort(economiaTotal)}\n\n` +
        `Carro A: ${carroA.nome} - ${formatMoneyShort(carroA.valorFipe)}\n` +
        `Carro B: ${carroB.nome} - ${formatMoneyShort(carroB.valorFipe)}\n\n` +
        `Acesse: rxfin.app`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error sharing to WhatsApp:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareInstagram = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImageBlob();
      
      if (blob) {
        // For mobile: try native share for Instagram Stories
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], 'comparativo-rxfin.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Comparativo RXFin',
            });
            setIsGenerating(false);
            return;
          }
        }
        
        // Fallback: download and show instructions
        await handleDownload();
        alert('Imagem baixada! Agora você pode:\n1. Abrir o Instagram\n2. Criar um novo Story\n3. Selecionar a imagem baixada');
      }
    } catch (error) {
      console.error('Error sharing to Instagram:', error);
      await handleDownload();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareEmail = async () => {
    setIsGenerating(true);
    try {
      const subject = encodeURIComponent('Comparador: Carro A vs B - RXFin');
      const body = encodeURIComponent(
        `Olá!\n\n` +
        `Fiz uma análise comparando dois carros usando o RXFin:\n\n` +
        `📊 RESULTADO:\n` +
        `${carroVencedor.nome} é ${formatMoney(economiaMensal)}/mês mais barato!\n\n` +
        `📌 DETALHES:\n` +
        `• Carro A: ${carroA.nome}\n` +
        `  - Valor FIPE: ${formatMoneyShort(carroA.valorFipe)}\n` +
        `  - Custo mensal: ${formatMoney(carroA.custoMensalTotal)}\n\n` +
        `• Carro B: ${carroB.nome}\n` +
        `  - Valor FIPE: ${formatMoneyShort(carroB.valorFipe)}\n` +
        `  - Custo mensal: ${formatMoney(carroB.custoMensalTotal)}\n\n` +
        `💰 Economia total em ${horizonte} anos: ${formatMoneyShort(economiaTotal)}\n\n` +
        `Acesse o simulador completo em: rxfin.app/simulador-carro-ab`
      );
      
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
      
      // Also download the image
      await handleDownload();
    } catch (error) {
      console.error('Error sharing via email:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!carroA.valorFipe || !carroB.valorFipe || !vencedor) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        Gerar Card de Comparação
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden max-h-[95vh] overflow-y-auto">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center justify-between">
              Card de Comparação
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8" aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-4 space-y-4">
            {/* Tab selector */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setActiveTab('simple')}
                className={cn(
                  "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all",
                  activeTab === 'simple' 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Simples
              </button>
              <button
                onClick={() => setActiveTab('detailed')}
                className={cn(
                  "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all",
                  activeTab === 'detailed' 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Detalhado
              </button>
            </div>

            {/* Preview do Card */}
            <div className="rounded-lg overflow-hidden shadow-2xl">
              <div
                ref={cardRef}
                className="w-full p-5 flex flex-col"
                style={{
                  background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  aspectRatio: activeTab === 'simple' ? '9/16' : '9/18',
                }}
              >
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm mb-2">
                    <span className="text-[10px] font-medium text-white/80">Simulador RXFin</span>
                  </div>
                  <h2 className="text-lg font-bold text-white/70 uppercase tracking-widest">
                    Comparativo
                  </h2>
                </div>

                {/* VS Section */}
                <div className="flex-1 flex flex-col gap-3">
                  {/* Carro A */}
                  <div className={cn(
                    "p-3 rounded-xl border transition-all",
                    vencedor === 'A'
                      ? "bg-emerald-500/15 border-emerald-500/40"
                      : "bg-white/5 border-white/10"
                  )}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Carro A</span>
                      {vencedor === 'A' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold uppercase">
                          Melhor Escolha
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white truncate mb-1">{carroA.nome}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-white">{formatMoneyShort(carroA.valorFipe)}</span>
                      <span className="text-xs text-white/40">FIPE</span>
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-white/10 flex justify-between items-center">
                      <span className="text-xs text-white/60">
                        Custo mensal: <span className="font-semibold text-white">{formatMoney(carroA.custoMensalTotal)}</span>
                      </span>
                    </div>
                  </div>

                  {/* VS Badge */}
                  <div className="flex justify-center -my-1 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                      <span className="text-white font-black text-xs">VS</span>
                    </div>
                  </div>

                  {/* Carro B */}
                  <div className={cn(
                    "p-3 rounded-xl border transition-all",
                    vencedor === 'B'
                      ? "bg-emerald-500/15 border-emerald-500/40"
                      : "bg-white/5 border-white/10"
                  )}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Carro B</span>
                      {vencedor === 'B' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold uppercase">
                          Melhor Escolha
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white truncate mb-1">{carroB.nome}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-white">{formatMoneyShort(carroB.valorFipe)}</span>
                      <span className="text-xs text-white/40">FIPE</span>
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-white/10 flex justify-between items-center">
                      <span className="text-xs text-white/60">
                        Custo mensal: <span className="font-semibold text-white">{formatMoney(carroB.custoMensalTotal)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Detailed View: Mini Chart */}
                  {activeTab === 'detailed' && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 mt-1">
                      <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                        Projeção de Valor ({horizonte}A)
                      </p>
                      <div className="flex gap-4 items-end">
                        {/* Mini Chart */}
                        <div className="flex-1">
                          <svg width={chartWidth} height={chartHeight} className="w-full h-auto">
                            {/* Grid lines */}
                            <line x1={padding.left} y1={getY(maxValue)} x2={chartWidth - padding.right} y2={getY(maxValue)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                            <line x1={padding.left} y1={getY((maxValue + minValue * 0.9) / 2)} x2={chartWidth - padding.right} y2={getY((maxValue + minValue * 0.9) / 2)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                            
                            {/* Line A (Blue) */}
                            <polyline
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={chartData.map((d, i) => `${getX(i)},${getY(d.valueA)}`).join(' ')}
                            />
                            
                            {/* Line B (Amber) */}
                            <polyline
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={chartData.map((d, i) => `${getX(i)},${getY(d.valueB)}`).join(' ')}
                            />
                            
                            {/* Points A */}
                            {chartData.map((d, i) => (
                              <circle key={`a-${i}`} cx={getX(i)} cy={getY(d.valueA)} r="3" fill="#3b82f6" />
                            ))}
                            
                            {/* Points B */}
                            {chartData.map((d, i) => (
                              <circle key={`b-${i}`} cx={getX(i)} cy={getY(d.valueB)} r="3" fill="#f59e0b" />
                            ))}
                            
                            {/* X axis labels */}
                            {chartData.map((d, i) => (
                              <text 
                                key={`label-${i}`} 
                                x={getX(i)} 
                                y={chartHeight - 2} 
                                fill="rgba(255,255,255,0.5)" 
                                fontSize="8" 
                                textAnchor="middle"
                              >
                                {d.label}
                              </text>
                            ))}
                          </svg>
                        </div>
                        
                        {/* Legend */}
                        <div className="flex flex-col gap-1 text-[9px]">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-white/60">A</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-white/60">B</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed View: Cost Comparison */}
                  {activeTab === 'detailed' && carroA.custos && carroB.custos && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                        Custos Anuais
                      </p>
                      <div className="space-y-1.5">
                        {[
                          { label: 'IPVA', a: carroA.custos.ipva, b: carroB.custos.ipva },
                          { label: 'Seguro', a: carroA.custos.seguro, b: carroB.custos.seguro },
                          { label: 'Combustível', a: carroA.custos.combustivel, b: carroB.custos.combustivel },
                          { label: 'Manutenção', a: carroA.custos.manutencao, b: carroB.custos.manutencao },
                          { label: 'Depreciação', a: carroA.custos.depreciacao, b: carroB.custos.depreciacao },
                        ].map((item, idx) => {
                          const maxCost = Math.max(item.a, item.b);
                          const pctA = maxCost > 0 ? (item.a / maxCost) * 100 : 0;
                          const pctB = maxCost > 0 ? (item.b / maxCost) * 100 : 0;
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[9px] text-white/50 w-16 truncate">{item.label}</span>
                              <div className="flex-1 flex gap-0.5 h-3">
                                <div 
                                  className="bg-blue-500 rounded-sm" 
                                  style={{ width: `${pctA}%` }}
                                />
                                <div 
                                  className="bg-amber-500 rounded-sm" 
                                  style={{ width: `${pctB}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-2 pt-2 border-t border-white/10 text-[10px]">
                        <span className="text-white/50">Total Anual</span>
                        <div className="flex gap-3">
                          <span className="text-blue-400 font-semibold">{formatNumberShort(carroA.custoMensalTotal * 12)}</span>
                          <span className="text-amber-400 font-semibold">{formatNumberShort(carroB.custoMensalTotal * 12)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Verdict */}
                <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                  <div className="text-center">
                    <p className="text-[10px] text-emerald-400/80 font-medium mb-0.5">Veredito em {horizonte} {horizonte === 1 ? 'ano' : 'anos'}</p>
                    <p className="text-base font-black text-white leading-tight">
                      {carroVencedor.nome}
                    </p>
                    <p className="text-base font-bold text-emerald-400">
                      é {formatMoney(economiaMensal)}/mês mais barato
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-emerald-500/20">
                      <div className="text-center">
                        <p className="text-[9px] text-white/40 uppercase">Economia Total</p>
                        <p className="text-sm font-bold text-emerald-300">{formatMoneyShort(economiaTotal)}</p>
                      </div>
                      <div className="w-px h-6 bg-white/10" />
                      <div className="text-center">
                        <p className="text-[9px] text-white/40 uppercase">Por Mês</p>
                        <p className="text-sm font-bold text-emerald-300">{formatMoney(economiaMensal)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  <span className="text-[10px] text-white/30">Feito com</span>
                  <span className="text-xs font-bold text-white/50">RXFin</span>
                </div>
              </div>
            </div>

            {/* Share Options */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-center text-muted-foreground">
                Compartilhar via:
              </p>
              
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={handleShareWhatsApp}
                  variant="outline"
                  className="flex-col gap-1 h-auto py-3 hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950 dark:hover:border-green-700"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <MessageCircle className="h-5 w-5 text-green-600" />
                  )}
                  <span className="text-xs">WhatsApp</span>
                </Button>
                
                <Button
                  onClick={handleShareInstagram}
                  variant="outline"
                  className="flex-col gap-1 h-auto py-3 hover:bg-pink-50 hover:border-pink-300 dark:hover:bg-pink-950 dark:hover:border-pink-700"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Instagram className="h-5 w-5 text-pink-600" />
                  )}
                  <span className="text-xs">Instagram</span>
                </Button>
                
                <Button
                  onClick={handleShareEmail}
                  variant="outline"
                  className="flex-col gap-1 h-auto py-3 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950 dark:hover:border-blue-700"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Mail className="h-5 w-5 text-blue-600" />
                  )}
                  <span className="text-xs">Email</span>
                </Button>
              </div>

              <Button
                onClick={handleDownload}
                variant="secondary"
                className="w-full gap-2"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Baixar Imagem
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              Baixe a imagem ou use os botões para compartilhar diretamente!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
