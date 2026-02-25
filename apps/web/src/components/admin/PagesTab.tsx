import React, { useState, useMemo } from 'react';
import { Plus, FolderOpen, Search, X, Filter, ChevronsUpDown, ChevronsDownUp, Crown, Users, Eye, RefreshCw } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { PageDialog } from '@/components/admin/PageDialog';
import { AppSettingsCard } from '@/components/admin/AppSettingsCard';
import { AuthFlowSettingsCard } from '@/components/admin/AuthFlowSettingsCard';
import { FeatureSettingsCard } from '@/components/admin/FeatureSettingsCard';
import { PageGroupDialog } from '@/components/admin/PageGroupDialog';
import { SortablePageRow } from '@/components/admin/SortablePageRow';
import { SortableGroupRow } from '@/components/admin/SortableGroupRow';
import { usePages, type Page, type PageInsert } from '@/hooks/usePages';
import { usePageGroups, type PageGroup, type PageGroupInsert } from '@/hooks/usePageGroups';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useAdminDeferredMutations } from '@/hooks/useAdminDeferredMutations';
import { useAdminPendingChanges } from '@/contexts/AdminPendingChangesContext';
import { toast } from 'sonner';

const USER_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Disponíveis' },
  { value: 'inactive', label: 'Em Breve' },
];

interface PageFilters {
  search: string;
  planSlug: string;
  userStatus: string;
}

