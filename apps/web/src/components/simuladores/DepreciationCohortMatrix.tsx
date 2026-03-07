import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layers, TrendingDown, TrendingUp, Info, Loader2, ChevronDown, Download, FileSpreadsheet, FileText, HelpCircle, Play, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useCohortMatrix, type CohortCell } from '@/hooks/useCohortMatrix';
import { formatFipeAnoModelo } from '@/hooks/useFipe';
import { toast } from 'sonner';

interface DepreciationCohortMatrixProps {
  fipeCode: string;
  modelName: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format compact without currency symbol for table cells
const formatCompactNoCurrency = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toLocaleString('pt-BR');
};

const formatPercent = (value: number) => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
};

// Check if year falls within pandemic period
function isPandemicYear(year: number): boolean {
  return year >= 2020 && year <= 2022;
}

// Professional heatmap color scale using a diverging palette
// Green (high values) -> Yellow/Cream (mid) -> Red/Orange (low values)
function getHeatmapStyle(price: number, minPrice: number, maxPrice: number): React.CSSProperties {
  if (minPrice === maxPrice) return {};
  
  // Normalize to 0-1 range (0 = lowest, 1 = highest)
  const normalized = (price - minPrice) / (maxPrice - minPrice);
  
  // Professional color stops inspired by statistical visualization tools
  // Low (red/warm) -> Mid (neutral) -> High (green/cool)
  let r: number, g: number, b: number;
  
  if (normalized < 0.25) {
    // Deep red to orange (lowest 25%)
    const t = normalized / 0.25;
    r = Math.round(180 + t * 35);  // 180 -> 215
    g = Math.round(60 + t * 80);   // 60 -> 140
    b = Math.round(50 + t * 30);   // 50 -> 80
  } else if (normalized < 0.5) {
    // Orange to warm yellow (25-50%)
    const t = (normalized - 0.25) / 0.25;
    r = Math.round(215 + t * 25);  // 215 -> 240
    g = Math.round(140 + t * 60);  // 140 -> 200
    b = Math.round(80 + t * 40);   // 80 -> 120
  } else if (normalized < 0.75) {
    // Warm yellow to light green (50-75%)
    const t = (normalized - 0.5) / 0.25;
    r = Math.round(240 - t * 100); // 240 -> 140
    g = Math.round(200 + t * 20);  // 200 -> 220
    b = Math.round(120 - t * 20);  // 120 -> 100
  } else {
    // Light green to rich green (top 25%)
    const t = (normalized - 0.75) / 0.25;
    r = Math.round(140 - t * 80);  // 140 -> 60
    g = Math.round(220 - t * 40);  // 220 -> 180
    b = Math.round(100 - t * 20);  // 100 -> 80
  }
  
  // Calculate relative luminance for text color decision
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = luminance > 0.55 ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.95)';
  
  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: textColor,
    fontWeight: 600,
    textShadow: luminance > 0.55 ? 'none' : '0 1px 2px rgba(0,0,0,0.3)',
  };
}

interface CellPopoverProps {
  price: number;
  modelYear: number;
  calendarYear: number;
  yoyChange: number | null;
  vs0kmChange: number | null;
  modelName: string;
  heatmapStyle?: React.CSSProperties;
  isLaunchYear: boolean; // True if this is the first year of the model (diagonal or 0km row)
}

