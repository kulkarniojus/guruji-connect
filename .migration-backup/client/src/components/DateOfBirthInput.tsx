import * as React from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { birthDateDisplay, birthDateISO, isPastBirthDate, parseBirthDate } from "@/lib/birthDate";
import { cn } from "@/lib/utils";

type DateOfBirthInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dateFromValue(value: string): Date | undefined {
  const parsed = parseBirthDate(value);
  return parsed && isPastBirthDate(value) ? parsed : undefined;
}

export const DateOfBirthInput = React.forwardRef<HTMLInputElement, DateOfBirthInputProps>(
  ({ value, onChange, onBlur, name, id, disabled, className, ...inputProps }, ref) => {
    const [draft, setDraft] = React.useState(() => (value ? birthDateDisplay(value) : ""));
    const [open, setOpen] = React.useState(false);
    const [month, setMonth] = React.useState<Date>(() => dateFromValue(value) ?? new Date());
    const previousValue = React.useRef(value);
    const ownUpdate = React.useRef<string | null>(null);
    const currentYear = new Date().getFullYear();

    React.useEffect(() => {
      if (value === previousValue.current) return;
      previousValue.current = value;
      if (ownUpdate.current === value) {
        ownUpdate.current = null;
        return;
      }
      ownUpdate.current = null;
      setDraft(value ? birthDateDisplay(value) : "");
    }, [value]);

    const sendValue = React.useCallback((next: string) => {
      previousValue.current = next;
      ownUpdate.current = next;
      onChange(next);
    }, [onChange]);

    const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.currentTarget.value;
      setDraft(next);
      const parsed = parseBirthDate(next);
      sendValue(parsed && isPastBirthDate(birthDateISO(parsed)) ? birthDateISO(parsed) : next);
    };

    const handleSelect = (selected: Date | undefined) => {
      if (!selected) return;
      const canonical = birthDateISO(selected);
      const localDisplay = birthDateDisplay(canonical);
      setDraft(localDisplay);
      sendValue(canonical);
      setMonth(selected);
      setOpen(false);
    };

    const selectedDate = dateFromValue(value);
    const changeCalendarMonth = (year: number, monthIndex: number) => {
      setMonth(new Date(year, monthIndex, 1, 12));
    };

    return (
      <div className="w-full">
        <div className="relative flex w-full items-center">
          <input
            {...inputProps}
            ref={ref}
            type="text"
            inputMode="text"
            autoComplete={inputProps.autoComplete ?? "bday"}
            placeholder="DD/MM/YYYY"
            value={draft}
            onChange={handleTextChange}
            onBlur={onBlur}
            name={name}
            id={id}
            disabled={disabled}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-12 text-sm text-foreground shadow-sm transition-colors",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
          />
          <Popover
            open={open}
            onOpenChange={(nextOpen) => {
              if (disabled) return;
              setOpen(nextOpen);
              if (nextOpen) setMonth(dateFromValue(value) ?? new Date());
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Choose date of birth"
                aria-expanded={open}
                disabled={disabled}
                className="absolute right-1.5 inline-flex h-8 w-9 items-center justify-center rounded text-purple-700 transition-colors hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarDays aria-hidden="true" className="h-[18px] w-[18px]" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={7}
              className="w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border-purple-100 bg-white p-3 shadow-lg"
            >
              <div className="mb-2 flex gap-2">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Choose month</span>
                  <select
                    aria-label="Choose month"
                    value={month.getMonth()}
                    onChange={(event) => changeCalendarMonth(month.getFullYear(), Number(event.target.value))}
                    className="h-9 w-full appearance-none rounded-md border border-purple-100 bg-purple-50/60 py-1 pl-3 pr-8 text-sm font-medium text-purple-950 outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    {MONTHS.map((monthName, index) => (
                      <option key={monthName} value={index}>{monthName}</option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-purple-600" />
                </label>
                <label className="relative w-28 shrink-0">
                  <span className="sr-only">Choose year</span>
                  <select
                    aria-label="Choose year"
                    value={month.getFullYear()}
                    onChange={(event) => changeCalendarMonth(Number(event.target.value), month.getMonth())}
                    className="h-9 w-full appearance-none rounded-md border border-purple-100 bg-purple-50/60 py-1 pl-3 pr-8 text-sm font-medium text-purple-950 outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    {Array.from({ length: currentYear - 1900 + 1 }, (_, index) => currentYear - index).map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-purple-600" />
                </label>
              </div>
              <Calendar
                mode="single"
                month={month}
                onMonthChange={setMonth}
                selected={selectedDate}
                onSelect={handleSelect}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(23, 59, 59, 999);
                  return date.getFullYear() < 1900 || date > today;
                }}
                fromYear={1900}
                toYear={currentYear}
                showOutsideDays
                className="mx-auto p-0"
                classNames={{
                  caption: "hidden",
                  nav: "hidden",
                  head_cell: "w-9 rounded-md text-[0.7rem] font-medium text-purple-500",
                  row: "mt-1 flex w-full",
                  cell: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
                  day: "h-9 w-9 rounded-md p-0 text-sm font-normal text-purple-950 transition-colors hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
                  day_selected: "bg-purple-700 font-semibold text-white hover:bg-purple-700 hover:text-white focus:bg-purple-700 focus:text-white",
                  day_today: "bg-purple-50 font-semibold text-purple-800",
                  day_outside: "text-purple-300 opacity-60",
                  day_disabled: "cursor-not-allowed text-purple-200 opacity-50 hover:bg-transparent",
                }}
              />
              <p className="mt-2 border-t border-purple-100 pt-2 text-center text-xs text-purple-500">
                Choose a date on or before today
              </p>
            </PopoverContent>
          </Popover>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">Enter as DD/MM/YYYY, or choose a date from the calendar.</p>
      </div>
    );
  },
);

DateOfBirthInput.displayName = "DateOfBirthInput";