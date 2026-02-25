import { toast } from 'sonner';
import { Rocket, Sparkles } from 'lucide-react';

interface ShowComingSoonToastOptions {
  featureName?: string;
}

export const showComingSoonToast = ({ featureName }: ShowComingSoonToastOptions = {}) => {
  toast.custom(
    (t) => (
      <div className="flex items-start gap-3 bg-card border border-primary/20 rounded-lg p-4 shadow-lg max-w-sm animate-in slide-in-from-right-full">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
          <Rocket className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-semibold text-foreground text-sm">Em breve!</p>
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {featureName ? (
              <><span className="font-medium text-foreground">{featureName}</span> está sendo preparada. Fique ligado!</>
            ) : (
              <>Esta funcionalidade está sendo preparada. Fique ligado!</>
            )}
          </p>
        </div>
      </div>
    ),
    {
      duration: 3000,
      position: 'top-center',
    }
  );
};
