import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

type Category = { id: number; name: string; description?: string; basePrice?: number };

export default function OtherCategorySelector({
  selectedIds,
  onChange,
}: {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [otherSelected, setOtherSelected] = useState(selectedIds.length > 0);
  useEffect(() => {
    if (selectedIds.length > 0) setOtherSelected(true);
  }, [selectedIds.length]);

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['/api/other-categories'],
    queryFn: async () => {
      const response = await fetch('/api/other-categories');
      if (!response.ok) throw new Error('Could not load additional categories');
      return response.json();
    },
    staleTime: 30000,
  });

  const toggle = (id: number) => onChange(
    selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id],
  );

  return (
    <section className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/60 p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={otherSelected}
          onCheckedChange={(checked) => {
            const selected = checked === true;
            setOtherSelected(selected);
            if (!selected) onChange([]);
          }}
          aria-label="Register under an Other category"
        />
        <div>
        <h3 className="text-sm font-semibold text-gray-900">Register under an Other category (optional)</h3>
        <p className="mt-1 text-xs text-gray-600">
          Choose this option to register for additional services. Each application needs approval from the Vaidik Dhara support team.
        </p>
        </div>
      </div>
      {otherSelected && (isLoading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading categories
        </div>
      ) : categories.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map(category => (
            <label key={category.id} className="flex cursor-pointer items-start gap-2 rounded-md border bg-white p-3">
              <Checkbox
                checked={selectedIds.includes(category.id)}
                onCheckedChange={() => toggle(category.id)}
                aria-label={`Register for ${category.name}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{category.name}</span>
                {category.description && <span className="mt-0.5 block text-xs text-gray-500">{category.description}</span>}
              </span>
              <Badge variant="outline" className="shrink-0 text-[10px]">Approval required</Badge>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No additional categories are currently open for registration.</p>
      ))}
    </section>
  );
}
