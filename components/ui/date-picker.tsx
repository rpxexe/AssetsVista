"use client";

import * as React from "react";
import { format, isValid } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  value?: string | Date | null;
  onChange: (nextIsoDate: string) => void;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}

function parseDateValue(value?: string | Date | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return isValid(value) ? value : undefined;
  }
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const localDate = new Date(year, month, day);
    return isValid(localDate) ? localDate : undefined;
  }
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : undefined;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  clearable = true,
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = parseDateValue(value);

  return (
    <div className="relative flex items-center w-full">
      <Popover modal open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-9 px-3",
              clearable && selectedDate ? "pr-8" : "",
              !selectedDate && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
            <span className="truncate">
              {selectedDate ? format(selectedDate, "PPP") : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(day) => {
              onChange(day ? format(day, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {clearable && selectedDate && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange("")}
          className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label="Clear date"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

