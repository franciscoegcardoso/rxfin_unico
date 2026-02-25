import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface WelcomeLayoutProps {
  children: React.ReactNode;
  planName: string;
  planSlug: string;
  showConfetti?: boolean;
}

export const WelcomeLayout: React.FC<WelcomeLayoutProps> = ({
  children,
  planName,
  planSlug,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container max-w-5xl mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {children}

          {/* Footer CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center pt-8 border-t border-border/50"
          >
            <Link to="/dashboard">
              <Button size="lg" className="gap-2">
                Começar a usar agora
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
