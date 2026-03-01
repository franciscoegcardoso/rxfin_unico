import React, { createContext, useContext, useState, useCallback } from 'react';
import { useUserKV } from '@/hooks/useUserKV';

interface TourContextType {
  isTourActive: boolean;
  startTour: () => void;
  endTour: () => void;
  hasCompletedTour: boolean;
  markTourCompleted: () => void;
  resetTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTourActive, setIsTourActive] = useState(false);
  const { value: hasCompletedTour, setValue: setHasCompletedTour } = useUserKV<boolean>('rxfin_tour_completed', false);

  const startTour = useCallback(() => {
    setIsTourActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsTourActive(false);
  }, []);

  const markTourCompleted = useCallback(() => {
    setHasCompletedTour(true);
    setIsTourActive(false);
  }, [setHasCompletedTour]);

  const resetTour = useCallback(() => {
    setHasCompletedTour(false);
  }, [setHasCompletedTour]);

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        startTour,
        endTour,
        hasCompletedTour,
        markTourCompleted,
        resetTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
