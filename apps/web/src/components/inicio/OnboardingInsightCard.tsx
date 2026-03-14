import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStartRaioX } from '@/hooks/useStartRaioX';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const OnboardingInsightCard: React.FC = () => {
  const { user } = useAuth();
  const { handleStartRaioX } = useStartRaioX();

  const { data: insight } = useQuery({
    queryKey: ['onboarding-insight', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_onboarding_contextual_insight', { p_user_id: user!.id });
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Don't show if AI insight should take over or no data
  if (!insight || insight.use_ai_insight === true) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-sm">
        <CardContent className="py-5 px-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
              {insight.icon || '🎯'}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <h3 className="font-semibold text-base text-foreground">
                {insight.title || 'Conheça a ferramenta'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight.text || 'Você está vendo dados de demonstração. Comece seu Raio-X Financeiro para ver SEUS números aqui.'}
              </p>
              <Button
                size="sm"
                className="mt-1 gap-1.5 btn-onboarding-cta"
                style={{ animationDelay: '2s' }}
                onClick={() => handleStartRaioX('cta_card')}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {insight.cta_text || 'Começar meu Raio-X'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
