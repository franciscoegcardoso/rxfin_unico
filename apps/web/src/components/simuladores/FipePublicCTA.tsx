import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Gift, Shield, Users, ArrowRight, Sparkles } from 'lucide-react';

export const FipePublicCTA: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl transform translate-x-16 -translate-y-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl transform -translate-x-8 translate-y-8" />
        
        <CardContent className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            {/* Badge */}
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Gift className="h-3 w-3 mr-1" />
              Oferta Exclusiva - Vagas Limitadas
            </Badge>
            
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bookmark className="h-7 w-7 text-primary" />
            </div>
            
            {/* Headline */}
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
              Gostou da simulação? Salve para consultar depois!
            </h3>
            
            {/* Description */}
            <p className="text-muted-foreground mb-6 max-w-lg">
              Crie sua conta gratuita e tenha acesso ao histórico completo das suas consultas, 
              acompanhe a desvalorização do seu veículo ao longo do tempo e receba alertas personalizados.
            </p>
            
            {/* Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 w-full max-w-lg">
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-background/80 border border-border/50">
                <Bookmark className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-center">Salve suas simulações</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-background/80 border border-border/50">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-center">Acesso vitalício grátis</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-background/80 border border-border/50">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-center">Dados protegidos</span>
              </div>
            </div>
            
            {/* Urgency element */}
            <div className="flex items-center gap-2 mb-6 text-sm">
              <Users className="h-4 w-4 text-amber-600" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Acesso vitalício gratuito</strong> garantido para os primeiros 1.000 usuários
              </span>
            </div>
            
            {/* CTA Button */}
            <Link to="/signup">
              <Button 
                size="lg" 
                className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                Criar Minha Conta Grátis
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            {/* Secondary link */}
            <p className="mt-3 text-xs text-muted-foreground">
              Já tem conta?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Fazer login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
