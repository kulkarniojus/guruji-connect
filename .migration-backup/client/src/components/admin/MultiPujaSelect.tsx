import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

export type PujaChoice = { id: number; name: string };

export default function MultiPujaSelect({
  pujas,
  selectedIds,
  onChange,
  idPrefix,
  allLabel,
  allSelected = false,
  onAllChange,
}: {
  pujas: PujaChoice[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  idPrefix: string;
  allLabel?: string;
  allSelected?: boolean;
  onAllChange?: (selected: boolean) => void;
}) {
  const [search, setSearch] = useState('');
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return term ? pujas.filter(p => p.name.toLocaleLowerCase().includes(term)) : pujas;
  }, [pujas, search]);
  const toggle = (id: number, checked: boolean) => {
    onChange(checked ? Array.from(new Set([...selectedIds, id])).sort((a, b) => a - b) : selectedIds.filter(value => value !== id));
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Applies to</legend>
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search pujas"
          className="pl-9"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search pujas"
        />
      </div>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2" aria-label="Puja selection">
        {allLabel && onAllChange && (
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
            <Checkbox checked={allSelected} onCheckedChange={value => onAllChange(value === true)} />
            <span>{allLabel}</span>
          </label>
        )}
        {visible.length ? visible.map(puja => (
          <label key={puja.id} htmlFor={`${idPrefix}-${puja.id}`} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
            <Checkbox
              id={`${idPrefix}-${puja.id}`}
              checked={selectedIds.includes(puja.id)}
              onCheckedChange={value => toggle(puja.id, value === true)}
              disabled={allSelected}
            />
            <span>{puja.name}</span>
          </label>
        )) : <p className="px-2 py-3 text-sm text-muted-foreground">No pujas match your search.</p>}
      </div>
      {!allSelected && <p className="text-xs text-muted-foreground">{selectedIds.length} puja{selectedIds.length === 1 ? '' : 's'} selected</p>}
    </fieldset>
  );
}