const CellPopover: React.FC<CellPopoverProps> = ({
  price,
  modelYear,
  calendarYear,
  yoyChange,
  vs0kmChange,
  modelName,
  heatmapStyle,
  isLaunchYear,
}) => {
  const [open, setOpen] = useState(false);
  
  // Merge heatmap style with launch year styling
  const cellStyle: React.CSSProperties = {
    ...heatmapStyle,
    ...(isLaunchYear ? {
      boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.6), 0 0 0 1px rgba(0,0,0,0.15)',
    } : {}),
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`w-full text-center py-1.5 px-1 rounded transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30 hover:opacity-90 ${isLaunchYear ? 'ring-1 ring-white/50' : ''}`}
          style={cellStyle}
          onClick={() => setOpen(true)}
        >
          <span className={`text-[10px] sm:text-xs tracking-tight tabular-nums ${isLaunchYear ? 'font-bold' : 'font-medium'}`}>
            {formatCompactNoCurrency(price)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" side="top">
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs text-muted-foreground">
              Modelo {modelYear} em Dez/{calendarYear}
            </span>
            {isLaunchYear && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary">
                Valor 0 km
              </Badge>
            )}
          </div>
          
          <div className="text-lg font-bold">{formatCurrency(price)}</div>
          
          {isLaunchYear && (
            <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
              💡 Preço 0 km em Dez/{calendarYear} (lançamento do modelo {modelYear})
            </div>
          )}
          
          {yoyChange !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">vs. Ano Anterior:</span>
              <span className={yoyChange > 0 ? 'text-income font-medium' : 'text-destructive font-medium'}>
                {yoyChange > 0 ? <TrendingUp className="inline h-3 w-3 mr-1" /> : <TrendingDown className="inline h-3 w-3 mr-1" />}
                {formatPercent(yoyChange)}
              </span>
            </div>
          )}
          
          {vs0kmChange !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">vs. 0 km ({calendarYear}):</span>
              <span className={vs0kmChange > 0 ? 'text-income font-medium' : 'text-destructive font-medium'}>
                {formatPercent(vs0kmChange)}
              </span>
            </div>
          )}
          
          {isPandemicYear(calendarYear) && yoyChange !== null && yoyChange > 0 && (
            <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 pt-2 border-t">
              ⚠️ Período pandêmico - valorização atípica
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const DepreciationCohortMatrix: React.FC<DepreciationCohortMatrixProps> = ({
  fipeCode,
  modelName,
}) => {
  const cohort = useCohortMatrix();
  const [exporting, setExporting] = useState<'csv' | 'excel' | 'pdf' | null>(null);

  // Fetch cohort data when fipeCode changes
  useEffect(() => {
    if (fipeCode) {
      cohort.fetchCohortData(fipeCode);
    }
    // NOTE: Removed cohort.reset() from cleanup to prevent cancelling in-flight requests
    // The hook handles abort internally when a new request starts
  }, [fipeCode, cohort.fetchCohortData]);

  // Export helpers
  const getExportData = useCallback(() => {
    if (!cohort.matrixData) return null;
    const { modelYears = [], calendarYears = [] } = cohort.matrixData;
    const rows: (string | number)[][] = [];
    
    // Header row
    rows.push(['Ano Modelo', ...calendarYears.map(y => y.toString())]);
    
    // Data rows
    for (const my of modelYears) {
      const row: (string | number)[] = [formatFipeAnoModelo(my)];
      for (const cy of calendarYears) {
        // Can't have data before launch year (Y-1)
        if (cy < my - 1) {
          row.push('—');
        } else {
          const cell = cohort.getCell(my, cy);
          row.push(cell ? cell.price : '—');
        }
      }
      rows.push(row);
    }
    
    return rows;
  }, [cohort.matrixData, cohort.getCell]);

  const exportToCSV = useCallback(() => {
    const data = getExportData();
    if (!data) return;
    
    setExporting('csv');
    
    try {
      const csvContent = data
        .map(row => row.map(cell => {
          if (typeof cell === 'number') {
            return cell.toString();
          }
          return `"${cell}"`;
        }).join(';'))
        .join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analise_safra_${modelName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
      console.error(error);
    } finally {
      setExporting(null);
    }
  }, [getExportData, modelName]);

  const exportToExcel = useCallback(() => {
    const data = getExportData();
    if (!data) return;
    
    setExporting('excel');
    
    try {
      // Create XML-based Excel format (compatible with all Excel versions)
      let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xmlContent += '<?mso-application progid="Excel.Sheet"?>\n';
      xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
      xmlContent += '<Styles>\n';
      xmlContent += '<Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E8E8E8" ss:Pattern="Solid"/></Style>\n';
      xmlContent += '<Style ss:ID="Currency"><NumberFormat ss:Format="&quot;R$&quot;\\ #,##0"/></Style>\n';
      xmlContent += '<Style ss:ID="Text"/>\n';
      xmlContent += '</Styles>\n';
      xmlContent += `<Worksheet ss:Name="Análise de Safra">\n<Table>\n`;
      
      // Header row
      xmlContent += '<Row ss:StyleID="Header">\n';
      for (const cell of data[0]) {
        xmlContent += `<Cell><Data ss:Type="String">${cell}</Data></Cell>\n`;
      }
      xmlContent += '</Row>\n';
      
      // Data rows
      for (let i = 1; i < data.length; i++) {
        xmlContent += '<Row>\n';
        for (let j = 0; j < data[i].length; j++) {
          const cell = data[i][j];
          if (j === 0) {
            xmlContent += `<Cell ss:StyleID="Text"><Data ss:Type="String">${cell}</Data></Cell>\n`;
          } else if (typeof cell === 'number') {
            xmlContent += `<Cell ss:StyleID="Currency"><Data ss:Type="Number">${cell}</Data></Cell>\n`;
          } else {
            xmlContent += `<Cell><Data ss:Type="String">${cell}</Data></Cell>\n`;
          }
        }
        xmlContent += '</Row>\n';
      }
      
      xmlContent += '</Table>\n</Worksheet>\n</Workbook>';
      
      const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analise_safra_${modelName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xls`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar Excel');
      console.error(error);
    } finally {
      setExporting(null);
    }
  }, [getExportData, modelName]);

  const exportToPDF = useCallback(() => {
    const data = getExportData();
    if (!data) return;
    
    setExporting('pdf');
    
    try {
      const { modelYears = [], calendarYears = [] } = cohort.matrixData ?? {};
      
      // Create print-friendly HTML
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Popup bloqueado. Permita popups para exportar PDF.');
        setExporting(null);
        return;
      }
      
      const formatPrice = (value: number | string) => {
        if (typeof value !== 'number') return value;
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 0,
        }).format(value);
      };
      
      let tableHTML = '<table style="border-collapse: collapse; width: 100%; font-size: 11px;">';
      
      // Header
      tableHTML += '<thead><tr style="background: #f3f4f6;">';
      tableHTML += '<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Ano Modelo</th>';
      for (const year of calendarYears) {
        const isPandemic = year >= 2020 && year <= 2022;
        tableHTML += `<th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; ${isPandemic ? 'background: #fef3c7;' : ''}">${year}${isPandemic ? '<br><span style="font-size: 9px; color: #d97706;">Pandemia</span>' : ''}</th>`;
      }
      tableHTML += '</tr></thead>';
      
      // Body
      tableHTML += '<tbody>';
      for (let i = 1; i < data.length; i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < data[i].length; j++) {
          const cell = data[i][j];
          const isFirstCol = j === 0;
          const style = `border: 1px solid #d1d5db; padding: 6px; text-align: ${isFirstCol ? 'left' : 'right'}; ${isFirstCol ? 'font-weight: 600;' : ''}`;
          tableHTML += `<td style="${style}">${typeof cell === 'number' ? formatPrice(cell) : cell}</td>`;
        }
        tableHTML += '</tr>';
      }
      tableHTML += '</tbody></table>';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Análise de Safra - ${modelName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 5px; }
            .subtitle { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
            .footer { margin-top: 20px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>📊 Análise de Safra (Depreciação por Ano Calendário)</h1>
          <div class="subtitle">${modelName} • Código FIPE: ${fipeCode} • Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
          ${tableHTML}
          <div class="footer">
            * Valores em R$ referentes a Dezembro de cada ano. Células em negrito na diagonal representam preço 0 km no lançamento.
            ${cohort.matrixData?.has0km ? '<br>* A linha "0 km" mostra os preços de veículos novos ao longo do tempo.' : ''}
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `;
      
      printWindow.document.write(html);
      printWindow.document.close();
      
      toast.success('PDF pronto para impressão!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
      console.error(error);
    } finally {
      setExporting(null);
    }
  }, [getExportData, cohort.matrixData, modelName, fipeCode]);

  // Calculate min/max prices for heatmap
  const { minPrice, maxPrice } = React.useMemo(() => {
    if (!cohort.matrixData) return { minPrice: 0, maxPrice: 0 };
    const cells = cohort.matrixData.cells ?? [];
    if (cells.length === 0) return { minPrice: 0, maxPrice: 0 };
    const prices = cells.map((c: CohortCell) => c.price);
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  }, [cohort.matrixData]);

  // Check for pandemic anomaly
  const hasPandemicAnomaly = React.useMemo(() => {
    if (!cohort.matrixData) return false;
    const cells = cohort.matrixData.cells ?? [];
    for (const cell of cells) {
      if (isPandemicYear(cell.calendarYear)) {
        const yoyChange = cohort.getYoYChange(cell.modelYear, cell.calendarYear);
        if (yoyChange !== null && yoyChange > 0.05) {
          return true;
        }
      }
    }
    return false;
  }, [cohort.matrixData, cohort.getYoYChange]);

  // Error state with retry button
  if (cohort.error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-sm">
                Análise de Safra (Depreciação por Ano Calendário)
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">Valores em R$ (milhares)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {cohort.error}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => cohort.fetchCohortData(fipeCode, true)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state - show table skeleton with loading indicator in header
  if (cohort.loading || !cohort.matrixData) {
    // Placeholder skeleton years for loading display
    const skeletonYears = Array.from({ length: 8 }, (_, i) => 2017 + i);
    const skeletonModelYears = Array.from({ length: 10 }, (_, i) => 2015 + i);
    
    return (
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6">
          {/* Mobile-first: layout otimizado com ícone de loading sempre visível */}
          <div className="flex items-start gap-2">
            <Layers className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
                <CardTitle className="text-sm truncate">
                  <span className="hidden sm:inline">Análise de Safra (Depreciação por Ano Calendário)</span>
                  <span className="sm:hidden">Análise de Safra</span>
                </CardTitle>
                {/* Ícone animado com fundo destacado para visibilidade mobile */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 w-fit flex-shrink-0">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-[10px] font-medium text-primary">
                    Carregando
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">Valores em R$ (milhares)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          {/* Barra de progresso animada para feedback visual claro */}
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 flex-shrink-0" />
              <span>Buscando dados históricos de todas as safras...</span>
            </div>
            {/* Barra de progresso indeterminada */}
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full animate-pulse"
                style={{ 
                  width: '40%',
                  animation: 'loading-bar 1.5s ease-in-out infinite'
                }}
              />
            </div>
          </div>
          
          <div className="text-xs text-primary mb-3 font-medium">
            Valor do carro ao longo do tempo →
          </div>
          
          {/* Skeleton Table com efeito shimmer */}
          <div className="overflow-x-auto border rounded-lg">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 bg-muted/50 z-20 font-bold text-[10px] sm:text-xs px-1 sm:px-2 min-w-[50px] border border-border/40">
                    ANO
                  </TableHead>
                  {skeletonYears.map(year => (
                    <TableHead 
                      key={year} 
                      className="text-center min-w-[42px] sm:min-w-[55px] px-0.5 sm:px-1 text-[10px] sm:text-xs border border-border/40"
                    >
                      <span className="hidden sm:inline">{year}</span>
                      <span className="sm:hidden">{String(year).slice(2)}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {skeletonModelYears.map(my => (
                  <TableRow key={my} className="h-7">
                    <TableCell className="sticky left-0 bg-background z-10 font-medium px-1 sm:px-2 py-0.5 border border-border/40">
                      <span className="font-semibold text-[10px] sm:text-xs">{my}</span>
                    </TableCell>
                    {skeletonYears.map(cy => (
                      <TableCell key={cy} className="text-center px-0.5 py-0.5 border border-border/30">
                        <div className="py-1.5 px-1 text-muted-foreground/30 text-[10px]">—</div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { modelYears = [], calendarYears = [], cells = [] } = cohort.matrixData ?? {};

  // Check if we have valid data - need at least 2 years and some actual price data
  const hasValidData = calendarYears.length >= 2 && modelYears.length >= 2 && cells.length > 0;
  
  if (!hasValidData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-sm">
                Análise de Safra (Depreciação por Ano Calendário)
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">Valores em R$ (milhares)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground text-center">
              Dados insuficientes para este veículo
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => cohort.fetchCohortData(fipeCode, true)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get short model name for display
  const shortModelName = modelName.split(' ').slice(0, 3).join(' ');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-sm">
                Análise de Safra (Depreciação por Ano Calendário)
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">Valores em R$ (milhares)</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {hasPandemicAnomaly && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-income/10 text-income border-income/30 text-[10px] px-1.5 py-0">
                      <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                      Anomalia
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">
                      Valorização atípica detectada entre 2020-2022 devido à pandemia. 
                      Este período é excluído das projeções de depreciação.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Help button with tutorial video */}
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    Como ler a Análise de Safra
                  </DialogTitle>
                  <DialogDescription>
                    Entenda a matriz de depreciação por ano calendário
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Tutorial Video */}
                  <div className="rounded-lg overflow-hidden border bg-muted/30">
                    <video 
                      controls 
                      className="w-full aspect-video"
                      poster="/placeholder.svg"
                      preload="metadata"
                    >
                      <source src="/videos/cohort-matrix-tutorial.mp4" type="video/mp4" />
                      Seu navegador não suporta o elemento de vídeo.
                    </video>
                    <div className="p-2 bg-muted/50 flex items-center gap-2 text-xs text-muted-foreground">
                      <Play className="h-3 w-3" />
                      <span>Clique para assistir o tutorial explicativo</span>
                    </div>
                  </div>
                  
                  {/* Text explanation */}
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="font-medium text-primary mb-1">📊 O que é a Análise de Safra?</p>
                      <p className="text-muted-foreground text-xs">
                        Uma matriz que mostra como o valor de cada ano/modelo do veículo evolui ao longo do tempo, 
                        permitindo identificar padrões de depreciação entre diferentes "safras" (gerações).
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium text-xs mb-1">📅 Eixo Vertical (Linhas)</p>
                        <p className="text-muted-foreground text-[11px]">
                          Cada linha representa um <strong>Ano/Modelo</strong> diferente do veículo 
                          (ex: Corolla 2020, Corolla 2021, etc.)
                        </p>
                      </div>
                      
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium text-xs mb-1">📆 Eixo Horizontal (Colunas)</p>
                        <p className="text-muted-foreground text-[11px]">
                          Cada coluna representa um <strong>Ano Calendário</strong> 
                          (o valor do carro em Dezembro daquele ano)
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      <p className="font-medium text-xs mb-1 text-amber-700 dark:text-amber-400">
                        💡 Diagonal em Destaque
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        As células na diagonal (onde Ano/Modelo = Ano Calendário - 1) representam o 
                        <strong> preço 0 km no lançamento</strong>. Por exemplo: o Corolla 2023 aparece 
                        como 0 km na coluna de Dez/2022.
                      </p>
                    </div>
                    
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium text-xs mb-1">🎨 Escala de Cores</p>
                      <p className="text-muted-foreground text-[11px]">
                        <span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor: 'rgb(60, 180, 80)'}}></span>
                        <strong>Verde:</strong> Valores mais altos
                        <br />
                        <span className="inline-block w-3 h-3 rounded mr-1 mt-1" style={{backgroundColor: 'rgb(180, 60, 50)'}}></span>
                        <strong>Vermelho:</strong> Valores mais baixos
                      </p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 gap-1 text-xs px-2"
                  disabled={!!exporting}
                >
                  {exporting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV} disabled={!!exporting}>
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel} disabled={!!exporting}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel (.xls)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF} disabled={!!exporting}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF (Imprimir)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardDescription className="flex items-start gap-1 text-[10px]">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Clique em qualquer valor para ver a depreciação YoY e vs. 0 km.</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {/* Axis title - horizontal (top) */}
        <div className="text-center mb-1">
          <span className="text-[10px] sm:text-xs font-medium text-primary">
            Valor do carro ao longo do tempo →
          </span>
        </div>
        
        <div className="flex">
          {/* Axis title - vertical (left side) */}
          <div className="flex items-center justify-center pr-1 sm:pr-2">
            <span 
              className="text-[10px] sm:text-xs font-medium text-primary whitespace-nowrap"
              style={{ 
                writingMode: 'vertical-rl', 
                transform: 'rotate(180deg)',
                letterSpacing: '0.02em'
              }}
            >
              Ano / Modelo do carro
            </span>
          </div>
          
          <div className="overflow-x-auto flex-1 -mr-2 sm:-mr-6">
            <Table className="text-[10px] sm:text-xs border-collapse">
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[60px] sm:min-w-[80px] text-[10px] sm:text-xs px-1 sm:px-2 border border-border/40">
                    ANO
                  </TableHead>
                  {calendarYears.map(year => (
                    <TableHead 
                      key={year} 
                      className={`text-center min-w-[42px] sm:min-w-[55px] px-0.5 sm:px-1 text-[10px] sm:text-xs border border-border/40 ${
                        isPandemicYear(year) ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <span className="hidden sm:inline">{year}</span>
                      <span className="sm:hidden">{String(year).slice(2)}</span>
                      {isPandemicYear(year) && (
                        <span className="block text-[8px] text-amber-600 dark:text-amber-400 font-normal leading-tight">
                          Pand.
                        </span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelYears.map(my => (
                  <TableRow key={my} className="h-7">
                    <TableCell className="sticky left-0 bg-background z-10 font-medium px-1 sm:px-2 py-0.5 border border-border/40">
                      <span className="font-semibold text-[10px] sm:text-xs">{formatFipeAnoModelo(my)}</span>
                    </TableCell>
                    {calendarYears.map(cy => {
                      const cell = cohort.getCell(my, cy);
                      
                      // Can't have data for a calendar year before the model year - 1 (launch year)
                      // E.g., Model 2024 can have data starting from 2023 (0km launch)
                      if (cy < my - 1) {
                        return (
                          <TableCell key={cy} className="text-center px-0.5 py-0.5 border border-border/30">
                            <div className="py-1.5 px-1 text-muted-foreground/20 text-[10px]">—</div>
                          </TableCell>
                        );
                      }
                      
                      if (!cell) {
                        return (
                          <TableCell key={cy} className="text-center px-0.5 py-0.5 border border-border/30">
                            <div className="py-1.5 px-1 text-muted-foreground/40 text-[10px] bg-muted/30 rounded">—</div>
                          </TableCell>
                        );
                      }
                      
                      const yoyChange = cohort.getYoYChange(my, cy);
                      const vs0kmChange = cohort.getVs0kmChange(my, cy);
                      const heatmapStyle = getHeatmapStyle(cell.price, minPrice, maxPrice);
                      
                      // Launch year = Y-1 (e.g., Model 2024 launched in Dec 2023)
                      const isLaunchYear = cy === my - 1;
                      
                      return (
                        <TableCell 
                          key={cy} 
                          className="text-center px-0.5 py-0.5 border border-border/30"
                        >
                          <CellPopover
                            price={cell.price}
                            modelYear={my}
                            calendarYear={cy}
                            yoyChange={yoyChange}
                            vs0kmChange={vs0kmChange}
                            modelName={modelName}
                            heatmapStyle={heatmapStyle}
                            isLaunchYear={isLaunchYear}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Legend and footnote */}
        <div className="mt-2 space-y-2 border-t pt-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground">Escala:</span>
            
            {/* Professional heatmap gradient legend */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] uppercase tracking-wide opacity-70">Menor</span>
              <div className="flex h-3 rounded overflow-hidden shadow-sm border border-border/30">
                <div className="w-5" style={{ backgroundColor: 'rgb(180, 60, 50)' }} />
                <div className="w-5" style={{ backgroundColor: 'rgb(215, 140, 80)' }} />
                <div className="w-5" style={{ backgroundColor: 'rgb(240, 200, 120)' }} />
                <div className="w-5" style={{ backgroundColor: 'rgb(140, 220, 100)' }} />
                <div className="w-5" style={{ backgroundColor: 'rgb(60, 180, 80)' }} />
              </div>
              <span className="text-[9px] uppercase tracking-wide opacity-70">Maior</span>
            </div>
            
            <div className="flex items-center gap-1">
              <ChevronDown className="h-2.5 w-2.5" />
              <span>Clique para detalhes</span>
            </div>
          </div>
          
          {/* Footnote explaining launch year column */}
          <div className="text-[9px] text-muted-foreground bg-muted/40 rounded px-2 py-1.5">
            <span className="font-semibold">*</span> Valores na <strong>coluna Y-1</strong> (negrito) = preço 0 km no lançamento. 
            Demais = depreciação como usado.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
