import React, { useState, useMemo } from 'react';
import { useUserKV } from '@/hooks/useUserKV';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Clock,
  Heart,
  HelpCircle,
  AlertTriangle,
  Timer,
  Calendar,
  Percent,
  Target,
  Sparkles,
  Ban,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Package,
  Repeat,
  CreditCard,
  Brain,
  ShieldQuestion,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ==================== TYPES ====================

type CheckpointAnswer = 'yes' | 'no' | 'unsure' | null;

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  addedAt: Date;
  expiresAt: Date;
}

interface PurchaseModuleProps {
  realHourlyRate: number;
}

// ==================== HELPERS ====================

const formatMoney = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ==================== CHECKPOINT BUTTON ====================

interface CheckpointButtonProps {
  value: CheckpointAnswer;
  target: CheckpointAnswer;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant: 'yes' | 'no' | 'unsure';
}

const CheckpointButton: React.FC<CheckpointButtonProps> = ({ 
  value, target, label, icon, onClick, variant 
}) => {
  const isSelected = value === target;
  
  const variantStyles = {
    yes: isSelected 
      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25' 
      : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10',
    no: isSelected 
      ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25' 
      : 'border-red-500/30 text-red-600 hover:bg-red-500/10',
    unsure: isSelected 
      ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/25' 
      : 'border-amber-500/30 text-amber-600 hover:bg-amber-500/10',
  };
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
        variantStyles[variant]
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
};

// ==================== CHECKPOINT QUESTION ====================

interface CheckpointQuestionProps {
  question: string;
  description: string;
  value: CheckpointAnswer;
  onChange: (answer: CheckpointAnswer) => void;
  icon: React.ReactNode;
  step: number;
}

const CheckpointQuestion: React.FC<CheckpointQuestionProps> = ({
  question, description, value, onChange, icon, step
}) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: step * 0.1 }}
    className="space-y-4 p-4 rounded-2xl bg-gradient-to-br from-background to-muted/30 border border-border"
  >
    <div className="flex items-start gap-3">
      <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-foreground text-lg">{question}</h4>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
    
    <div className="flex gap-2">
      <CheckpointButton
        value={value}
        target="yes"
        label="Sim"
        icon={<CheckCircle2 className="h-5 w-5" />}
        onClick={() => onChange('yes')}
        variant="yes"
      />
      <CheckpointButton
        value={value}
        target="no"
        label="Não"
        icon={<XCircle className="h-5 w-5" />}
        onClick={() => onChange('no')}
        variant="no"
      />
      <CheckpointButton
        value={value}
        target="unsure"
        label="Não sei"
        icon={<HelpCircle className="h-5 w-5" />}
        onClick={() => onChange('unsure')}
        variant="unsure"
      />
    </div>
  </motion.div>
);

// ==================== REFLECTION DIALOG ====================

interface ReflectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (result: { wantIt: CheckpointAnswer; needIt: CheckpointAnswer; needNow: CheckpointAnswer }) => void;
}

