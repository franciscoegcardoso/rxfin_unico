import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoneyInput } from '@/components/ui/money-input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Tv,
  Music,
  Dumbbell,
  Truck,
  Briefcase,
  Heart,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Sparkles,
  Lightbulb,
  Check,
  DollarSign,
  Calendar,
  Users,
  RotateCcw,
  Zap,
  Info,
  Gift,
  PiggyBank,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StreamingOptimizerModuleProps {
  realHourlyRate: number;
}

// ==================== STREAMING DATA ====================

interface StreamingService {
  id: string;
  name: string;
  category: StreamingCategory;
  description: string;
  basicMonthly: number;
  basicAnnual: number | null;
  premiumMonthly: number | null;
  premiumAnnual: number | null;
  annualROI?: number; // Return vs paying monthly
}

type StreamingCategory = 
  | 'video' 
  | 'musica' 
  | 'superapps' 
  | 'delivery' 
  | 'mobilidade' 
  | 'profissional' 
  | 'saude' 
  | 'clubes';

const CATEGORY_CONFIG: Record<StreamingCategory, { label: string; icon: React.ElementType; color: string }> = {
  video: { label: 'Streaming de Vídeo', icon: Tv, color: 'bg-indigo-500' },
  musica: { label: 'Música & Áudio', icon: Music, color: 'bg-green-500' },
  superapps: { label: 'Super Apps', icon: Gift, color: 'bg-amber-500' },
  delivery: { label: 'Delivery', icon: Truck, color: 'bg-orange-500' },
  mobilidade: { label: 'Mobilidade', icon: Truck, color: 'bg-blue-500' },
  profissional: { label: 'Profissional', icon: Briefcase, color: 'bg-purple-500' },
  saude: { label: 'Bem-estar & Saúde', icon: Heart, color: 'bg-red-500' },
  clubes: { label: 'Clubes & Varejo', icon: ShoppingBag, color: 'bg-pink-500' },
};

