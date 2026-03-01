import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ConsolidatedSection } from '@/components/bens/ConsolidatedSection';

const ConsolidadoTab: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigate = (tab: string) => {
    navigate(`/bens-investimentos/${tab}`);
  };

  return <ConsolidatedSection onNavigate={handleNavigate} />;
};

export default ConsolidadoTab;