const ReflectionDialog: React.FC<ReflectionDialogProps> = ({ open, onOpenChange, onComplete }) => {
  const [wantIt, setWantIt] = useState<CheckpointAnswer>(null);
  const [needIt, setNeedIt] = useState<CheckpointAnswer>(null);
  const [needNow, setNeedNow] = useState<CheckpointAnswer>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const allAnswered = wantIt !== null && needIt !== null && needNow !== null;
  const hasAnyNo = wantIt === 'no' || needIt === 'no' || needNow === 'no';
  const hasAnyUnsure = wantIt === 'unsure' || needIt === 'unsure' || needNow === 'unsure';
  const allYes = wantIt === 'yes' && needIt === 'yes' && needNow === 'yes';

  // Auto-advance steps
  React.useEffect(() => {
    if (wantIt !== null && currentStep === 0) setCurrentStep(1);
    if (needIt !== null && currentStep === 1) setCurrentStep(2);
  }, [wantIt, needIt, currentStep]);

  const handleComplete = () => {
    onComplete({ wantIt, needIt, needNow });
    onOpenChange(false);
    // Reset for next time
    setWantIt(null);
    setNeedIt(null);
    setNeedNow(null);
    setCurrentStep(0);
  };

  const handleClose = () => {
    onOpenChange(false);
    setWantIt(null);
    setNeedIt(null);
    setNeedNow(null);
    setCurrentStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0">
        {/* Animated Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-primary via-primary/90 to-emerald-600 p-6 text-white"
        >
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4"
          >
            <Brain className="h-8 w-8 text-white" />
          </motion.div>
          
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-bold text-white">
              Filtro Anti-Impulso
            </DialogTitle>
            <p className="text-white/80 text-sm mt-1">
              3 perguntas que separam desejo genuíno de armadilha de consumo
            </p>
          </DialogHeader>
          
          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            {[0, 1, 2].map((step) => (
              <motion.div
                key={step}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  step <= currentStep ? "bg-white" : "bg-white/30"
                )}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: step * 0.1 }}
              />
            ))}
          </div>
        </motion.div>

        {/* Questions */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {currentStep >= 0 && (
              <CheckpointQuestion
                key="want"
                question="Eu realmente quero isso?"
                description="É algo que você deseja genuinamente ou é impulso?"
                value={wantIt}
                onChange={setWantIt}
                icon={<Heart className="h-5 w-5 text-primary" />}
                step={0}
              />
            )}
            
            {currentStep >= 1 && (
              <CheckpointQuestion
                key="need"
                question="Eu realmente preciso disso?"
                description="Resolve um problema real na sua vida?"
                value={needIt}
                onChange={setNeedIt}
                icon={<Target className="h-5 w-5 text-primary" />}
                step={1}
              />
            )}
            
            {currentStep >= 2 && (
              <CheckpointQuestion
                key="now"
                question="Preciso disso agora?"
                description="É urgente ou pode esperar?"
                value={needNow}
                onChange={setNeedNow}
                icon={<Timer className="h-5 w-5 text-primary" />}
                step={2}
              />
            )}
          </AnimatePresence>

          {/* Result Messages */}
          <AnimatePresence>
            {hasAnyNo && allAnswered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
                  <div>
                    <p className="font-bold text-red-600 dark:text-red-400">
                      ⚠️ Armadilha de Consumo Detectada!
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Você disse "Não" a pelo menos uma pergunta. Reconsidere antes de comprar.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {hasAnyUnsure && !hasAnyNo && allAnswered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
              >
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-6 w-6 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-bold text-amber-600 dark:text-amber-400">
                      🤔 Sugestão: Adicione à Wishlist
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Se não tem certeza, espere 48h para refletir antes de decidir.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {allYes && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="h-6 w-6 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      ✅ Compra Consciente Aprovada!
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Você passou no filtro. Agora calcule o impacto real em horas de vida.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {allAnswered && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border-t bg-muted/30"
          >
            <Button 
              onClick={handleComplete} 
              className="w-full gap-2"
              variant={hasAnyNo ? "destructive" : allYes ? "default" : "secondary"}
            >
              {hasAnyNo && <><Ban className="h-4 w-4" /> Entendi, vou repensar</>}
              {hasAnyUnsure && !hasAnyNo && <><Plus className="h-4 w-4" /> Continuar para Wishlist</>}
              {allYes && <><Sparkles className="h-4 w-4" /> Simular Compra</>}
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ==================== MAIN COMPONENT ====================

export const PurchaseConsciousnessModule: React.FC<PurchaseModuleProps> = ({ 
  realHourlyRate 
}) => {
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Checkpoint results (after dialog)
  const [checkpointResult, setCheckpointResult] = useState<{
    wantIt: CheckpointAnswer;
    needIt: CheckpointAnswer;
    needNow: CheckpointAnswer;
  } | null>(null);
  
  // Purchase details
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState(0);
  
  // Durable goods
  const [isDurable, setIsDurable] = useState(false);
  const [lifeYears, setLifeYears] = useState(3);
  const [usesPerWeek, setUsesPerWeek] = useState(3);
  
  // Installments
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState(12);
  const [interestRate, setInterestRate] = useState(2.5);
  
  // Wishlist - persisted via useUserKV
  const { value: wishlistRaw, setValue: setWishlistRaw } = useUserKV<WishlistItem[]>('purchase-wishlist', []);
  
  const wishlist = useMemo(() => wishlistRaw.map((item: any) => ({
    ...item,
    addedAt: new Date(item.addedAt),
    expiresAt: new Date(item.expiresAt),
  })), [wishlistRaw]);
  
  const saveWishlist = (items: WishlistItem[]) => {
    setWishlistRaw(items);
  };
  
  // Check checkpoint results
  const hasAnyNo = checkpointResult?.wantIt === 'no' || 
                   checkpointResult?.needIt === 'no' || 
                   checkpointResult?.needNow === 'no';
  const hasAnyUnsure = !hasAnyNo && (
    checkpointResult?.wantIt === 'unsure' || 
    checkpointResult?.needIt === 'unsure' || 
    checkpointResult?.needNow === 'unsure'
  );
  const allYes = checkpointResult?.wantIt === 'yes' && 
                 checkpointResult?.needIt === 'yes' && 
                 checkpointResult?.needNow === 'yes';
  
  // Calculations
  const calculations = useMemo(() => {
    if (realHourlyRate <= 0 || price <= 0) return null;
    
    const lifeHours = price / realHourlyRate;
    const workDays = lifeHours / 8;
    
    let costPerUse = 0;
    let totalUses = 0;
    if (isDurable && lifeYears > 0 && usesPerWeek > 0) {
      totalUses = lifeYears * 52 * usesPerWeek;
      costPerUse = price / totalUses;
    }
    
    let totalWithInterest = price;
    let interestPaid = 0;
    let hoursLostToInterest = 0;
    if (isInstallment && installments > 1 && interestRate > 0) {
      const monthlyRate = interestRate / 100;
      const pmt = (price * monthlyRate * Math.pow(1 + monthlyRate, installments)) / 
                  (Math.pow(1 + monthlyRate, installments) - 1);
      totalWithInterest = pmt * installments;
      interestPaid = totalWithInterest - price;
      hoursLostToInterest = interestPaid / realHourlyRate;
    }
    
    return {
      lifeHours,
      workDays,
      costPerUse,
      totalUses,
      totalWithInterest,
      interestPaid,
      hoursLostToInterest,
      installmentValue: isInstallment ? totalWithInterest / installments : 0,
    };
  }, [price, realHourlyRate, isDurable, lifeYears, usesPerWeek, isInstallment, installments, interestRate]);
  
  const addToWishlist = () => {
    if (!itemName || price <= 0) return;
    
    const now = new Date();
    const expires = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    
    const newItem: WishlistItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: itemName,
      price,
      addedAt: now,
      expiresAt: expires,
    };
    
    saveWishlist([...wishlist, newItem]);
    setItemName('');
    setPrice(0);
    setCheckpointResult(null);
  };
  
  const removeFromWishlist = (id: string) => {
    saveWishlist(wishlist.filter(item => item.id !== id));
  };
  
  const isReflectionComplete = (item: WishlistItem) => {
    return new Date() >= item.expiresAt;
  };
  
  const resetForm = () => {
    setItemName('');
    setPrice(0);
    setCheckpointResult(null);
    setIsDurable(false);
    setIsInstallment(false);
  };

  const handleDialogComplete = (result: { wantIt: CheckpointAnswer; needIt: CheckpointAnswer; needNow: CheckpointAnswer }) => {
    setCheckpointResult(result);
  };

  return (
    <div className="space-y-6">
      {/* Reflection Dialog */}
      <ReflectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onComplete={handleDialogComplete}
      />

      {/* Header with CTA Button */}
      <div className="text-center">
        <div className="bg-gradient-to-br from-emerald-500/10 to-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <ShoppingBag className="h-7 w-7 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Poder de Compra Consciente</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Sua hora vale {formatMoney(realHourlyRate)}. Cada compra é tempo de vida.
        </p>
      </div>

      {/* Main CTA Button - Persuasive */}
      {!checkpointResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-emerald-500/20 to-primary/20 blur-2xl rounded-3xl" />
          <Button
            onClick={() => setDialogOpen(true)}
            size="lg"
            className="relative w-full h-auto py-6 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 shadow-xl shadow-primary/25 group"
          >
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="bg-white/20 p-3 rounded-xl"
              >
                <ShieldQuestion className="h-7 w-7 text-white" />
              </motion.div>
              <div className="text-left">
                <span className="block text-lg font-bold">Filtro Anti-Impulso</span>
                <span className="block text-sm text-white/80 font-normal">
                  3 perguntas antes de qualquer compra
                </span>
              </div>
            </div>
          </Button>
        </motion.div>
      )}

      {/* Alert for "No" answers */}
      <AnimatePresence>
        {hasAnyNo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="bg-red-500/10 p-3 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-600 dark:text-red-400 mb-1">
                      ⚠️ Armadilha de Consumo Detectada!
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Você respondeu "Não" a pelo menos uma pergunta. <strong>Pare, respire e reconsidere.</strong>
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 border-red-500/30 text-red-600 hover:bg-red-500/10"
                      onClick={resetForm}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancelar esta compra
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Unsure - Wishlist */}
      <AnimatePresence>
        {hasAnyUnsure && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="bg-amber-500/10 p-3 rounded-xl">
                    <HelpCircle className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-amber-600 dark:text-amber-400 mb-1">
                      🤔 Precisa de tempo para refletir?
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Adicione à <strong>Wishlist de Reflexão</strong>. Após 48h, decida com calma.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">O que é?</Label>
                          <Input
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="Ex: Fone Bluetooth"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Quanto custa?</Label>
                          <MoneyInput
                            value={price}
                            onChange={setPrice}
                            placeholder="0,00"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={addToWishlist}
                          disabled={!itemName || price <= 0}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar à Wishlist
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={resetForm}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* All Yes - Simulation */}
      <AnimatePresence>
        {allYes && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-4"
          >
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-emerald-500/10 p-2 rounded-lg">
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">✅ Checkpoint aprovado!</h4>
                    <p className="text-sm text-muted-foreground">Simule o impacto real.</p>
                  </div>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={resetForm}>
                    Limpar
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">O que você quer comprar?</Label>
                      <Input
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="Ex: iPhone 15"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor</Label>
                      <MoneyInput
                        value={price}
                        onChange={setPrice}
                        placeholder="0,00"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm">Bem durável?</Label>
                      </div>
                      <Switch checked={isDurable} onCheckedChange={setIsDurable} />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm">Parcelado?</Label>
                      </div>
                      <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isDurable && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Vida útil (anos)
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            value={lifeYears}
                            onChange={(e) => setLifeYears(Math.max(1, Number(e.target.value) || 1))}
                            className="mt-1 text-center"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Repeat className="h-3 w-3" /> Usos por semana
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={usesPerWeek}
                            onChange={(e) => setUsesPerWeek(Math.max(1, Number(e.target.value) || 1))}
                            className="mt-1 text-center"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <AnimatePresence>
                    {isInstallment && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <CreditCard className="h-3 w-3" /> Parcelas
                          </Label>
                          <Input
                            type="number"
                            min={2}
                            max={48}
                            value={installments}
                            onChange={(e) => setInstallments(Math.max(2, Number(e.target.value) || 2))}
                            className="mt-1 text-center"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Percent className="h-3 w-3" /> Juros ao mês (%)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={20}
                            step={0.1}
                            value={interestRate}
                            onChange={(e) => setInterestRate(Math.max(0, Number(e.target.value) || 0))}
                            className="mt-1 text-center"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
            
            {/* Results */}
            {calculations && price > 0 && (
              <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-emerald-500/5">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Custo em Vida
                  </h4>
                  
                  <div className="grid gap-4 sm:grid-cols-2 mb-4">
                    <div className="bg-background rounded-xl p-4 border border-border text-center">
                      <p className="text-sm text-muted-foreground mb-1">Horas de Vida</p>
                      <p className="text-3xl font-bold text-primary">
                        {calculations.lifeHours.toFixed(1)}h
                      </p>
                    </div>
                    <div className="bg-background rounded-xl p-4 border border-border text-center">
                      <p className="text-sm text-muted-foreground mb-1">Dias Úteis</p>
                      <p className="text-3xl font-bold text-foreground">
                        {calculations.workDays.toFixed(1)} dias
                      </p>
                    </div>
                  </div>
                  
                  {isDurable && calculations.costPerUse > 0 && (
                    <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 mb-4">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-emerald-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Custo por Uso</p>
                          <p className="text-xl font-bold text-emerald-500">
                            {formatMoney(calculations.costPerUse)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {calculations.totalUses.toLocaleString('pt-BR')} usos em {lifeYears} anos
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {isInstallment && calculations.interestPaid > 0 && (
                    <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                      <div className="flex items-start gap-3">
                        <CreditCard className="h-5 w-5 text-red-500 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Juros Pagos</p>
                          <p className="text-xl font-bold text-red-500">
                            {formatMoney(calculations.interestPaid)}
                          </p>
                          <div className="mt-2 p-2 bg-red-500/10 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                              ⏰ {calculations.hoursLostToInterest.toFixed(1)} horas de vida perdidas em juros!
                            </p>
                          </div>
                          <div className="mt-3 text-sm text-muted-foreground">
                            <p>Total: {formatMoney(calculations.totalWithInterest)}</p>
                            <p>{installments}x de {formatMoney(calculations.installmentValue)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Wishlist */}
      {wishlist.length > 0 && (
        <Card className="border-border">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5 text-amber-500" />
              Wishlist de Reflexão
            </h4>
            
            <div className="space-y-3">
              {wishlist.map((item) => {
                const complete = isReflectionComplete(item);
                const hoursRemaining = Math.max(0, (item.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
                
                return (
                  <div 
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border",
                      complete 
                        ? "bg-emerald-500/5 border-emerald-500/20" 
                        : "bg-muted/50 border-border"
                    )}
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{formatMoney(item.price)}</p>
                      {complete ? (
                        <p className="text-xs text-emerald-500 mt-1">
                          ✅ Período de reflexão completo!
                        </p>
                      ) : (
                        <p className="text-xs text-amber-500 mt-1">
                          ⏳ Aguarde mais {hoursRemaining.toFixed(0)}h
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromWishlist(item.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PurchaseConsciousnessModule;
