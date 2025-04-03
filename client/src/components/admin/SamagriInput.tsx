
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PujaSamagri } from '@/types/puja';
import { Plus, Trash2 } from 'lucide-react';

interface SamagriInputProps {
  samagri: PujaSamagri[];
  onChange: (samagri: PujaSamagri[]) => void;
}

export default function SamagriInput({ samagri, onChange }: SamagriInputProps) {
  const addSamagri = () => {
    onChange([...samagri, { name: '', quantity: 1, optional: false, price: 0 }]);
  };

  const removeSamagri = (index: number) => {
    onChange(samagri.filter((_, i) => i !== index));
  };

  const updateSamagri = (index: number, field: keyof PujaSamagri, value: string | number | boolean) => {
    const newSamagri = [...samagri];
    newSamagri[index] = { ...newSamagri[index], [field]: value };
    onChange(newSamagri);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Samagri Items</Label>
        <Button type="button" variant="outline" size="sm" onClick={addSamagri}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>
      
      {samagri.map((item, index) => (
        <div key={index} className="flex gap-4 items-center">
          <Input
            placeholder="Item name"
            value={item.name}
            onChange={(e) => updateSamagri(index, 'name', e.target.value)}
          />
          <Input
            type="number"
            min="1"
            className="w-24"
            value={item.quantity}
            onChange={(e) => updateSamagri(index, 'quantity', parseInt(e.target.value) || 1)}
            placeholder="Qty"
          />
          <Input
            type="number"
            min="0"
            className="w-24"
            value={item.price}
            onChange={(e) => updateSamagri(index, 'price', parseInt(e.target.value) || 0)}
            placeholder="Price"
          />
          <div className="flex items-center gap-2">
            <Switch
              id={`optional-${index}`}
              checked={item.optional}
              onCheckedChange={(checked) => updateSamagri(index, 'optional', checked)}
            />
            <Label htmlFor={`optional-${index}`}>Optional</Label>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => removeSamagri(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
