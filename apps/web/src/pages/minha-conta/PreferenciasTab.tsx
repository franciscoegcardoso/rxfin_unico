import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemeSelector } from '@/components/theme/ThemeToggle';

const PreferenciasTab: React.FC = () => {
  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Preferências</CardTitle>
          <CardDescription>
            Personalize a sua experiência no RXFin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>
    </div>
  );
};

export default PreferenciasTab;
