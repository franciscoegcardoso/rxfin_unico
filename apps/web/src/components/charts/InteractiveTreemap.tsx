import React, { useState, useMemo, useCallback } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { CHART_PALETTE, CHART_OTHERS_COLOR } from '@/components/charts/premiumChartTheme';

const COLORS = CHART_PALETTE as unknown as string[];
const OTHERS_COLOR = CHART_OTHERS_COLOR;

/**
 * Generate varied child colors based on a parent color.
 * Parses the parent HSL and shifts hue/lightness for each child.
 */
function generateChildColor(parentColor: string | undefined, index: number, total: number): string {
  if (!parentColor) return COLORS[index % COLORS.length];
  
  // Try to parse HSL from parent
  const hslMatch = parentColor.match(/hsl\((\d+),?\s*(\d+)%?,?\s*(\d+)%?\)/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]);
    const s = parseInt(hslMatch[2]);
    const l = parseInt(hslMatch[3]);
    // Spread hue ±30 around parent, vary lightness 35-65%
    const hueSpread = Math.min(60, total * 6);
    const hueShift = total > 1 ? -hueSpread / 2 + (index / (total - 1)) * hueSpread : 0;
    const lightShift = total > 1 ? 35 + (index / (total - 1)) * 30 : l;
    const newH = (h + Math.round(hueShift) + 360) % 360;
    const newS = Math.max(40, Math.min(90, s - 5 + (index % 3) * 5));
    const newL = Math.round(lightShift);
    return `hsl(${newH}, ${newS}%, ${newL}%)`;
  }
  
  // Fallback: hex-like color — use COLORS palette shifted
  return COLORS[(index + 3) % COLORS.length];
}

export interface TreemapItem {
  id: string;
  name: string;
  value: number;
  count?: number;
  color?: string;
  children?: TreemapItem[];
}

interface InteractiveTreemapProps {
  data: TreemapItem[];
  formatValue: (value: number) => string;
  isHidden?: boolean;
  height?: number;
  showLegend?: boolean;
  groupSmallItems?: boolean;
  smallItemThreshold?: number;
}

