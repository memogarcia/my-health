import { format, isValid } from "date-fns"
import { CalendarDays, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { t } from "../../i18n"

type DatePickerProps = {
  id?: string
  name?: string
  value?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  clearable?: boolean
  className?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  onChange?: (value: string) => void
}

export function DatePicker({
  id,
  name,
  value,
  defaultValue = "",
  placeholder = t("common.pickDate"),
  required = false,
  disabled = false,
  clearable = false,
  className,
  ariaLabel,
  ariaDescribedBy,
  onChange,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const selectedValue = value ?? internalValue
  const selectedDate = isoToDate(selectedValue)

  function selectDate(date: Date | undefined): void {
    const nextValue = date ? format(date, "yyyy-MM-dd") : ""
    if (value === undefined) setInternalValue(nextValue)
    onChange?.(nextValue)
    if (date) setOpen(false)
  }

  return (
    <div className="grid gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-required={required || undefined}
            aria-expanded={open}
            disabled={disabled}
            className={cn("w-full justify-between gap-2 font-normal", !selectedDate && "text-muted-foreground", className)}
          >
            <span className="truncate">{selectedDate ? format(selectedDate, "PPP") : placeholder}</span>
            <CalendarDays data-icon="inline-end" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={selectDate}
            captionLayout="dropdown"
            startMonth={new Date(1900, 0, 1)}
            endMonth={new Date(2100, 11, 31)}
          />
          {clearable && selectedDate ? (
            <div className="border-t border-border p-2">
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={() => selectDate(undefined)}>
                <X data-icon="inline-start" />
                {t("common.clearDate")}
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      {name ? <input aria-hidden="true" className="sr-only" name={name} tabIndex={-1} type="text" value={selectedValue} readOnly /> : null}
    </div>
  )
}

function isoToDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) && isValid(date)
    ? date
    : undefined
}