// Reference data from files
const STREAMING_SERVICES: StreamingService[] = [
  // STREAMING DE VÍDEO
  { id: 'netflix', name: 'Netflix', category: 'video', description: 'Séries originais e catálogo global.', basicMonthly: 20.90, basicAnnual: null, premiumMonthly: 59.90, premiumAnnual: null },
  { id: 'amazon-prime', name: 'Amazon Prime', category: 'video', description: 'Prime Video + Frete grátis Amazon.', basicMonthly: 19.90, basicAnnual: 166.80, premiumMonthly: null, premiumAnnual: null, annualROI: 30 },
  { id: 'disney', name: 'Disney+', category: 'video', description: 'Disney, Pixar, Marvel e Star.', basicMonthly: 27.99, basicAnnual: 393.90, premiumMonthly: 66.90, premiumAnnual: 561.90, annualROI: 17 },
  { id: 'max', name: 'Max', category: 'video', description: 'Filmes da Warner, HBO e Discovery.', basicMonthly: 29.90, basicAnnual: 226.80, premiumMonthly: 55.90, premiumAnnual: 478.80, annualROI: 37 },
  { id: 'globoplay', name: 'Globoplay', category: 'video', description: 'Nacional, novelas e TV ao vivo.', basicMonthly: 22.90, basicAnnual: 178.80, premiumMonthly: 54.90, premiumAnnual: 478.80, annualROI: 35 },
  { id: 'paramount', name: 'Paramount+', category: 'video', description: 'Paramount e esportes (Libertadores).', basicMonthly: 19.90, basicAnnual: 178.00, premiumMonthly: 34.90, premiumAnnual: 309.00, annualROI: 25 },
  { id: 'apple-tv', name: 'Apple TV+', category: 'video', description: 'Produções originais Apple.', basicMonthly: 29.90, basicAnnual: 299.00, premiumMonthly: null, premiumAnnual: null, annualROI: 17 },
  { id: 'premiere', name: 'Premiere', category: 'video', description: 'Futebol nacional (Brasileirão e Estaduais).', basicMonthly: 59.90, basicAnnual: 358.80, premiumMonthly: null, premiumAnnual: null, annualROI: 50 },
  { id: 'telecine', name: 'Telecine', category: 'video', description: 'Grandes sucessos do cinema.', basicMonthly: 39.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'crunchyroll', name: 'Crunchyroll', category: 'video', description: 'Foco total em animes.', basicMonthly: 14.99, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'dazn', name: 'DAZN', category: 'video', description: 'Esportes e lutas ao vivo.', basicMonthly: 49.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'mubi', name: 'MUBI', category: 'video', description: 'Cinema cult e curadoria de festivais.', basicMonthly: 27.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'starzplay', name: 'Starzplay / Lionsgate+', category: 'video', description: 'Séries e filmes premium internacionais.', basicMonthly: 18.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'discovery', name: 'Discovery+', category: 'video', description: 'Realities e documentários (integrado ao Max).', basicMonthly: 21.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'curiosity', name: 'CuriosityStream', category: 'video', description: 'Documentários e ciência.', basicMonthly: 15.00, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'oldflix', name: 'Oldflix', category: 'video', description: 'Especializado em filmes clássicos.', basicMonthly: 9.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'playplus', name: 'PlayPlus', category: 'video', description: 'Conteúdo da Record e realities nacionais.', basicMonthly: 15.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'looke', name: 'Looke', category: 'video', description: 'Catálogo variado de filmes e séries.', basicMonthly: 16.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'belas-artes', name: 'Belas Artes à La Carte', category: 'video', description: 'Cinema de arte e cult.', basicMonthly: 14.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'filmbox', name: 'FilmBox+', category: 'video', description: 'Filmes internacionais e clássicos.', basicMonthly: 9.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'history', name: 'History Play', category: 'video', description: 'Documentários de história e cultura.', basicMonthly: 14.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'reserva', name: 'Reserva Imovision', category: 'video', description: 'Filmes premiados e de arte.', basicMonthly: 14.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  
  // MÚSICA
  { id: 'youtube-premium', name: 'YouTube Premium', category: 'musica', description: 'YouTube sem anúncios + YouTube Music.', basicMonthly: 24.90, basicAnnual: null, premiumMonthly: 41.90, premiumAnnual: null },
  { id: 'spotify', name: 'Spotify', category: 'musica', description: 'Streaming de música líder.', basicMonthly: 21.90, basicAnnual: null, premiumMonthly: 34.90, premiumAnnual: null },
  { id: 'deezer', name: 'Deezer', category: 'musica', description: 'Streaming de música.', basicMonthly: 21.90, basicAnnual: null, premiumMonthly: 34.90, premiumAnnual: null },
  { id: 'apple-music', name: 'Apple Music', category: 'musica', description: 'Streaming de música Apple.', basicMonthly: 21.90, basicAnnual: null, premiumMonthly: 34.90, premiumAnnual: null },
  
  // SUPER APPS
  { id: 'meli-plus', name: 'Meli+ (Mercado Livre)', category: 'superapps', description: 'Disney+ + Deezer + Frete Grátis.', basicMonthly: 24.90, basicAnnual: null, premiumMonthly: 74.90, premiumAnnual: null },
  { id: 'claro-tv', name: 'Claro TV+ Streamings', category: 'superapps', description: 'Netflix + Disney+ + Max + Globoplay + Prime.', basicMonthly: 79.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  
  // DELIVERY
  { id: 'ifood-clube', name: 'Clube iFood', category: 'delivery', description: 'Frete grátis e cupons iFood.', basicMonthly: 4.95, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'rappi-pro', name: 'Rappi Pro', category: 'delivery', description: 'Frete grátis e benefícios Rappi.', basicMonthly: 9.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  
  // MOBILIDADE
  { id: 'uber-one', name: 'Uber One', category: 'mobilidade', description: 'Descontos e benefícios Uber.', basicMonthly: 19.90, basicAnnual: 198.00, premiumMonthly: null, premiumAnnual: null, annualROI: 17 },
  { id: 'shell-box', name: 'Shell Box', category: 'mobilidade', description: 'Descontos em combustíveis e pontos.', basicMonthly: 0, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  
  // PROFISSIONAL
  { id: 'canva-pro', name: 'Canva Pro', category: 'profissional', description: 'Ferramentas de design ilimitadas.', basicMonthly: 34.90, basicAnnual: 322.90, premiumMonthly: 69.90, premiumAnnual: 619.00, annualROI: 23 },
  { id: 'linkedin', name: 'LinkedIn Premium', category: 'profissional', description: 'Recursos avançados de carreira e cursos.', basicMonthly: 79.90, basicAnnual: 599.00, premiumMonthly: 149.90, premiumAnnual: 1100.00, annualROI: 38 },
  { id: 'hurb', name: 'Hurb Prime', category: 'profissional', description: 'Benefícios e descontos em viagens.', basicMonthly: 9.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  
  // SAÚDE & BEM-ESTAR
  { id: 'wellhub', name: 'Wellhub (ex-Gympass)', category: 'saude', description: 'Ecossistema de bem-estar corporativo.', basicMonthly: 29.90, basicAnnual: null, premiumMonthly: 569.90, premiumAnnual: null },
  { id: 'bluefit', name: 'Bluefit / Smart Fit Gold', category: 'saude', description: 'Acesso a redes de academias.', basicMonthly: 99.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'ciclic', name: 'Ciclic', category: 'saude', description: 'Telemedicina e assistência saúde.', basicMonthly: 19.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'petlove', name: 'Petlove', category: 'saude', description: 'Plano de saúde para pets.', basicMonthly: 49.90, basicAnnual: null, premiumMonthly: 99.90, premiumAnnual: null },
  
  // CLUBES & VAREJO
  { id: 'sams-club', name: 'Sam\'s Club', category: 'clubes', description: 'Clube de compras atacado.', basicMonthly: 14.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'tag-livros', name: 'TAG Livros', category: 'clubes', description: 'Clube de assinatura de livros.', basicMonthly: 59.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
  { id: 'wine', name: 'Wine', category: 'clubes', description: 'Clube de assinatura de vinhos.', basicMonthly: 69.90, basicAnnual: null, premiumMonthly: null, premiumAnnual: null },
];

// ==================== OPTIMIZATION TIPS ====================

interface OptimizationTip {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  savings: string;
  content: React.ReactNode;
}

const OPTIMIZATION_TIPS: OptimizationTip[] = [
  {
    id: 'bundling',
    title: 'Combos ("Bundling")',
    icon: Gift,
    color: 'bg-amber-500',
    savings: 'até R$ 500/ano',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Regra de ouro:</strong> Nunca assine direto pelo site se puder usar um "Hub".
        </p>
        
        <div className="space-y-3">
          <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-emerald-500 text-white">Campeão</Badge>
              <span className="font-semibold">Meli+ (Mercado Livre)</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Custo:</strong> R$ 17,99 a R$ 27,99/mês</li>
              <li>• <strong>Inclui:</strong> Disney+ (c/ anúncios) + Deezer Premium + Frete Grátis</li>
              <li>• <strong>Economia:</strong> Disney+ avulso = R$ 43,90. <span className="text-emerald-500 font-semibold">Mais de 50% de economia!</span></li>
              <li>• <strong>Bônus:</strong> 30% OFF em Max e Paramount+ via ML</li>
            </ul>
          </div>
          
          <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-blue-500 text-white">Volume</Badge>
              <span className="font-semibold">Claro tv+ Streamings</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Custo:</strong> R$ 79,90/mês</li>
              <li>• <strong>Inclui:</strong> Netflix + Disney+ + Max + Globoplay + Prime (todos c/ anúncios)</li>
              <li>• <strong>Economia:</strong> Separados = ~R$ 121,59. <span className="text-emerald-500 font-semibold">R$ 500/ano de economia!</span></li>
            </ul>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <p className="text-xs font-medium mb-1">💡 Operadoras e Cartões</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Vivo Selfie/Fibra:</strong> Planos &gt;R$ 160 podem incluir Netflix ou Prime. Verifique sua fatura!</li>
              <li>• <strong>Amazon Prime Channels:</strong> Útil para centralização, mas canais extras cobram preço cheio.</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'annual-roi',
    title: 'Planos Anuais (ROI)',
    icon: PiggyBank,
    color: 'bg-emerald-500',
    savings: '16% a 50% a.a.',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Tratando assinatura como investimento: pagar à vista garante retorno <strong className="text-foreground">superior à renda fixa (16% a 50%)</strong>, livre de imposto.
        </p>
        
        <div className="grid gap-2">
          {[
            { name: 'Premiere', roi: '50%', price: 'R$ 29,90/mês vs R$ 59,90' },
            { name: 'LinkedIn Premium', roi: '38%', price: 'Anual com mega desconto' },
            { name: 'Max', roi: '37%', price: 'Black Friday pode ter 50% OFF!' },
            { name: 'Globoplay', roi: '35%', price: 'Plano anual compensa' },
            { name: 'Amazon Prime', roi: '30%', price: 'R$ 166,80/ano vs R$ 238,80' },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">{item.name}</span>
              <div className="text-right">
                <Badge className="bg-emerald-500 text-white">{item.roi} ROI</Badge>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">🎯 Dica Black Friday:</strong> A Max costuma oferecer 50% OFF no plano anual. É o único momento em que o custo de oportunidade bate qualquer outra estratégia.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'sharing',
    title: 'Compartilhamento',
    icon: Users,
    color: 'bg-blue-500',
    savings: 'até R$ 32/mês',
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Via Oficial: Membro Extra</h4>
          
          <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">Netflix Membro Extra</span>
              <Badge className="bg-emerald-500 text-white">Vale a pena</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Custo: R$ 12,90/mês. Muito mais barato que nova conta de R$ 44,90. <strong>Economia: R$ 32/mês</strong>
            </p>
          </div>
          
          <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">Disney+ Membro Extra</span>
              <Badge variant="destructive">Não compensa</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Custo: R$ 28,90/mês. É mais caro que o titular assinar o Meli+ sozinho!
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Via "Mercado Cinza" (Kotas / Spliiit)</h4>
          <p className="text-xs text-muted-foreground">Sites que intermediam divisão de grupos familiares.</p>
          
          <div className="grid gap-2">
            <div className="flex items-center gap-2 p-2 bg-red-500/5 rounded-lg border border-red-500/10">
              <span className="text-red-500 text-lg">⚠️</span>
              <span className="text-xs text-muted-foreground">
                <strong>Netflix e Disney+:</strong> Bloqueiam IPs agressivamente. Alta instabilidade.
              </span>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
              <span className="text-emerald-500 text-lg">✅</span>
              <span className="text-xs text-muted-foreground">
                <strong>YouTube Premium Família:</strong> Oficial R$ 41,90 vs Kotas ~R$ 12/mês
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'rotation',
    title: 'Rotação de Ativos',
    icon: RotateCcw,
    color: 'bg-purple-500',
    savings: 'R$ 1.200/ano',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Use a <strong className="text-foreground">falta de fidelidade</strong> a seu favor para evitar "capacidade ociosa" (pagar e não assistir).
        </p>
        
        <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20 space-y-3">
          <h4 className="font-semibold text-sm">🏠 Mantenha a "Base"</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Amazon Prime (R$ 166/ano) - catálogo + frete</li>
            <li>• Meli+ (R$ 17,99/mês) - Disney+ + frete</li>
          </ul>
          
          <h4 className="font-semibold text-sm mt-3">🔄 Rotacione o "Premium"</h4>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="bg-background rounded p-2 text-center">
              <p className="font-semibold text-primary">Jan/Fev</p>
              <p className="text-muted-foreground">Netflix</p>
            </div>
            <div className="bg-background rounded p-2 text-center">
              <p className="font-semibold text-primary">Março</p>
              <p className="text-muted-foreground">Max (Champions)</p>
            </div>
            <div className="bg-background rounded p-2 text-center">
              <p className="font-semibold text-primary">Abril</p>
              <p className="text-muted-foreground">Apple TV+</p>
            </div>
            <div className="bg-background rounded p-2 text-center">
              <p className="font-semibold text-primary">...</p>
              <p className="text-muted-foreground">Repete</p>
            </div>
          </div>
        </div>
        
        <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-500">Resultado</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Apenas 1 premium ativo/vez: ~R$ 50/mês vs R$ 150/mês. <strong>Economia de R$ 1.200/ano!</strong>
          </p>
        </div>
      </div>
    )
  },
];

// ==================== COMPONENT ====================

export const StreamingOptimizerModule: React.FC<StreamingOptimizerModuleProps> = ({ realHourlyRate }) => {
  const [selectedServices, setSelectedServices] = useState<Record<string, number>>({});
  const [expandedCategory, setExpandedCategory] = useState<StreamingCategory | null>('video');
  const [activeTab, setActiveTab] = useState<'selecao' | 'dicas'>('selecao');

  // Toggle service selection
  const toggleService = (id: string, defaultPrice: number) => {
    setSelectedServices(prev => {
      if (prev[id] !== undefined) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: defaultPrice };
    });
  };

  // Update price
  const updatePrice = (id: string, value: number) => {
    setSelectedServices(prev => ({ ...prev, [id]: value }));
  };

  // Group services by category
  const servicesByCategory = useMemo(() => {
    return STREAMING_SERVICES.reduce((acc, service) => {
      if (!acc[service.category]) acc[service.category] = [];
      acc[service.category].push(service);
      return acc;
    }, {} as Record<StreamingCategory, StreamingService[]>);
  }, []);

  // Calculate totals
  const calculations = useMemo(() => {
    const monthlyTotal = Object.values(selectedServices).reduce((sum, v) => sum + v, 0);
    const annualTotal = monthlyTotal * 12;
    const hoursPerYear = annualTotal / realHourlyRate;
    const hoursPerMonth = monthlyTotal / realHourlyRate;
    
    // Potential savings if using combos
    const hasDisneyOrSimilar = selectedServices['disney'] !== undefined || 
                               selectedServices['deezer'] !== undefined ||
                               selectedServices['max'] !== undefined;
    const potentialMeliSaving = hasDisneyOrSimilar ? Math.min(monthlyTotal * 0.3, 50) : 0;
    
    return {
      monthlyTotal,
      annualTotal,
      hoursPerYear,
      hoursPerMonth,
      potentialMeliSaving,
      count: Object.keys(selectedServices).length
    };
  }, [selectedServices, realHourlyRate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center p-4 bg-muted/30 rounded-xl">
        <Tv className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
        <h3 className="font-semibold text-lg">Otimizador de Streamings</h3>
        <p className="text-sm text-muted-foreground">
          Mapeie seus gastos e descubra como economizar
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="selecao" className="gap-2">
            <Check className="h-4 w-4" />
            Minhas Assinaturas
          </TabsTrigger>
          <TabsTrigger value="dicas" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Dicas de Economia
          </TabsTrigger>
        </TabsList>

        {/* SELECTION TAB */}
        <TabsContent value="selecao" className="mt-4 space-y-4">
          {/* Categories */}
          {(Object.keys(CATEGORY_CONFIG) as StreamingCategory[]).map((category) => {
            const config = CATEGORY_CONFIG[category];
            const services = servicesByCategory[category] || [];
            const Icon = config.icon;
            const isExpanded = expandedCategory === category;
            const selectedInCategory = services.filter(s => selectedServices[s.id] !== undefined);
            const categoryTotal = selectedInCategory.reduce((sum, s) => sum + (selectedServices[s.id] || 0), 0);

            return (
              <Collapsible
                key={category}
                open={isExpanded}
                onOpenChange={() => setExpandedCategory(isExpanded ? null : category)}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between bg-card border rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", config.color)}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{config.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {services.length} serviços
                          {selectedInCategory.length > 0 && (
                            <span className="text-primary"> • {selectedInCategory.length} selecionado(s)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {categoryTotal > 0 && (
                        <Badge variant="secondary" className="text-emerald-600">
                          R$ {categoryTotal.toFixed(2)}/mês
                        </Badge>
                      )}
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-2 grid gap-2 p-2 bg-muted/20 rounded-lg">
                    {services.map((service) => {
                      const isSelected = selectedServices[service.id] !== undefined;
                      const currentPrice = selectedServices[service.id] ?? service.basicMonthly;
                      
                      return (
                        <div
                          key={service.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-all",
                            isSelected 
                              ? "bg-primary/5 border-primary/30" 
                              : "bg-card border-border hover:border-primary/20"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleService(service.id, service.basicMonthly)}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{service.name}</span>
                              {service.annualROI && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                        {service.annualROI}% ROI
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Economia ao pagar anual</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                          </div>
                          
                          <div className="shrink-0">
                            {isSelected ? (
                              <MoneyInput
                                value={currentPrice}
                                onChange={(v) => updatePrice(service.id, v)}
                                className="w-24 h-8 text-sm text-right"
                                compact
                              />
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                R$ {service.basicMonthly.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Summary Card */}
          {calculations.count > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-indigo-500" />
                    Resumo dos seus Streamings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-xl">
                      <p className="text-xs text-muted-foreground">Gasto Mensal</p>
                      <p className="text-2xl font-bold text-foreground">
                        R$ {calculations.monthlyTotal.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {calculations.count} assinatura(s)
                      </p>
                    </div>
                    <div className="text-center p-3 bg-amber-500/10 rounded-xl">
                      <p className="text-xs text-muted-foreground">Gasto Anual</p>
                      <p className="text-2xl font-bold text-amber-600">
                        R$ {calculations.annualTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        = {calculations.hoursPerYear.toFixed(1)}h de trabalho
                      </p>
                    </div>
                  </div>
                  
                  {/* CTA to tips */}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setActiveTab('dicas')}
                  >
                    <Lightbulb className="h-4 w-4" />
                    Ver dicas para economizar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Empty State */}
          {calculations.count === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Tv className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Selecione suas assinaturas acima</p>
              <p className="text-xs mt-1">Marque os serviços que você paga atualmente</p>
            </div>
          )}
        </TabsContent>

        {/* TIPS TAB */}
        <TabsContent value="dicas" className="mt-4 space-y-3">
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Estratégias de Otimização</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Aprenda a economizar centenas de reais por ano em suas assinaturas.
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-2">
            {OPTIMIZATION_TIPS.map((tip) => {
              const Icon = tip.icon;
              return (
                <AccordionItem key={tip.id} value={tip.id} className="border rounded-lg overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", tip.color)}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{tip.title}</p>
                        <Badge variant="secondary" className="text-emerald-600 text-xs mt-0.5">
                          {tip.savings}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {tip.content}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StreamingOptimizerModule;