// Custom content component for Treemap cells
const CustomizedContent: React.FC<any> = (props) => {
  const {
    x,
    y,
    width,
    height,
    name,
    value,
    color,
    depth,
    index,
    hasChildren,
  } = props;

  const isSmall = width < 70 || height < 50;
  const isTiny = width < 45 || height < 35;
  const showExpandIcon = hasChildren && width >= 50 && height >= 40;

  // Skip rendering for container nodes
  if (depth === 0) return null;

  const fillColor = color || COLORS[index % COLORS.length];

  // Expand icon SVG path (ChevronRight style)
  const expandIconSize = 12;
  const iconX = x + width - expandIconSize - 4;
  const iconY = y + 4;

  if (isTiny) {
    return (
      <g className="treemap-cell" style={{ cursor: hasChildren ? 'pointer' : 'default' }}>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={3}
          style={{
            fill: fillColor,
            stroke: 'hsl(var(--background))',
            strokeWidth: 2,
            transition: 'all 0.3s ease-out',
          }}
        />
        {showExpandIcon && (
          <g transform={`translate(${iconX}, ${iconY})`}>
            <circle cx={expandIconSize/2} cy={expandIconSize/2} r={expandIconSize/2} fill="rgba(255,255,255,0.25)" />
            <path
              d={`M${expandIconSize * 0.35} ${expandIconSize * 0.25} L${expandIconSize * 0.65} ${expandIconSize * 0.5} L${expandIconSize * 0.35} ${expandIconSize * 0.75}`}
              stroke="white"
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </g>
    );
  }

  return (
    <g className="treemap-cell" style={{ cursor: hasChildren ? 'pointer' : 'default' }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={3}
        style={{
          fill: fillColor,
          stroke: 'hsl(var(--background))',
          strokeWidth: 2,
          transition: 'all 0.3s ease-out',
        }}
      />
      {/* Expand icon for items with children */}
      {showExpandIcon && (
        <g transform={`translate(${iconX}, ${iconY})`}>
          <circle cx={expandIconSize/2} cy={expandIconSize/2} r={expandIconSize/2 + 1} fill="rgba(255,255,255,0.2)" />
          <path
            d={`M${expandIconSize * 0.35} ${expandIconSize * 0.25} L${expandIconSize * 0.65} ${expandIconSize * 0.5} L${expandIconSize * 0.35} ${expandIconSize * 0.75}`}
            stroke="white"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
      {!isSmall && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="white"
            fontSize={11}
            fontWeight="500"
            fontFamily="Inter, system-ui, -apple-system, sans-serif"
            letterSpacing="0.01em"
            style={{ 
              textShadow: '0 1px 2px rgba(0,0,0,0.4)', 
              pointerEvents: 'none',
            }}
          >
            {name && name.length > 14 ? `${name.slice(0, 12)}…` : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="rgba(255,255,255,0.85)"
            fontSize={10}
            fontWeight="400"
            fontFamily="Inter, system-ui, -apple-system, sans-serif"
            style={{ 
              textShadow: '0 1px 2px rgba(0,0,0,0.4)', 
              pointerEvents: 'none',
            }}
          >
            {props.isHidden ? '••••' : props.formatValue?.(value) || value}
          </text>
        </>
      )}
    </g>
  );
};

export const InteractiveTreemap: React.FC<InteractiveTreemapProps> = ({
  data,
  formatValue,
  isHidden = false,
  height = 200,
  showLegend = true,
  groupSmallItems = true,
  smallItemThreshold = 5,
}) => {
  const [drilldownItem, setDrilldownItem] = useState<TreemapItem | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Group small items into "Outros" - apply to any level of data
  const applyGrouping = useCallback((items: TreemapItem[]): TreemapItem[] => {
    if (!groupSmallItems || items.length === 0) return items;
    
    const total = items.reduce((sum, item) => sum + item.value, 0);
    const threshold = (smallItemThreshold / 100) * total;
    
    const largeItems: TreemapItem[] = [];
    const smallItems: TreemapItem[] = [];
    
    items.forEach(item => {
      if (item.value >= threshold) {
        largeItems.push(item);
      } else {
        smallItems.push(item);
      }
    });
    
    if (smallItems.length > 1) {
      const othersValue = smallItems.reduce((sum, item) => sum + item.value, 0);
      const othersCount = smallItems.reduce((sum, item) => sum + (item.count || 1), 0);
      
      // Combine all children from small items
      const allSmallChildren = smallItems.flatMap(item => item.children || [item]);
      
      largeItems.push({
        id: 'others',
        name: 'Outros',
        value: othersValue,
        count: othersCount,
        color: OTHERS_COLOR,
        children: allSmallChildren.length > 0 ? allSmallChildren : smallItems,
      });
    } else if (smallItems.length === 1) {
      largeItems.push(smallItems[0]);
    }
    
    return largeItems.sort((a, b) => b.value - a.value);
  }, [groupSmallItems, smallItemThreshold]);

  // Apply grouping to root data
  const groupedData = useMemo(() => applyGrouping(data), [data, applyGrouping]);

  // Prepare data with colors - IMPORTANT: remove children for flat treemap display
  const coloredData = useMemo(() => {
    return groupedData.map((item, index) => ({
      ...item,
      color: item.color || COLORS[index % COLORS.length],
    }));
  }, [groupedData]);

  // Current display data (either root or drilldown children)
  // We strip children property to prevent Recharts from nesting
  const currentDisplayData = useMemo(() => {
    let sourceData: TreemapItem[];
    
    if (drilldownItem?.children) {
      // Apply grouping to drilldown children as well
      sourceData = applyGrouping(drilldownItem.children);
    } else {
      sourceData = coloredData;
    }
    
    // For drilldown children, generate varied colors based on parent color
    const parentColor = drilldownItem?.color;
    
    // Strip children for display (keep original reference for click handling)
    return sourceData.map((item, index) => ({
      id: item.id,
      name: item.name,
      value: item.value,
      count: item.count,
      color: drilldownItem
        ? (item.color !== parentColor ? item.color : undefined) || generateChildColor(parentColor, index, sourceData.length)
        : item.color || COLORS[index % COLORS.length],
      hasChildren: !!(item.children && item.children.length > 0),
    }));
  }, [drilldownItem, coloredData, applyGrouping]);

  // Keep full data with children for click handling
  const currentFullData = useMemo(() => {
    if (drilldownItem?.children) {
      return applyGrouping(drilldownItem.children).map((item, index) => ({
        ...item,
        color: item.color || COLORS[index % COLORS.length],
      }));
    }
    return coloredData;
  }, [drilldownItem, coloredData, applyGrouping]);

  const totalValue = currentDisplayData.reduce((sum, item) => sum + item.value, 0);

  const handleItemClick = (item: TreemapItem) => {
    if (item.children && item.children.length > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setDrilldownItem(item);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 150);
    }
  };

  const handleBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setDrilldownItem(null);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 150);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0';
    const fullItem = currentFullData.find(d => d.name === item.name);

    return (
      <div className="bg-card border rounded-lg shadow-lg p-2.5 text-xs">
        <p className="font-semibold text-sm">{item.name}</p>
        <p className="text-muted-foreground mt-1">
          Valor: {isHidden ? '••••••' : formatValue(item.value)}
        </p>
        {item.count !== undefined && (
          <p className="text-muted-foreground">Qtd: {item.count}</p>
        )}
        <p className="text-muted-foreground">{percentage}%</p>
        {fullItem?.children && fullItem.children.length > 0 && (
          <p className="text-primary text-[10px] mt-1.5 font-medium">Clique para ver detalhes</p>
        )}
      </div>
    );
  };

  // Handle click on treemap
  const handleTreemapClick = (data: any) => {
    if (data && data.name) {
      const item = currentFullData.find((d) => d.name === data.name);
      if (item) {
        handleItemClick(item);
      }
    }
  };

  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Drilldown header */}
      {drilldownItem && (
        <motion.div 
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-7 px-2 text-xs"
          >
            <ChevronLeft className="h-3 w-3 mr-1" />
            Voltar
          </Button>
          <div
            className="w-3 h-3 rounded-sm shrink-0"
            style={{ backgroundColor: drilldownItem.color }}
          />
          <span className="text-sm font-medium">{drilldownItem.name}</span>
          <span className="text-xs text-muted-foreground">
            ({currentDisplayData.length} {currentDisplayData.length === 1 ? 'item' : 'itens'})
          </span>
        </motion.div>
      )}

      {/* Treemap */}
      <motion.div 
        style={{ height }} 
        className={cn(
          "transition-all duration-300 ease-out",
          isTransitioning && "opacity-0 scale-95"
        )}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={currentDisplayData}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="hsl(var(--background))"
            onClick={handleTreemapClick}
            content={<CustomizedContent formatValue={formatValue} isHidden={isHidden} />}
            animationDuration={400}
            animationEasing="ease-out"
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </motion.div>

      {/* Legend */}
      {showLegend && (
        <motion.div 
          className={cn(
            "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 text-xs transition-opacity duration-300",
            isTransitioning && "opacity-0"
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {currentFullData.slice(0, 8).map((item, index) => {
            const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(0) : '0';
            const hasChildren = item.children && item.children.length > 0;
            return (
              <motion.button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "flex items-center gap-1.5 p-1.5 rounded hover:bg-muted/50 transition-colors text-left",
                  hasChildren && "cursor-pointer"
                )}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + index * 0.03 }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate flex-1 font-medium" title={item.name}>
                  {item.name}
                </span>
                <span className="text-muted-foreground shrink-0">{percentage}%</span>
              </motion.button>
            );
          })}
          {currentFullData.length > 8 && (
            <span className="text-muted-foreground p-1.5">
              +{currentFullData.length - 8} mais
            </span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

// Dialog wrapper for full drilldown experience
interface TreemapDrilldownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentItem: TreemapItem | null;
  formatValue: (value: number) => string;
  isHidden?: boolean;
}

export const TreemapDrilldownDialog: React.FC<TreemapDrilldownDialogProps> = ({
  open,
  onOpenChange,
  parentItem,
  formatValue,
  isHidden = false,
}) => {
  if (!parentItem || !parentItem.children) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            Detalhes: {parentItem.name}
          </DialogTitle>
        </DialogHeader>
        <InteractiveTreemap
          data={parentItem.children}
          formatValue={formatValue}
          isHidden={isHidden}
          height={300}
          showLegend={true}
        />
      </DialogContent>
    </Dialog>
  );
};

export default InteractiveTreemap;
