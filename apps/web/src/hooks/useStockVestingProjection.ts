import { useMemo } from 'react';
import { StockVestingConfig, VestingEvent } from '@/types/financial';
import { addMonths, parseISO, format, isBefore, isAfter, differenceInMonths } from 'date-fns';

export interface VestingProjection {
  vestingEvents: VestingEvent[];
  totalGranted: number;
  totalVested: number;
  totalPending: number;
  estimatedTotalValue: number;
  estimatedVestedValue: number;
  estimatedPendingValue: number;
  nextVestingDate: string | null;
  nextVestingQuantity: number;
  vestingProgressPercent: number;
  timeProgressPercent: number;
  monthsUntilFullVesting: number;
}

interface UseStockVestingProjectionProps {
  config: StockVestingConfig | null | undefined;
}

export const useStockVestingProjection = ({ config }: UseStockVestingProjectionProps): VestingProjection | null => {
  return useMemo(() => {
    if (!config) return null;

    const {
      grantDate,
      grantQuantity,
      grantPrice = 0,
      currentStockPrice = grantPrice,
      vestingType,
      cliffMonths = 12,
      vestingPeriodMonths,
      vestedQuantity = 0,
    } = config;

    const grantDateObj = parseISO(grantDate);
    const today = new Date();
    
    // Generate vesting schedule based on vesting type
    const vestingEvents: VestingEvent[] = [];
    
    if (vestingType === 'immediate') {
      // All shares vest immediately
      vestingEvents.push({
        date: grantDate,
        quantity: grantQuantity,
        isVested: true,
        value: grantQuantity * currentStockPrice,
      });
    } else if (vestingType === 'cliff') {
      // All shares vest after cliff period
      const cliffDate = addMonths(grantDateObj, cliffMonths);
      vestingEvents.push({
        date: format(cliffDate, 'yyyy-MM-dd'),
        quantity: grantQuantity,
        isVested: isBefore(cliffDate, today),
        value: grantQuantity * currentStockPrice,
      });
    } else if (vestingType === 'graded') {
      // Graded vesting - typically with cliff followed by monthly/quarterly vesting
      // Standard 4-year vesting with 1-year cliff, then monthly vesting
      const effectiveCliffMonths = cliffMonths || 12;
      const vestingMonths = vestingPeriodMonths || 48;
      
      // Calculate how much vests at cliff
      const cliffPercent = effectiveCliffMonths / vestingMonths;
      const cliffQuantity = Math.floor(grantQuantity * cliffPercent);
      
      // Cliff vesting
      const cliffDate = addMonths(grantDateObj, effectiveCliffMonths);
      vestingEvents.push({
        date: format(cliffDate, 'yyyy-MM-dd'),
        quantity: cliffQuantity,
        isVested: isBefore(cliffDate, today),
        value: cliffQuantity * currentStockPrice,
      });
      
      // Monthly vesting after cliff
      const remainingQuantity = grantQuantity - cliffQuantity;
      const remainingMonths = vestingMonths - effectiveCliffMonths;
      const monthlyQuantity = Math.floor(remainingQuantity / remainingMonths);
      let distributedQuantity = cliffQuantity;
      
      for (let month = 1; month <= remainingMonths; month++) {
        const vestDate = addMonths(cliffDate, month);
        const isLastMonth = month === remainingMonths;
        const quantity = isLastMonth 
          ? grantQuantity - distributedQuantity 
          : monthlyQuantity;
        
        distributedQuantity += quantity;
        
        vestingEvents.push({
          date: format(vestDate, 'yyyy-MM-dd'),
          quantity,
          isVested: isBefore(vestDate, today),
          value: quantity * currentStockPrice,
        });
      }
    }
    
    // Calculate totals
    const totalVested = vestingEvents
      .filter(e => e.isVested)
      .reduce((sum, e) => sum + e.quantity, 0);
    
    const totalPending = grantQuantity - totalVested;
    
    // Find next vesting event
    const pendingEvents = vestingEvents.filter(e => !e.isVested);
    const nextEvent = pendingEvents.length > 0 ? pendingEvents[0] : null;
    
    // Calculate time progress
    const fullVestingDate = addMonths(grantDateObj, vestingPeriodMonths);
    const totalMonths = vestingPeriodMonths;
    const elapsedMonths = Math.min(
      Math.max(0, differenceInMonths(today, grantDateObj)),
      totalMonths
    );
    const timeProgressPercent = (elapsedMonths / totalMonths) * 100;
    
    const monthsUntilFullVesting = Math.max(0, differenceInMonths(fullVestingDate, today));
    
    return {
      vestingEvents,
      totalGranted: grantQuantity,
      totalVested,
      totalPending,
      estimatedTotalValue: grantQuantity * currentStockPrice,
      estimatedVestedValue: totalVested * currentStockPrice,
      estimatedPendingValue: totalPending * currentStockPrice,
      nextVestingDate: nextEvent?.date || null,
      nextVestingQuantity: nextEvent?.quantity || 0,
      vestingProgressPercent: (totalVested / grantQuantity) * 100,
      timeProgressPercent,
      monthsUntilFullVesting,
    };
  }, [config]);
};
