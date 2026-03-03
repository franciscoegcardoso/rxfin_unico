import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useSubscriptionPermissions } from '@/hooks/useSubscriptionPermissions';
import { useFeaturePreferences } from '@/hooks/useFeaturePreferences';
import { LucideIcon, Home, PiggyBank, FileText, Receipt, Wallet, TrendingUp, CalendarRange, Calendar, Target, Settings2, User, Crown, Car, CreditCard } from 'lucide-react';
import { getIconComponent } from '@/lib/iconMap';

export interface NavPage {
  id: string;
  slug: string;
  title: string;
  path: string;
  icon: string | null;
  access_level: string;
  is_active_users: boolean;
  show_when_unavailable: boolean;
  min_plan_slug: string | null;
  order_in_group: number | null;
  group_id: string | null;
  group_slug: string | null;
  group_name: string | null;
  group_icon: string | null;
  group_order: number | null;
}

export interface NavGroup {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  order_index: number | null;
  pages: NavPage[];
}

export interface NavMenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  isLocked?: boolean;      // Locked due to plan restrictions
  isComingSoon?: boolean;  // Page is disabled (is_active_users = false)
  accessLevel: string;
  canAccessAsAdmin?: boolean; // Admin can bypass coming soon restriction
}

export interface NavMenuSection {
  title: string;
  slug: string;
  icon: LucideIcon;
  items: NavMenuItem[];
  hasLockedItems?: boolean;
  hasComingSoonItems?: boolean;
}

interface NavMenuData {
  mainItems: NavMenuItem[];
  groupedSections: NavMenuSection[];
  isLoading: boolean;
  error: Error | null;
}

// Slug do grupo cujas páginas aparecem como itens principais no menu (não em dropdowns)
// Gerenciado via Admin > Páginas — basta mover/adicionar páginas ao grupo "Menu Principal"
const MAIN_NAV_GROUP_SLUG = 'menu-principal';

// Slugs de grupos que NÃO devem aparecer como dropdowns no menu
// (menu-principal já é tratado separadamente, administracao tem acesso dedicado)
const EXCLUDED_NAV_GROUP_SLUGS = ['menu-principal', 'administracao'];

// Slugs de páginas que NÃO devem aparecer nos menus (hubs de navegação internos; alertas/notificações acessíveis via sino no top bar; itens removidos do Planejamento)
// Slugs de páginas que NÃO devem aparecer nos menus
const HIDDEN_PAGE_SLUGS = ['configuracoes', 'hub-configuracoes', 'configuracoes-hub', 'simuladores', 'contas', 'fluxo-financeiro', 'seguros', 'dashboard', 'metas-mensais', 'planos', 'historico-pagamentos', 'alertas', 'notificacoes', 'recorrentes', 'relatorio-financeiro', 'financeiro', 'tendencias-gastos', 'tendencia-gastos', 'dados', 'dados-financeiros'];

// Títulos de páginas que NÃO devem aparecer no menu (independente do slug no banco)
const HIDDEN_PAGE_TITLES = ['Relatório Financeiro', 'Tendências de Gastos', 'Tendência de Gastos', 'Despesas Recorrentes'];

function isPageHiddenFromMenu(page: { slug: string; title: string }): boolean {
  if (HIDDEN_PAGE_SLUGS.includes(page.slug)) return true;
  const titleNorm = page.title?.trim() ?? '';
  if (HIDDEN_PAGE_TITLES.some(t => t === titleNorm)) return true;
  return false;
}

/**
 * Fallback estático para quando o banco de dados está vazio (ex: ambiente de staging não populado).
 * Só é usado quando a query retorna 0 resultados. Garante navegação básica funcional.
 */
function getStaticFallbackItems(): { mainItems: NavMenuItem[]; groupedSections: NavMenuSection[] } {
  const mainItems: NavMenuItem[] = [
    { path: '/inicio', label: 'Início', icon: Home, accessLevel: 'free', canAccessAsAdmin: true },
    { path: '/bens-investimentos', label: 'Bens e Investimentos', icon: PiggyBank, accessLevel: 'free', canAccessAsAdmin: true },
    { path: '/lancamentos', label: 'Lançamentos', icon: Receipt, accessLevel: 'free', canAccessAsAdmin: true },
    { path: '/meu-ir', label: 'Meu IR', icon: FileText, accessLevel: 'free', canAccessAsAdmin: true },
  ];

  const groupedSections: NavMenuSection[] = [
    {
      title: 'Planejamento', slug: 'planejamento', icon: CalendarRange, items: [
        { path: '/planejamento', label: 'Planejamento Mensal', icon: Calendar, accessLevel: 'free', canAccessAsAdmin: true },
        { path: '/planejamento-anual', label: 'Planejamento Anual', icon: CalendarRange, accessLevel: 'free', canAccessAsAdmin: true },
        { path: '/planejamento?tab=metas', label: 'Metas Mensais', icon: Target, accessLevel: 'free', canAccessAsAdmin: true },
      ],
    },
    {
      title: 'Configurações', slug: 'configuracoes', icon: Settings2, items: [
        { path: '/minha-conta', label: 'Minha Conta', icon: User, accessLevel: 'free', canAccessAsAdmin: true },
        { path: '/assinatura', label: 'Assinatura', icon: Crown, accessLevel: 'free', canAccessAsAdmin: true },
      ],
    },
  ];

  return { mainItems, groupedSections };
}

