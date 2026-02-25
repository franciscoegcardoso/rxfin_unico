import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Rocket, 
  Sparkles,
  Bell,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ComingSoonProps {
  featureName?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ featureName }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* Animated Icon */}
        <motion.div
          className="relative mx-auto mb-8 w-32 h-32"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Background glow */}
          <motion.div
            className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Main icon container */}
          <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl border border-primary/20 backdrop-blur-sm">
            <motion.div
              animate={{ 
                y: [0, -8, 0],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Rocket className="h-16 w-16 text-primary" />
            </motion.div>
            
            {/* Sparkles decoration */}
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ 
                rotate: [0, 15, -15, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles className="h-6 w-6 text-amber-500" />
            </motion.div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Em Construção
          </h1>
          
          <p className="text-muted-foreground mb-2">
            {featureName ? (
              <>A funcionalidade <span className="font-semibold text-foreground">{featureName}</span> está sendo preparada para você.</>
            ) : (
              <>Esta funcionalidade está sendo preparada para você.</>
            )}
          </p>
          
          <p className="text-sm text-muted-foreground/80 mb-8">
            Estamos trabalhando para trazer algo incrível. Fique ligado!
          </p>
        </motion.div>

        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-8"
        >
          <Card className="p-4 bg-card/50 backdrop-blur-sm border-primary/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium">Lançamento em breve</p>
                <p className="text-xs text-muted-foreground">Novas funcionalidades a caminho</p>
              </div>
            </div>
            
            {/* Animated progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '75%' }}
                transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
              />
            </div>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center"
        >
          <Button
            onClick={() => navigate('/simuladores')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Ver simuladores
          </Button>
        </motion.div>

        {/* Notification hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-xs text-muted-foreground flex items-center justify-center gap-1.5"
        >
          <Bell className="h-3 w-3" />
          Você será notificado quando estiver disponível
        </motion.p>
      </motion.div>
    </div>
  );
};

export default ComingSoon;
