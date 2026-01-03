import * as React from "react"
import { format } from "date-fns"
import { sk } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DateTimePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  "data-testid"?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Vyberte dátum a čas",
  disabled = false,
  className,
  "data-testid": testId,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  const date = React.useMemo(() => {
    if (!value) return undefined
    const d = new Date(value)
    return isNaN(d.getTime()) ? undefined : d
  }, [value])

  const hours = date ? date.getHours().toString().padStart(2, '0') : "12"
  const minutes = date ? date.getMinutes().toString().padStart(2, '0') : "00"

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return
    
    const newDate = new Date(selectedDate)
    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    onChange?.(newDate.toISOString().slice(0, 16))
  }

  const handleTimeChange = (type: 'hours' | 'minutes', val: string) => {
    const baseDate = date || new Date()
    const newDate = new Date(baseDate)
    
    if (type === 'hours') {
      newDate.setHours(parseInt(val), parseInt(minutes), 0, 0)
    } else {
      newDate.setMinutes(parseInt(val), 0, 0)
    }
    
    onChange?.(newDate.toISOString().slice(0, 16))
  }

  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const minuteOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          data-testid={testId}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "d. MMMM yyyy, HH:mm", { locale: sk })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
        />
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Čas:</span>
            <Select value={hours} onValueChange={(val) => handleTimeChange('hours', val)}>
              <SelectTrigger className="w-[70px]" data-testid={testId ? `${testId}-hours` : undefined}>
                <SelectValue placeholder="HH" />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-lg font-medium">:</span>
            <Select value={minutes} onValueChange={(val) => handleTimeChange('minutes', val)}>
              <SelectTrigger className="w-[70px]" data-testid={testId ? `${testId}-minutes` : undefined}>
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {minuteOptions.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="border-t p-2">
          <Button 
            variant="default" 
            size="sm" 
            className="w-full"
            onClick={() => setOpen(false)}
          >
            Potvrdiť
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