/**
 * Hook principal para navegação dinâmica
 * Consulta o banco de dados e retorna todas as páginas, marcando as inativas como "coming soon"
 */
export function useNavMenuPages(): NavMenuData {
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { impersonatedRole, isImpersonating } = useImpersonation();
  const { subscriptionRole, hasRoutePermission } = useSubscriptionPermissions();
  const { isRouteEnabled } = useFeaturePreferences();
  
  // Only consider admin bypass when we're SURE they are admin (confirmed and not loading)
  const confirmedAdmin = !adminLoading && isAdmin === true;

  // Effective admin for UX/permissions must respect impersonation:
  // - Real admin NOT impersonating → full admin view
  // - Real admin impersonating as 'admin' → full admin view
  // - Real admin impersonating other roles → see that role's view
  const effectiveAdmin = confirmedAdmin && (!isImpersonating || impersonatedRole === 'admin');
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['nav-menu-pages', user?.id, subscriptionRole, isAdmin],
    queryFn: async () => {
      // Buscar TODAS as páginas (ativas e inativas) com informações do grupo
      const { data: pages, error: pagesError } = await supabase
        .from('pages')
        .select(`
          id,
          slug,
          title,
          path,
          icon,
          access_level,
          is_active_users,
          show_when_unavailable,
          min_plan_slug,
          order_in_group,
          group_id,
          page_groups (
            id,
            name,
            slug,
            icon,
            order_index
          )
        `)
        .order('order_in_group', { ascending: true });
      
      if (pagesError) throw pagesError;
      
      // Transformar dados para incluir informações do grupo inline
      const transformedPages: NavPage[] = (pages || []).map((page: any) => ({
        id: page.id,
        slug: page.slug,
        title: page.title,
        path: page.path,
        icon: page.icon,
        access_level: page.access_level,
        is_active_users: page.is_active_users,
        show_when_unavailable: page.show_when_unavailable ?? true, // Default to true for backward compat
        min_plan_slug: page.min_plan_slug,
        order_in_group: page.order_in_group,
        group_id: page.group_id,
        group_slug: page.page_groups?.slug || null,
        group_name: page.page_groups?.name || null,
        group_icon: page.page_groups?.icon || null,
        group_order: page.page_groups?.order_index || null,
      }));
      
      return transformedPages;
    },
    enabled: true, // Sempre ativo, mesmo sem usuário logado (para páginas públicas)
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    refetchOnWindowFocus: false,
  });

  // Processar dados para retornar estrutura de navegação
  const pages = data || [];
  
  // Fallback: se o banco retornou 0 resultados (staging não populado), usar itens estáticos
  if (!isLoading && !error && pages.length === 0) {
    const fallback = getStaticFallbackItems();
    return {
      mainItems: fallback.mainItems,
      groupedSections: fallback.groupedSections,
      isLoading: false,
      error: null,
    };
  }
  
  // Itens do menu principal: páginas do grupo "Menu Principal" (gerenciado via Admin)
  const seenMainPaths = new Set<string>();
  const mainItems: NavMenuItem[] = pages
    .filter(page => page.group_slug === MAIN_NAV_GROUP_SLUG)
    .filter(page => !isPageHiddenFromMenu(page))
    .filter(page => effectiveAdmin || isRouteEnabled(page.path)) // Admin bypasses feature preferences
    // Filter out unavailable pages that shouldn't be shown (unless admin)
    .filter(page => {
      if (page.is_active_users) return true; // Available pages always show
      if (effectiveAdmin) return true; // Admin sees everything
      return page.show_when_unavailable; // Unavailable pages only show if configured
    })
    // Ordenar pelo order_in_group do banco (não mais pelo índice estático)
    .sort((a, b) => (a.order_in_group ?? 99) - (b.order_in_group ?? 99))
    .filter(page => {
      if (seenMainPaths.has(page.path)) return false;
      seenMainPaths.add(page.path);
      return true;
    })
    .map(page => {
      // For effective admins, treat unavailable pages as available (no "Em breve" visual state)
      const rawComingSoon = !page.is_active_users;
      const isComingSoon = effectiveAdmin ? false : rawComingSoon;
      const isLocked = effectiveAdmin ? false : (!isComingSoon && !hasRoutePermission(page.path));
      
      return {
        path: page.path,
        label: page.title,
        icon: getIconComponent(page.icon),
        isLocked,
        isComingSoon,
        accessLevel: page.access_level,
        // Admin can click through "coming soon" pages
        canAccessAsAdmin: effectiveAdmin,
      };
    });
  
  // Paths already in main nav must not appear again in dropdowns (evita duplicata no menu)
  const mainPathsSet = new Set(mainItems.map(m => m.path));

  // Agrupar páginas por grupo para dropdowns
  const groupsMap = new Map<string, NavGroup>();
  
  pages
    .filter(page => page.group_slug && !EXCLUDED_NAV_GROUP_SLUGS.includes(page.group_slug))
    .filter(page => !mainPathsSet.has(page.path)) // Não mostrar em dropdown se já está no menu principal
    .filter(page => !isPageHiddenFromMenu(page)) // Exclude hub pages and hidden titles from menu
    .filter(page => effectiveAdmin || isRouteEnabled(page.path)) // Admin bypasses feature preferences
    // Filter out unavailable pages that shouldn't be shown (unless admin)
    .filter(page => {
      if (page.is_active_users) return true; // Available pages always show
      if (effectiveAdmin) return true; // Admin sees everything
      return page.show_when_unavailable; // Unavailable pages only show if configured
    })
    .forEach(page => {
      const groupSlug = page.group_slug!;
      
      if (!groupsMap.has(groupSlug)) {
        groupsMap.set(groupSlug, {
          id: page.group_id!,
          name: page.group_name!,
          slug: groupSlug,
          icon: page.group_icon,
          order_index: page.group_order,
          pages: [],
        });
      }
      
      groupsMap.get(groupSlug)!.pages.push(page);
    });
  
  // Converter para array de seções ordenadas (deduplicar por path dentro de cada grupo)
  const groupedSections: NavMenuSection[] = Array.from(groupsMap.values())
    .sort((a, b) => (a.order_index ?? 99) - (b.order_index ?? 99))
    .map(group => {
      const seenInGroup = new Set<string>();
      const items = group.pages
        .sort((a, b) => (a.order_in_group ?? 99) - (b.order_in_group ?? 99))
        .filter(page => {
          if (seenInGroup.has(page.path)) return false;
          seenInGroup.add(page.path);
          return true;
        })
        .map(page => {
          // For effective admins, treat unavailable pages as available (no "Em breve" visual state)
          const rawComingSoon = !page.is_active_users;
          const isComingSoon = effectiveAdmin ? false : rawComingSoon;
          const isLocked = effectiveAdmin ? false : (!isComingSoon && !hasRoutePermission(page.path));
          
          return {
            path: page.path,
            label: page.title,
            icon: getIconComponent(page.icon),
            isLocked,
            isComingSoon,
            accessLevel: page.access_level,
            // Admin can click through "coming soon" pages
            canAccessAsAdmin: effectiveAdmin,
          };
        });
      
      return {
        title: group.name,
        slug: group.slug,
        icon: getIconComponent(group.icon),
        items,
        hasLockedItems: items.some(item => item.isLocked),
        hasComingSoonItems: items.some(item => item.isComingSoon),
      };
    });

  return {
    mainItems,
    groupedSections,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Hook simplificado para o menu mobile (MoreMenuSheet)
 * Retorna todas as seções exceto as que já aparecem na bottom nav
 */
export function useMobileMenuSections(): { sections: NavMenuSection[]; isLoading: boolean } {
  const { groupedSections, isLoading } = useNavMenuPages();
  
  // No mobile, não mostramos o grupo "admin" no menu regular (usuário acessa por outra via)
  const mobileSections = groupedSections.filter(
    section => section.slug !== 'admin'
  );

  // Inject simulator categories as a dedicated section
  const simuladoresSection: NavMenuSection = {
    title: 'Simuladores',
    slug: 'simuladores',
    icon: TrendingUp,
    items: [
      { path: '/simuladores/veiculos', label: 'Veículos', icon: Car, accessLevel: 'public' },
      { path: '/simuladores/dividas', label: 'Dívidas', icon: CreditCard, accessLevel: 'public' },
      { path: '/simuladores/planejamento', label: 'Planejamento', icon: TrendingUp, accessLevel: 'public' },
    ],
  };

  // Insert simuladores section before the last section (usually Configurações)
  const insertIndex = Math.max(mobileSections.length - 1, 0);
  const result = [...mobileSections];
  result.splice(insertIndex, 0, simuladoresSection);

  return { sections: result, isLoading };
}

/**
 * Hook para verificar se uma página específica está disponível (is_active_users)
 * Returns both the raw availability and whether admin can bypass
 */
export function usePageAvailability(path: string): { 
  isAvailable: boolean; 
  isLoading: boolean; 
  pageName: string | null;
  canAdminBypass: boolean;
} {
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['page-availability', path],
    queryFn: async () => {
      const { data: page, error } = await supabase
        .from('pages')
        .select('is_active_users, title')
        .eq('path', path)
        .maybeSingle();
      
      if (error) throw error;
      return page;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Only bypass for admin when we're SURE they are admin (not loading and confirmed true)
  const confirmedAdmin = !adminLoading && isAdmin === true;
  const rawAvailable = data?.is_active_users ?? true;

  return {
    // isAvailable now reflects actual database status (not bypassed for admin)
    isAvailable: rawAvailable,
    isLoading: isLoading || adminLoading,
    pageName: data?.title || null,
    // New flag: admin can bypass even if page is not available
    canAdminBypass: confirmedAdmin && !rawAvailable,
  };
}
