'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { PostHogProvider } from '@/components/PostHogProvider';
import { VisibilityProvider } from '@/contexts/visibility-context';
import { FinancialProvider } from '@/contexts/financial-context';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <PostHogProvider>
          <FinancialProvider>
            <VisibilityProvider>
              <TooltipProvider>
                {children}
                <Toaster richColors position="top-right" />
              </TooltipProvider>
            </VisibilityProvider>
          </FinancialProvider>
          </PostHogProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