export function PagesTab() {
  const navigate = useNavigate();
  const { data: plans } = useSubscriptionPlans(true);
  const [filters, setFilters] = useState<PageFilters>({
    search: '',
    planSlug: 'all',
    userStatus: 'all',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [editingGroup, setEditingGroup] = useState<PageGroup | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteGroupConfirmOpen, setDeleteGroupConfirmOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<PageGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<'group' | 'page' | null>(null);

  const {
    pages: allPages,
    isLoading: pagesLoading,
    refetch: refetchPages,
  } = usePages('all');

  const {
    groups,
    isLoading: groupsLoading,
  } = usePageGroups();

  const {
    deferToggleUserStatus,
    deferToggleShowWhenUnavailable,
    deferCreatePage,
    deferUpdatePage,
    deferDeletePage,
    deferCreateGroup,
    deferUpdateGroup,
    deferDeleteGroup,
    deferUpdatePagePlan,
    deferReorderGroups,
    deferReorderPagesInGroup,
    deferMovePageToGroup,
  } = useAdminDeferredMutations();

  const { hasEntityChange, getEntityChangeTypes, getPendingValue, hasPendingValue, clearChanges, hasChanges } = useAdminPendingChanges();

  const isLoading = pagesLoading || groupsLoading;

  const handleSync = async () => {
    clearChanges(); // Clear pending values
    await refetchPages(); // Refetch from database
    toast.success('Dados sincronizados com o banco!');
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort plans by order_index for hierarchy display
  const sortedPlans = useMemo(() => 
    plans?.slice().sort((a, b) => a.order_index - b.order_index) || [], 
    [plans]
  );

  // Create plan options for filter
  const planFilterOptions = useMemo(() => [
    { value: 'all', label: 'Todos os planos' },
    ...sortedPlans.map(plan => ({
      value: plan.slug,
      label: plan.name
    }))
  ], [sortedPlans]);

  // Filter pages based on filters
  const pages = useMemo(() => {
    return allPages.filter(page => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch = 
          page.title.toLowerCase().includes(search) ||
          page.path.toLowerCase().includes(search) ||
          (page.description?.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }

      if (filters.planSlug !== 'all' && page.min_plan_slug !== filters.planSlug) {
        return false;
      }

      if (filters.userStatus === 'active' && !page.is_active_users) {
        return false;
      }
      if (filters.userStatus === 'inactive' && page.is_active_users) {
        return false;
      }

      return true;
    });
  }, [allPages, filters]);

  // Group pages by group_id
  const groupedPages = useMemo(() => {
    const grouped: Record<string, Page[]> = { ungrouped: [] };
    
    groups.forEach(g => {
      grouped[g.id] = [];
    });
    
    pages.forEach(page => {
      if (page.group_id && grouped[page.group_id]) {
        grouped[page.group_id].push(page);
      } else {
        grouped.ungrouped.push(page);
      }
    });
    
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => (a.order_in_group || 0) - (b.order_in_group || 0));
    });
    
    return grouped;
  }, [pages, groups]);

  // Sorted groups
  const sortedGroups = useMemo(() => 
    [...groups].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [groups]
  );

  const activeFiltersCount = [
    filters.planSlug !== 'all',
    filters.userStatus !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      search: '',
      planSlug: 'all',
      userStatus: 'all',
    });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allGroupIds = groups.map(g => g.id);
    setExpandedGroups(new Set(allGroupIds));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const allExpanded = groups.length > 0 && expandedGroups.size === groups.length;

  const handleNewPage = () => {
    setEditingPage(null);
    setDialogOpen(true);
  };

  const handleNewGroup = () => {
    setEditingGroup(null);
    setGroupDialogOpen(true);
  };

  const handleEditPage = (page: Page) => {
    setEditingPage(page);
    setDialogOpen(true);
  };

  const handleEditGroup = (group: PageGroup) => {
    setEditingGroup(group);
    setGroupDialogOpen(true);
  };

  const handleSavePage = (data: PageInsert) => {
    if (editingPage) {
      deferUpdatePage(editingPage.id, data, editingPage.title);
    } else {
      deferCreatePage(data);
    }
    setDialogOpen(false);
  };

  const handleSaveGroup = (data: PageGroupInsert) => {
    if (editingGroup) {
      deferUpdateGroup(editingGroup.id, data, editingGroup.name);
    } else {
      deferCreateGroup(data);
    }
    setGroupDialogOpen(false);
  };

  const handleDeleteClick = (page: Page) => {
    setPageToDelete(page);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteGroupClick = (group: PageGroup) => {
    setGroupToDelete(group);
    setDeleteGroupConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pageToDelete) {
      deferDeletePage(pageToDelete);
      setDeleteConfirmOpen(false);
      setPageToDelete(null);
    }
  };

  const handleConfirmDeleteGroup = () => {
    if (groupToDelete) {
      deferDeleteGroup(groupToDelete);
      setDeleteGroupConfirmOpen(false);
      setGroupToDelete(null);
    }
  };

  const handlePlanChange = (page: Page, newPlanSlug: string) => {
    deferUpdatePagePlan(page, newPlanSlug);
  };

  const getPlanName = (planSlug: string | null) => {
    if (!planSlug) return 'Free';
    const plan = plans?.find(p => p.slug === planSlug);
    return plan?.name || planSlug;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Determine if dragging a group or page
    const isGroup = groups.some(g => g.id === active.id);
    setActiveDragType(isGroup ? 'group' : 'page');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveDragType(null);

    if (!over || active.id === over.id) return;

    const activeIsGroup = groups.some(g => g.id === active.id);
    const overIsGroup = groups.some(g => g.id === over.id);

    if (activeIsGroup && overIsGroup) {
      // Reordering groups
      const oldIndex = sortedGroups.findIndex(g => g.id === active.id);
      const newIndex = sortedGroups.findIndex(g => g.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = [...sortedGroups];
        const [moved] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, moved);
        
        deferReorderGroups(
          newOrder.map(g => g.id),
          newOrder.map(g => g.name)
        );
      }
    } else if (!activeIsGroup && overIsGroup) {
      // Moving page to a different group (dropped on group header)
      const activePage = pages.find(p => p.id === active.id);
      const targetGroup = groups.find(g => g.id === over.id);
      
      if (activePage && targetGroup && activePage.group_id !== targetGroup.id) {
        const targetGroupPages = groupedPages[targetGroup.id] || [];
        const targetPosition = targetGroupPages.length; // Add at the end
        
        deferMovePageToGroup(activePage, targetGroup.id, targetPosition, targetGroup.name);
        
        // Auto-expand the target group so user sees the moved page
        setExpandedGroups(prev => new Set([...prev, targetGroup.id]));
      }
    } else if (!activeIsGroup && !overIsGroup) {
      // Reordering pages or moving between groups
      const activePage = pages.find(p => p.id === active.id);
      const overPage = pages.find(p => p.id === over.id);
      
      if (activePage && overPage) {
        if (activePage.group_id === overPage.group_id) {
          // Same group - reorder
          const groupId = activePage.group_id || 'ungrouped';
          const groupPages = groupedPages[groupId] || [];
          const group = groups.find(g => g.id === activePage.group_id);
          const groupName = group?.name || 'Sem grupo';
          
          const oldIndex = groupPages.findIndex(p => p.id === active.id);
          const newIndex = groupPages.findIndex(p => p.id === over.id);
          
          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = [...groupPages];
            const [moved] = newOrder.splice(oldIndex, 1);
            newOrder.splice(newIndex, 0, moved);
            
            deferReorderPagesInGroup(
              newOrder.map((p, index) => ({ id: p.id, order_in_group: index })),
              groupName
            );
          }
        } else {
          // Different groups - move page to target group
          const targetGroup = groups.find(g => g.id === overPage.group_id);
          const targetGroupName = targetGroup?.name || 'Sem grupo';
          const targetGroupPages = groupedPages[overPage.group_id || 'ungrouped'] || [];
          
          // Find position of the overPage to insert before/after it
          const overIndex = targetGroupPages.findIndex(p => p.id === overPage.id);
          const targetPosition = overIndex !== -1 ? overIndex : targetGroupPages.length;
          
          deferMovePageToGroup(
            activePage, 
            overPage.group_id, 
            targetPosition, 
            targetGroupName
          );
          
          // Auto-expand the target group
          if (overPage.group_id) {
            setExpandedGroups(prev => new Set([...prev, overPage.group_id!]));
          }
        }
      }
    }
  };

  const getPageDisplayData = (page: Page) => {
    const hasPendingChange = hasEntityChange(page.id);
    const changeTypes = getEntityChangeTypes(page.id);
    const isDeleting = changeTypes.has('delete');
    const isUpdating = changeTypes.has('update');
    const isToggling = changeTypes.has('toggle');
    const hasReorderPending = hasPendingValue(page.id, 'order_in_group');
    
    const pendingUserStatus = getPendingValue<boolean>(page.id, 'is_active_users');
    const pendingPlanSlug = getPendingValue<string>(page.id, 'min_plan_slug');
    const pendingShowWhenUnavailable = getPendingValue<boolean>(page.id, 'show_when_unavailable');
    
    const displayUserStatus = pendingUserStatus !== undefined ? pendingUserStatus : page.is_active_users;
    const displayPlanSlug = pendingPlanSlug !== undefined ? pendingPlanSlug : (page.min_plan_slug || 'free');
    // If page is active, show_when_unavailable is always true
    const displayShowWhenUnavailable = displayUserStatus 
      ? true 
      : (pendingShowWhenUnavailable !== undefined ? pendingShowWhenUnavailable : (page.show_when_unavailable ?? true));

    return {
      hasPendingChange,
      isDeleting,
      isUpdating,
      isToggling,
      hasReorderPending,
      displayUserStatus,
      displayShowWhenUnavailable,
      displayPlanSlug,
    };
  };

  const renderGroupSection = (group: PageGroup) => {
    const groupPages = groupedPages[group.id] || [];
    const isExpanded = expandedGroups.has(group.id);
    const hasPendingChange = hasEntityChange(group.id);
    const changeTypes = getEntityChangeTypes(group.id);
    const isDeleting = changeTypes.has('delete');
    const hasReorderPending = hasPendingValue(group.id, 'order_index');
    
    if (groupPages.length === 0 && (filters.search || filters.planSlug !== 'all' || filters.userStatus !== 'all')) {
      return null;
    }
    
    return (
      <React.Fragment key={group.id}>
        <SortableGroupRow
          group={group}
          pagesCount={groupPages.length}
          isExpanded={isExpanded}
          hasPendingChange={hasPendingChange}
          isDeleting={isDeleting}
          hasReorderPending={hasReorderPending}
          onToggle={() => toggleGroup(group.id)}
          onEdit={handleEditGroup}
          onDelete={handleDeleteGroupClick}
        />
        {isExpanded && (
          <SortableContext
            items={groupPages.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {groupPages.map(page => {
              const displayData = getPageDisplayData(page);
              return (
                <SortablePageRow
                  key={page.id}
                  page={page}
                  isNested
                  {...displayData}
                  sortedPlans={sortedPlans}
                  onEdit={handleEditPage}
                  onDelete={handleDeleteClick}
                  onPlanChange={handlePlanChange}
                  onToggleStatus={deferToggleUserStatus}
                  onToggleShowWhenUnavailable={deferToggleShowWhenUnavailable}
                  getPlanName={getPlanName}
                />
              );
            })}
          </SortableContext>
        )}
      </React.Fragment>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome ou caminho..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Select
              value={filters.planSlug}
              onValueChange={(value) => setFilters(prev => ({ ...prev, planSlug: value }))}
            >
              <SelectTrigger className="w-[160px]">
                <div className="flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Plano" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {planFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.userStatus}
              onValueChange={(value) => setFilters(prev => ({ ...prev, userStatus: value }))}
            >
              <SelectTrigger className="w-[140px]">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Usuários" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {USER_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 px-3"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}

            <div className="flex-1" />

            {groups.length > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={expandAll}
                  disabled={allExpanded}
                  className="h-9 px-2"
                  title="Expandir todos"
                >
                  <ChevronsDownUp className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Expandir</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={collapseAll}
                  disabled={expandedGroups.size === 0}
                  className="h-9 px-2"
                  title="Recolher todos"
                >
                  <ChevronsUpDown className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Recolher</span>
                </Button>
              </div>
            )}

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSync}
              disabled={isLoading}
              className="h-9 px-3"
              title="Sincronizar dados do banco"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>

            <Button variant="outline" onClick={handleNewGroup}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Novo Grupo
            </Button>
            <Button onClick={handleNewPage}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Página
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{pages.length}</span> páginas encontradas
          </span>
          
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Filter className="h-3 w-3" />
              {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="border rounded-lg">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Nome</TableHead>
                  <TableHead className="w-[180px]">Caminho</TableHead>
                  <TableHead className="w-[150px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <Crown className="h-4 w-4" />
                          <span>Plano Mínimo</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Define qual plano mínimo pode acessar. Hierarquia: (1) Sem Cadastro → (2) Free → (3) RX Starter → (4) RX Pro
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="w-[100px] text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1 cursor-help">
                          <Users className="h-4 w-4" />
                          <span className="hidden sm:inline">Disponível</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">Se falso, a página aparece como "Em Breve" e fica inacessível para todos os usuários</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="w-[100px] text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1 cursor-help">
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">Exibição</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">Se disponível, a página é sempre exibida. Se indisponível, define se aparece no menu ou fica oculta</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableHead><Skeleton className="h-5 w-40" /></TableHead>
                      <TableHead><Skeleton className="h-5 w-28" /></TableHead>
                      <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                      <TableHead className="text-center"><Skeleton className="h-5 w-10 mx-auto" /></TableHead>
                      <TableHead className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableHead>
                    </TableRow>
                  ))
                ) : pages.length === 0 ? (
                  <TableRow>
                    <TableHead colSpan={5} className="py-16">
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                          <FolderOpen className="h-8 w-8 text-muted-foreground/60" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Nenhuma página encontrada</p>
                          <p className="text-sm text-muted-foreground">
                            {filters.search || filters.planSlug !== 'all' || filters.userStatus !== 'all'
                              ? 'Tente ajustar os filtros de busca.'
                              : 'Crie uma nova página para começar.'}
                          </p>
                        </div>
                      </div>
                    </TableHead>
                  </TableRow>
                ) : (
                  <>
                    <SortableContext
                      items={sortedGroups.map(g => g.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {sortedGroups.map(group => renderGroupSection(group))}
                    </SortableContext>
                    
                    {groupedPages.ungrouped.length > 0 && (
                      <>
                        <TableRow className="bg-muted/20">
                          <TableHead colSpan={5}>
                            <div className="flex items-center gap-3 py-1">
                              <span className="font-semibold text-muted-foreground">Sem grupo</span>
                              <Badge variant="outline">
                                {groupedPages.ungrouped.length} páginas
                              </Badge>
                            </div>
                          </TableHead>
                        </TableRow>
                        <SortableContext
                          items={groupedPages.ungrouped.map(p => p.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {groupedPages.ungrouped.map(page => {
                            const displayData = getPageDisplayData(page);
                            return (
                              <SortablePageRow
                                key={page.id}
                                page={page}
                                {...displayData}
                                sortedPlans={sortedPlans}
                                onEdit={handleEditPage}
                                onDelete={handleDeleteClick}
                                onPlanChange={handlePlanChange}
                                onToggleStatus={deferToggleUserStatus}
                                onToggleShowWhenUnavailable={deferToggleShowWhenUnavailable}
                                getPlanName={getPlanName}
                              />
                            );
                          })}
                        </SortableContext>
                      </>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
            <DragOverlay>
              {activeId && activeDragType === 'group' ? (
                <div className="bg-card border rounded-lg p-3 shadow-lg opacity-90">
                  <span className="font-semibold">
                    {groups.find(g => g.id === activeId)?.name || 'Grupo'}
                  </span>
                </div>
              ) : activeId && activeDragType === 'page' ? (
                <div className="bg-card border rounded-lg p-3 shadow-lg opacity-90">
                  <span className="font-medium">
                    {pages.find(p => p.id === activeId)?.title || 'Página'}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Settings Section */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold">Configurações do Sistema</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <AuthFlowSettingsCard />
            <AppSettingsCard />
          </div>
          <div className="grid gap-4 lg:grid-cols-2 mt-4">
            <FeatureSettingsCard />
          </div>
        </div>
        <PageDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          page={editingPage}
          onSave={handleSavePage}
          isLoading={false}
        />

        <PageGroupDialog
          open={groupDialogOpen}
          onOpenChange={setGroupDialogOpen}
          group={editingGroup}
          onSave={handleSaveGroup}
          isLoading={false}
        />

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir página?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{pageToDelete?.title}"? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteGroupConfirmOpen} onOpenChange={setDeleteGroupConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o grupo "{groupToDelete?.name}"? 
                As páginas dentro dele não serão excluídas, apenas desagrupadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteGroup}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
