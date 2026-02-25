import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface OnboardingProfileMenuProps {
  variant?: 'light' | 'dark';
  className?: string;
}

/**
 * Profile menu for onboarding screens
 * Allows users to switch accounts (logout) during onboarding
 * Following best practices from Google, Slack, etc.
 */
export const OnboardingProfileMenu: React.FC<OnboardingProfileMenuProps> = ({
  variant = 'dark',
  className,
}) => {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const userEmail = user.email || '';
  const userName = user.user_metadata?.full_name || userEmail.split('@')[0];
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await signOut();
  };

  const isLight = variant === 'light';

  return (
    <div className={cn('fixed top-4 right-4 z-50', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-2 rounded-full p-1 transition-all',
              'hover:ring-2 hover:ring-offset-2 focus:outline-none focus:ring-2 focus:ring-offset-2',
              isLight 
                ? 'hover:ring-primary focus:ring-primary ring-offset-background' 
                : 'hover:ring-white/50 focus:ring-white/50 ring-offset-transparent'
            )}
            aria-label="Menu do perfil"
          >
            <Avatar className={cn(
              'h-9 w-9 border-2 transition-colors',
              isLight 
                ? 'border-border bg-muted' 
                : 'border-white/20 bg-white/10'
            )}>
              <AvatarFallback className={cn(
                'text-xs font-medium',
                isLight 
                  ? 'bg-muted text-muted-foreground' 
                  : 'bg-white/10 text-white'
              )}>
                {initials || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Trocar de conta</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
