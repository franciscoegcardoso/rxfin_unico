import React from 'react';
import { motion } from 'framer-motion';
import { SimulatorFeatureCard } from './SimulatorFeatureCard';
import type { CategoryConfig } from './simulatorCategories';
import type { SimulatorItem } from '@/hooks/usePublicSimulators';

interface SimulatorCategorySectionProps {
  category: CategoryConfig;
  simulatorMap: Map<string, SimulatorItem>;
  isAdmin: boolean;
  onNavigate?: (slug: string, title: string, path: string) => void;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const SimulatorCategorySection: React.FC<SimulatorCategorySectionProps> = ({
  category,
  simulatorMap,
  isAdmin,
  onNavigate,
}) => {
  const color = category.color ?? {
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
    headerBorder: 'border-primary/20',
  };

  return (
    <section>
      {/* Category description — clean, minimal */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-4"
      >
        <p className="text-sm text-muted-foreground">
          {category.description}
        </p>
      </motion.div>

      <motion.div
        className="flex flex-col gap-3 lg:gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {category.cards.map((card) => {
          const sim = simulatorMap.get(card.slug);
          const isComingSoon = sim ? (isAdmin ? false : !sim.is_active_users) : true;
          // Build new nested URL: /simuladores/{category}/{slug}
          const nestedPath = `/simuladores/${category.id}/${card.slug}`;

          return (
            <SimulatorFeatureCard
              key={card.slug}
              config={card}
              path={nestedPath}
              iconName={sim?.icon}
              isComingSoon={isComingSoon}
              categoryColor={color}
              onNavigate={
                !isComingSoon
                  ? () => onNavigate?.(card.slug, card.title, nestedPath)
                  : undefined
              }
            />
          );
        })}
      </motion.div>
    </section>
  );
};
