import React from 'react';
import { useFinancial } from '@/contexts/FinancialContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingPersonalInfo } from './OnboardingPersonalInfo';
import { OnboardingSharedPeople } from './OnboardingSharedPeople';
import { OnboardingVehicles } from './OnboardingVehicles';
import { OnboardingIncome } from './OnboardingIncome';
import { OnboardingExpenses } from './OnboardingExpenses';
import { OnboardingExpenseResponsible } from './OnboardingExpenseResponsible';
import { OnboardingDrivers } from './OnboardingDrivers';
import { OnboardingGoals } from './OnboardingGoals';
import { OnboardingComplete } from './OnboardingComplete';

/**
 * Onboarding Flow:
 * 
 * INDIVIDUAL ACCOUNT:
 * 0 - Welcome (choose account type)
 * 1 - Personal Info
 * 2 - Vehicles (register family vehicles)
 * 3 - Drivers (after vehicles, assign main driver per vehicle)
 * 4 - Income (owner)
 * 5 - Expenses
 * 6 - Goals (Sonhos)
 * 7 - Complete
 * 
 * SHARED ACCOUNT:
 * 0 - Welcome (choose account type)
 * 1 - Personal Info
 * 2 - Shared People (configure people who share the account)
 * 3 - Vehicles (register family vehicles)
 * 4 - Drivers (after vehicles, assign main driver per vehicle)
 * 5 - Income (owner)
 * 6 - Income (first shared person) - if exists
 * 7 - Expenses (with payment method, desktop shows responsible too)
 * 8 - Expense Responsible (mobile only) OR Goals (desktop)
 * 9 - Goals (Sonhos) - mobile after expense responsible
 * 10 - Complete
 */
export const Onboarding: React.FC = () => {
  const { currentStep, config } = useFinancial();
  const isMobile = useIsMobile();

  const isSharedAccount = config.accountType === 'shared';
  const sharedPeople = config.sharedWith.filter(p => !p.isOwner);

  // Determine what to render based on step and account type
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <OnboardingWelcome />;
      
      case 1:
        return <OnboardingPersonalInfo />;
      
      case 2:
        // Shared: show shared people config
        // Individual: show vehicles
        if (isSharedAccount) {
          return <OnboardingSharedPeople />;
        }
        return <OnboardingVehicles />;
      
      case 3:
        // Shared: show vehicles (after shared people)
        // Individual: show drivers
        if (isSharedAccount) {
          return <OnboardingVehicles />;
        }
        return <OnboardingDrivers />;
      
      case 4:
        // Shared: show drivers (after vehicles)
        // Individual: show income
        if (isSharedAccount) {
          return <OnboardingDrivers />;
        }
        return <OnboardingIncome />;
      
      case 5:
        // Shared: show owner's income
        // Individual: show expenses
        if (isSharedAccount) {
          return <OnboardingIncome />;
        }
        return <OnboardingExpenses />;
      
      case 6:
        // Shared with shared people: first shared person's income
        // Shared without shared people: expenses
        // Individual: goals
        if (isSharedAccount) {
          if (sharedPeople.length > 0) {
            const firstSharedPerson = sharedPeople[0];
            return <OnboardingIncome personId={firstSharedPerson.id} personName={firstSharedPerson.name} />;
          }
          return <OnboardingExpenses />;
        }
        return <OnboardingGoals />;
      
      case 7:
        // Shared: expenses (if has shared people) or expense responsible (mobile) / goals (desktop)
        // Individual: complete
        if (isSharedAccount) {
          if (sharedPeople.length > 0) {
            return <OnboardingExpenses />;
          }
          if (isMobile) {
            return <OnboardingExpenseResponsible />;
          }
          return <OnboardingGoals />;
        }
        return <OnboardingComplete />;
      
      case 8:
        // Shared: expense responsible (mobile) or goals (desktop)
        if (isSharedAccount) {
          if (sharedPeople.length > 0) {
            if (isMobile) {
              return <OnboardingExpenseResponsible />;
            }
            return <OnboardingGoals />;
          }
          if (isMobile) {
            return <OnboardingGoals />;
          }
          return <OnboardingComplete />;
        }
        return <OnboardingComplete />;
      
      case 9:
        // Shared: goals (mobile after expense responsible) or complete
        if (isSharedAccount) {
          if (sharedPeople.length > 0) {
            if (isMobile) {
              return <OnboardingGoals />;
            }
            return <OnboardingComplete />;
          }
          return <OnboardingComplete />;
        }
        return <OnboardingComplete />;
      
      case 10:
        return <OnboardingComplete />;
      
      default:
        return <OnboardingWelcome />;
    }
  };

  return renderStep();
};
