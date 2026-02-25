import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVisibility } from '@/contexts/VisibilityContext';
import { ItemGoal } from '@/hooks/useMonthlyGoals';

interface CategoryData {
  id: string;
  name: string;
  icon?: React.ReactNode;
  avgValue: number; // average based on calculation_base
  items: {
    id: string;
    name: string;
    avgValue: number;
    paymentMethod?: string;
  }[];
}

interface CategoryGoalTableProps {
  categories: CategoryData[];
  itemGoals: Record<string, ItemGoal>;
  globalChallenge: number;
  onItemGoalChange: (itemId: string, goal: ItemGoal) => void;
  calculationBaseLabel: string;
}

export function CategoryGoalTable({
  categories,
  itemGoals,
  globalChallenge,
  onItemGoalChange,
  calculationBaseLabel,
}: CategoryGoalTableProps) {
  const { isHidden } = useVisibility();
  const isVisible = !isHidden;
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const formatCurrency = (value: number) => {
    if (!isVisible) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getItemGoal = (itemId: string, avgValue: number): number => {
    const itemGoal = itemGoals[itemId];
    if (itemGoal) {
      return itemGoal.goal;
    }
    // Calculate with global challenge if no specific goal
    return Math.round(avgValue * (1 + globalChallenge / 100));
  };

  const getItemChallenge = (itemId: string): number => {
    return itemGoals[itemId]?.challenge ?? globalChallenge;
  };

  const getChallengeColor = (challenge: number) => {
    if (challenge <= -10) return 'text-income';
    if (challenge < 0) return 'text-amber-500';
    if (challenge === 0) return 'text-muted-foreground';
    if (challenge <= 10) return 'text-amber-500';
    return 'text-expense';
  };

  const startEditing = (itemId: string, currentGoal: number) => {
    setEditingItem(itemId);
    setEditValue((currentGoal / 100).toFixed(0));
  };

  const saveEdit = (itemId: string, avgValue: number) => {
    const newGoal = Math.round(parseFloat(editValue || '0') * 100);
    const challenge = avgValue > 0 ? ((newGoal - avgValue) / avgValue) * 100 : 0;
    onItemGoalChange(itemId, { goal: newGoal, challenge: Math.round(challenge) });
    setEditingItem(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
  };

  const getCategoryTotal = (category: CategoryData): { avg: number; goal: number } => {
    const avg = category.items.reduce((sum, item) => sum + item.avgValue, 0);
    const goal = category.items.reduce((sum, item) => sum + getItemGoal(item.id, item.avgValue), 0);
    return { avg, goal };
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[40%]">Categoria / Item</TableHead>
            <TableHead className="text-right w-[20%]">{calculationBaseLabel}</TableHead>
            <TableHead className="text-right w-[20%]">Meta</TableHead>
            <TableHead className="text-center w-[20%]">Desafio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map(category => {
            const isExpanded = expandedCategories.has(category.id);
            const totals = getCategoryTotal(category);
            const categoryChallenge = totals.avg > 0 
              ? ((totals.goal - totals.avg) / totals.avg) * 100 
              : 0;

            return (
              <Collapsible key={category.id} open={isExpanded} asChild>
                <>
                  <CollapsibleTrigger asChild>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50 font-medium"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          {category.icon}
                          <span>{category.name}</span>
                          <Badge variant="secondary" className="text-[10px] ml-2">
                            {category.items.length}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(totals.avg)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatCurrency(totals.goal)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getChallengeColor(categoryChallenge))}
                        >
                          {categoryChallenge >= 0 ? '+' : ''}{categoryChallenge.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <>
                      {category.items.map(item => {
                        const itemGoal = getItemGoal(item.id, item.avgValue);
                        const itemChallenge = getItemChallenge(item.id);
                        const isEditing = editingItem === item.id;

                        return (
                          <TableRow key={item.id} className="bg-muted/20">
                            <TableCell className="pl-10">
                              <span className="text-sm">{item.name}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground">
                              {formatCurrency(item.avgValue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-muted-foreground text-sm">R$</span>
                                  <Input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-20 h-7 text-right text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit(item.id, item.avgValue);
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => saveEdit(item.id, item.avgValue)}
                                  >
                                    <Check className="h-3 w-3 text-income" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={cancelEdit}
                                  >
                                    <X className="h-3 w-3 text-expense" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="font-mono text-sm">{formatCurrency(itemGoal)}</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditing(item.id, itemGoal);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={cn("text-xs", getChallengeColor(itemChallenge))}>
                                {itemChallenge >= 0 ? '+' : ''}{itemChallenge.toFixed(0)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  </CollapsibleContent>
                </>
              </Collapsible>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
