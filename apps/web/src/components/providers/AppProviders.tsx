'use client'

import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ImpersonationProvider } from '@/contexts/ImpersonationContext'
import { FinancialProvider } from '@/contexts/FinancialContext'
import { VisibilityProvider } from '@/contexts/VisibilityContext'
import { TourProvider } from '@/contexts/TourContext'
import { TrackingProvider } from '@/contexts/TrackingContext'
import { SyncProvider } from '@/contexts/SyncContext'
import { AccountPendingChangesProvider } from '@/contexts/AccountPendingChangesContext'
import { AdminPendingChangesProvider } from '@/contexts/AdminPendingChangesContext'

/**
 * Ordem: providers gerais (auth) por fora, específicos por dentro.
 * TooltipProvider (Radix) necessário para qualquer página que use Tooltip.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AuthProvider>
        <ImpersonationProvider>
          <FinancialProvider>
            <VisibilityProvider>
              <TourProvider>
                <TrackingProvider>
                  <SyncProvider>
                    <AccountPendingChangesProvider>
                      <AdminPendingChangesProvider>
                        {children}
                      </AdminPendingChangesProvider>
                    </AccountPendingChangesProvider>
                  </SyncProvider>
                </TrackingProvider>
              </TourProvider>
            </VisibilityProvider>
          </FinancialProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </TooltipProvider>
  )
}
