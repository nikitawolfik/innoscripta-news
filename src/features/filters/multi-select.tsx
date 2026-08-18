import { ChevronDown } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export type MultiSelectOption = {
  value: string;
  label: string;
};

interface Props {
  label: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  triggerClassName?: string;
}

export function MultiSelect({
  label,
  options,
  values,
  onChange,
  triggerClassName,
}: Props) {
  const triggerLabel =
    values.length > 0 ? `${label} (${values.length})` : label;

  function toggleValue(optionValue: string, checked: boolean) {
    if (checked) {
      onChange([...values, optionValue]);
    } else {
      onChange(values.filter((value) => value !== optionValue));
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          {triggerLabel}
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={values.includes(option.value)}
            onCheckedChange={(checked) =>
              toggleValue(option.value, checked === true)
            }
            // Keep the menu open: picking several options is the common case.
            onSelect={(event) => event.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
