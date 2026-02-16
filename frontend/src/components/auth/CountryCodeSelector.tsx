import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const countries = [
  { name: "India", code: "IN", dial_code: "+91" },
  { name: "United States", code: "US", dial_code: "+1" },
  { name: "United Kingdom", code: "GB", dial_code: "+44" },
  { name: "United Arab Emirates", code: "AE", dial_code: "+971" },
  { name: "Australia", code: "AU", dial_code: "+61" },
  { name: "Canada", code: "CA", dial_code: "+1" },
  { name: "Singapore", code: "SG", dial_code: "+65" },
  { name: "Germany", code: "DE", dial_code: "+49" },
  { name: "France", code: "FR", dial_code: "+33" },
  { name: "Japan", code: "JP", dial_code: "+81" },
  { name: "China", code: "CN", dial_code: "+86" },
  { name: "Brazil", code: "BR", dial_code: "+55" },
  { name: "Russia", code: "RU", dial_code: "+7" },
  { name: "South Africa", code: "ZA", dial_code: "+27" },
  { name: "Saudi Arabia", code: "SA", dial_code: "+966" },
];

interface CountryCodeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CountryCodeSelector({ value, onChange, disabled }: CountryCodeSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCountry = countries.find((country) => country.dial_code === value) || countries[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex gap-2 px-3 h-11 min-w-[110px] justify-between items-center rounded-xl bg-muted/30 border-input hover:bg-muted/50 transition-colors shadow-sm",
            open && "border-primary ring-1 ring-primary"
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <img
              src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
              alt={selectedCountry.name}
              className="w-5 h-auto rounded-[2px] shadow-[0_0_1px_rgba(0,0,0,0.5)]"
            />
            <span className="font-bold text-foreground text-sm">{selectedCountry.dial_code}</span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0 shadow-2xl border-border rounded-2xl overflow-hidden" align="start" sideOffset={8}>
        <Command className="rounded-none">
          <div className="flex items-center border-b px-3 bg-muted/20">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput 
              placeholder="Search country..." 
              className="h-11 bg-transparent focus:ring-0 border-none px-0"
            />
          </div>
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">No country found.</CommandEmpty>
            <CommandGroup className="p-1">
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    onChange(country.dial_code);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg aria-selected:bg-primary/10 transition-colors"
                >
                  <img
                    src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                    alt={country.name}
                    className="w-6 h-auto rounded-[2px] shadow-[0_0_1px_rgba(0,0,0,0.5)]"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{country.name}</span>
                    <span className="text-xs text-muted-foreground">{country.dial_code}</span>
                  </div>
                  {value === country.dial_code && (
                    <div className="bg-primary/20 p-0.5 rounded-full">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
