import { useEffect, useId, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const GURUJI_LANGUAGES = [
  'Hindi', 'English', 'Sanskrit', 'Bengali', 'Tamil', 'Telugu', 'Marathi',
  'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Odia',
];

type SelectionFieldProps = {
  selected: string[];
  onChange: (values: string[]) => void;
  error?: string;
  required?: boolean;
};

type City = { id: number | string; name: string };
type Puja = { id: number | string; name: string; description?: string };

type ServiceAreasFieldProps = SelectionFieldProps & {
  cities: City[];
  isLoading?: boolean;
  isError?: boolean;
};

type PujaSpecializationsFieldProps = SelectionFieldProps & {
  pujas: Puja[];
  isLoading?: boolean;
  isError?: boolean;
};

function FieldError({ children }: { children?: string }) {
  return children ? <p className="text-sm text-red-500" role="alert">{children}</p> : null;
}

function FieldState({ isLoading, isError, empty, loadingText, errorText }: {
  isLoading?: boolean;
  isError?: boolean;
  empty: boolean;
  loadingText: string;
  errorText: string;
}) {
  if (isLoading) return <p className="text-sm text-muted-foreground" role="status">{loadingText}</p>;
  if (isError) return <p className="text-sm text-destructive" role="alert">{errorText}</p>;
  if (empty) return <p className="text-sm text-muted-foreground">No options are available right now.</p>;
  return null;
}

function SelectionChips({ values, getLabel, onRemove }: {
  values: string[];
  getLabel: (value: string) => string | undefined;
  onRemove: (value: string) => void;
}) {
  const visible = values.map(value => ({ value, label: getLabel(value) })).filter(
    (item): item is { value: string; label: string } => Boolean(item.label),
  );
  if (!visible.length) return null;
  return (
    <div className="flex flex-wrap gap-2" aria-label="Selected items">
      {visible.map(({ value, label }) => (
        <Badge key={value} variant="secondary" className="gap-1.5 py-1">
          <span>{label}</span>
          <button
            type="button"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Remove ${label}`}
            onClick={() => onRemove(value)}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

function toggleValue(selected: string[], value: string) {
  return selected.includes(value)
    ? selected.filter(item => item !== value)
    : [...selected, value];
}

export function ServiceAreasField({
  selected, onChange, cities, isLoading, isError, error, required,
}: ServiceAreasFieldProps) {
  const id = useId();
  const available = !isLoading && !isError && cities.length > 0;
  const byId = new Map(cities.map(city => [String(city.id), city]));
  const toggle = (cityId: string) => onChange(toggleValue(selected, cityId));

  return (
    <section className="space-y-4" data-testid="guruji-service-areas" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-lg font-semibold">
        Service Areas{required && <span aria-hidden="true"> *</span>}
      </h3>
      <p className="text-sm text-muted-foreground">Select cities where you can provide services</p>
      <FieldState
        isLoading={isLoading}
        isError={isError}
        empty={cities.length === 0}
        loadingText="Loading cities..."
        errorText="We couldn't load cities. Please try again later."
      />
      {available && (
        <div className="grid max-h-48 grid-cols-2 gap-3 overflow-y-auto rounded-lg border p-4 md:grid-cols-3 lg:grid-cols-4">
          {cities.map(city => {
            const cityId = String(city.id);
            const checkboxId = `${id}-city-${cityId}`;
            return (
              <div key={cityId} className="flex items-center space-x-2">
                <Checkbox
                  id={checkboxId}
                  checked={selected.includes(cityId)}
                  onCheckedChange={() => toggle(cityId)}
                />
                <Label htmlFor={checkboxId} className="cursor-pointer text-sm">{city.name}</Label>
              </div>
            );
          })}
        </div>
      )}
      <SelectionChips
        values={selected}
        getLabel={value => byId.get(value)?.name}
        onRemove={toggle}
      />
      <FieldError>{error}</FieldError>
    </section>
  );
}

export function PujaSpecializationsField({
  selected, onChange, pujas, isLoading, isError, error, required,
}: PujaSpecializationsFieldProps) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const byId = new Map(pujas.map(puja => [String(puja.id), puja]));
  const filtered = pujas.filter(puja => puja.name.toLowerCase().includes(search.trim().toLowerCase()));
  const available = !isLoading && !isError && pujas.length > 0;

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  const toggle = (pujaId: string) => onChange(toggleValue(selected, pujaId));

  return (
    <section className="space-y-4" data-testid="guruji-puja-specializations" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-lg font-semibold">
        Puja Specializations{required && <span aria-hidden="true"> *</span>}
      </h3>
      <FieldState
        isLoading={isLoading}
        isError={isError}
        empty={pujas.length === 0}
        loadingText="Loading pujas..."
        errorText="We couldn't load puja specializations. Please try again later."
      />
      {available && (
        <div className="relative" ref={containerRef}>
          <Input
            id={`${id}-search`}
            role="combobox"
            aria-label="Search puja specializations"
            aria-expanded={open}
            aria-controls={`${id}-options`}
            aria-autocomplete="list"
            placeholder="Search and select puja specializations..."
            value={search}
            onChange={event => { setSearch(event.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={event => {
              if (event.key === 'Escape') setOpen(false);
              if (event.key === 'ArrowDown' && filtered.length) {
                event.preventDefault();
                (document.getElementById(`${id}-option-${String(filtered[0].id)}`) as HTMLButtonElement | null)?.focus();
              }
            }}
          />
          {open && (
            <div
              id={`${id}-options`}
              className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-300 bg-background shadow-lg"
              role="listbox"
              aria-label="Puja specializations"
              aria-multiselectable="true"
            >
              {filtered.length ? filtered.map(puja => {
                const pujaId = String(puja.id);
                const isSelected = selected.includes(pujaId);
                return (
                  <button
                    id={`${id}-option-${pujaId}`}
                    key={pujaId}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className="flex w-full items-start gap-2 p-3 text-left hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onKeyDown={event => {
                      const optionIndex = filtered.findIndex(item => String(item.id) === pujaId);
                      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        const nextIndex = event.key === 'ArrowDown'
                          ? (optionIndex + 1) % filtered.length
                          : (optionIndex - 1 + filtered.length) % filtered.length;
                        (document.getElementById(`${id}-option-${String(filtered[nextIndex].id)}`) as HTMLButtonElement | null)?.focus();
                      }
                      if (event.key === 'Escape') {
                        setOpen(false);
                        (document.getElementById(`${id}-search`) as HTMLInputElement | null)?.focus();
                      }
                    }}
                    onClick={() => {
                      toggle(pujaId);
                      setSearch('');
                      setOpen(false);
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{puja.name}</span>
                      {puja.description && <span className="block text-xs text-muted-foreground">{puja.description}</span>}
                    </span>
                  </button>
                );
              }) : (
                <p className="p-3 text-sm text-muted-foreground" role="status">No pujas found</p>
              )}
            </div>
          )}
        </div>
      )}
      <SelectionChips
        values={selected}
        getLabel={value => byId.get(value)?.name}
        onRemove={toggle}
      />
      <FieldError>{error}</FieldError>
    </section>
  );
}

export function LanguagesField({ selected, onChange, error, required }: SelectionFieldProps) {
  const id = useId();
  const toggle = (language: string) => onChange(toggleValue(selected, language));
  return (
    <section className="space-y-4" data-testid="guruji-languages" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-lg font-semibold">
        Languages{required && <span aria-hidden="true"> *</span>}
      </h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {GURUJI_LANGUAGES.map(language => {
          const checkboxId = `${id}-language-${language}`;
          return (
            <div key={language} className="flex items-center space-x-2">
              <Checkbox
                id={checkboxId}
                checked={selected.includes(language)}
                onCheckedChange={() => toggle(language)}
              />
              <Label htmlFor={checkboxId} className="cursor-pointer text-sm">{language}</Label>
            </div>
          );
        })}
      </div>
      <SelectionChips values={selected} getLabel={value => GURUJI_LANGUAGES.includes(value) ? value : undefined} onRemove={toggle} />
      <FieldError>{error}</FieldError>
    </section>
  );
}