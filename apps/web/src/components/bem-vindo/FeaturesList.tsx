import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Feature {
  name: string;
  included: boolean;
  category: string;
}

interface FeaturesListProps {
  features: Feature[];
  title: string;
  showIncluded?: boolean;
  showExcluded?: boolean;
  variant?: 'included' | 'excluded' | 'mixed';
}

export const FeaturesList: React.FC<FeaturesListProps> = ({
  features,
  title,
  showIncluded = true,
  showExcluded = true,
  variant = 'mixed',
}) => {
  const filteredFeatures = features.filter(f => {
    if (variant === 'included') return f.included;
    if (variant === 'excluded') return !f.included;
    return true;
  });

  // Group by category
  const grouped = filteredFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  if (filteredFeatures.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className={cn(
        "text-lg font-semibold",
        variant === 'excluded' ? "text-muted-foreground" : "text-foreground"
      )}>
        {title}
      </h3>
      
      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(grouped).map(([category, categoryFeatures], categoryIndex) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.1 }}
            className={cn(
              "p-4 rounded-xl border",
              variant === 'excluded' 
                ? "bg-muted/30 border-border/50" 
                : "bg-card border-border"
            )}
          >
            <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              {category}
            </h4>
            <ul className="space-y-2">
              {categoryFeatures.map((feature, index) => (
                <motion.li
                  key={feature.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="flex items-center gap-2 text-sm"
                >
                  {feature.included ? (
                    <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  <span className={cn(
                    feature.included ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {feature.name}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
