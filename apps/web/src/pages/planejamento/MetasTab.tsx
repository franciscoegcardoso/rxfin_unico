import React from 'react';
import { MetasDoMesTab } from '@/components/planejamento/MetasDoMesTab';

const MetasTab: React.FC = () => {
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  return <MetasDoMesTab initialMonth={currentMonth} />;
};

export default MetasTab;
