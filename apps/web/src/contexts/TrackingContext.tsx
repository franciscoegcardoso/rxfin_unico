import React, { createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useTrackingParams, type TrackingParams } from '@/hooks/useTrackingParams';
import { useAffiliateReferralTracker } from '@/hooks/useAffiliateReferralTracker';

interface TrackingContextValue {
  trackingParams: TrackingParams;
  getTrackingParams: () => TrackingParams;
}

const TrackingContext = createContext<TrackingContextValue>({
  trackingParams: {},
  getTrackingParams: () => ({}),
});

export const useTracking = () => useContext(TrackingContext);

export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { trackingParams, getTrackingParams } = useTrackingParams(location.search);

  // Record referral when user visits with aff param
  useAffiliateReferralTracker(trackingParams);

  return (
    <TrackingContext.Provider value={{ trackingParams, getTrackingParams }}>
      {children}
    </TrackingContext.Provider>
  );
};
