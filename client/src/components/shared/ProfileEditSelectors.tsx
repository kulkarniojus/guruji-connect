import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

/* ── Puja multi-select search dropdown ─────────────────────────────── */
interface PujaSelectProps {
  selectedPujas: string[];   // array of puja names
  onChange: (names: string[]) => void;
}

export function PujaMultiSelect({ selectedPujas, onChange }: PujaSelectProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data: pujas = [] } = useQuery<any[]>({
    queryKey: ['/api/pujas'],
    queryFn: async () => {
      const res = await fetch('/api/pujas');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filtered = pujas.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (name: string) => {
    const next = selectedPujas.includes(name)
      ? selectedPujas.filter(n => n !== name)
      : [...selectedPujas, name];
    onChange(next);
    setSearch('');
    setOpen(false);
  };

  return (
    <div>
      <div className="relative">
        <Input
          placeholder="Search and add puja specializations..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-52 overflow-y-auto">
              {filtered.length > 0 ? filtered.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 p-2.5 hover:bg-orange-50 cursor-pointer"
                  onClick={e => { e.stopPropagation(); toggle(p.name); }}
                >
                  <Checkbox
                    checked={selectedPujas.includes(p.name)}
                    className="pointer-events-none"
                  />
                  <span className="text-sm">{p.name}</span>
                </div>
              )) : (
                <div className="p-3 text-sm text-gray-500">No pujas found</div>
              )}
            </div>
          </>
        )}
      </div>
      {selectedPujas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedPujas.map(name => (
            <Badge key={name} variant="secondary" className="flex items-center gap-1 text-xs">
              {name}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => onChange(selectedPujas.filter(n => n !== name))}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── City multi-select checkbox grid ────────────────────────────────── */
interface CitySelectProps {
  selectedCities: string[];   // array of city names
  onChange: (names: string[]) => void;
}

export function CityMultiSelect({ selectedCities, onChange }: CitySelectProps) {
  const { data: cities = [] } = useQuery<any[]>({
    queryKey: ['/api/cities'],
    queryFn: async () => {
      const res = await fetch('/api/cities');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const toggle = (name: string) => {
    const next = selectedCities.includes(name)
      ? selectedCities.filter(n => n !== name)
      : [...selectedCities, name];
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-lg p-3 max-h-40 overflow-y-auto bg-white">
        {cities.map((c: any) => (
          <div key={c.id} className="flex items-center space-x-2">
            <Checkbox
              id={`edit-city-${c.id}`}
              checked={selectedCities.includes(c.name)}
              onCheckedChange={() => toggle(c.name)}
            />
            <Label htmlFor={`edit-city-${c.id}`} className="text-sm cursor-pointer">
              {c.name}
            </Label>
          </div>
        ))}
      </div>
      {selectedCities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedCities.map(name => (
            <Badge key={name} variant="secondary" className="flex items-center gap-1 text-xs">
              {name}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => onChange(selectedCities.filter(n => n !== name))}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
