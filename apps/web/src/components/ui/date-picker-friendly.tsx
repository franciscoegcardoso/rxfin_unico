import * as React from "react";
import { format, parse, isValid, setMonth, setYear, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerFriendlyProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
}

const months = [
  { value: 0, label: "Janeiro" },
  { value: 1, label: "Fevereiro" },
  { value: 2, label: "Março" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Maio" },
  { value: 5, label: "Junho" },
  { value: 6, label: "Julho" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Setembro" },
  { value: 9, label: "Outubro" },
  { value: 10, label: "Novembro" },
  { value: 11, label: "Dezembro" },
];

export function DatePickerFriendly({
  value,
  onChange,
  placeholder = "DD/MM/AAAA",
  minYear = 1950,
  maxYear = new Date().getFullYear(),
}: DatePickerFriendlyProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [calendarDate, setCalendarDate] = React.useState<Date>(value || new Date());

  // Generate years array (descending for easier selection of past dates)
  const years = React.useMemo(() => {
    const yearsArray = [];
    for (let year = maxYear; year >= minYear; year--) {
      yearsArray.push(year);
    }
    return yearsArray;
  }, [minYear, maxYear]);

  // Sync input value with external value
  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, "dd/MM/yyyy"));
      setCalendarDate(value);
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    
    // Auto-format as user types
    if (rawValue.length >= 2) {
      rawValue = rawValue.slice(0, 2) + "/" + rawValue.slice(2);
    }
    if (rawValue.length >= 5) {
      rawValue = rawValue.slice(0, 5) + "/" + rawValue.slice(5, 9);
    }
    
    setInputValue(rawValue);

    // Try to parse the date when complete
    if (rawValue.length === 10) {
      const parsed = parse(rawValue, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onChange(parsed);
        setCalendarDate(parsed);
      }
    }
  };

  const handleInputBlur = () => {
    if (inputValue.length === 10) {
      const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onChange(parsed);
      } else {
        // Reset to current value if invalid
        setInputValue(value ? format(value, "dd/MM/yyyy") : "");
      }
    } else if (inputValue.length > 0) {
      // Reset to current value if incomplete
      setInputValue(value ? format(value, "dd/MM/yyyy") : "");
    }
  };

  const handleYearChange = (yearStr: string) => {
    const year = parseInt(yearStr);
    const newDate = setYear(calendarDate, year);
    setCalendarDate(newDate);
  };

  const handleMonthChange = (monthStr: string) => {
    const month = parseInt(monthStr);
    const newDate = setMonth(calendarDate, month);
    setCalendarDate(newDate);
  };

  const handleDateSelect = (date: Date | undefined) => {
    onChange(date);
    if (date) {
      setInputValue(format(date, "dd/MM/yyyy"));
      setCalendarDate(date);
    }
    setIsOpen(false);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(calendarDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCalendarDate(newDate);
  };

  return (
    <div className="flex gap-2">
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className="flex-1"
        maxLength={10}
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(!value && "text-muted-foreground")}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover" align="end">
          <div className="p-3 space-y-3">
            {/* Year and Month Selection */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigateMonth("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Select
                value={getYear(calendarDate).toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[90px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60 bg-popover">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={getMonth(calendarDate).toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-[110px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigateMonth("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar */}
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              month={calendarDate}
              onMonthChange={setCalendarDate}
              className="pointer-events-auto"
              locale={ptBR}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
