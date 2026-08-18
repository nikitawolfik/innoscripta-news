import { format, parseISO, subDays } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { toDateParam } from "~/lib/filters";

type Preset = {
  label: string;
  /** Days back from today; null clears the range ("All time"). */
  days: number | null;
};

const PRESETS: Preset[] = [
  { label: "Last 24 hours", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "All time", days: null },
];

const TRIGGER_DATE_FORMAT = "d MMM yyyy";

interface Props {
  from: string | null;
  to: string | null;
  onChange: (range: { from: string | null; to: string | null }) => void;
  triggerClassName?: string;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  triggerClassName,
}: Props) {
  const selectedRange: DateRange | undefined = from
    ? { from: parseISO(from), to: to ? parseISO(to) : undefined }
    : undefined;

  function applyPreset(preset: Preset) {
    if (preset.days === null) {
      onChange({ from: null, to: null });
      return;
    }

    const today = new Date();

    onChange({
      from: toDateParam(subDays(today, preset.days)),
      to: toDateParam(today),
    });
  }

  function handleSelect(range: DateRange | undefined) {
    onChange({
      from: range?.from ? toDateParam(range.from) : null,
      to: range?.to ? toDateParam(range.to) : null,
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          {/* Grouped so `justify-between` splits label from chevron rather than
              stranding the calendar icon on its own. */}
          <span className="flex items-center gap-2">
            <CalendarIcon aria-hidden="true" />
            {formatTriggerLabel(from, to)}
          </span>
          <ChevronDown aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto flex-row gap-3">
        <div className="flex flex-col gap-1">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              className="justify-start"
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleSelect}
          defaultMonth={selectedRange?.from}
        />
      </PopoverContent>
    </Popover>
  );
}

function formatTriggerLabel(from: string | null, to: string | null): string {
  if (!from && !to) {
    return "Any time";
  }

  const fromLabel = from
    ? format(parseISO(from), TRIGGER_DATE_FORMAT)
    : "Earliest";
  const toLabel = to ? format(parseISO(to), TRIGGER_DATE_FORMAT) : "today";

  return `${fromLabel} – ${toLabel}`;
}
