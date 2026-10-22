import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PujaSamagri } from '@/types/puja';
import { Plus, Trash2 } from 'lucide-react';
import { requestSamagriUpload, completeSamagriUpload } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

interface SamagriInputProps {
  samagri: PujaSamagri[];
  onChange: (samagri: PujaSamagri[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export default function SamagriInput({ samagri, onChange, onUploadingChange }: SamagriInputProps) {
  const [uploading, setUploading] = useState<number | null>(null);
  const { toast } = useToast();
  const uploadPhoto = async (index: number, file: File) => {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) {
      toast({ title: 'Use JPG, PNG or WebP, maximum 5 MB', variant: 'destructive' }); return;
    }
    setUploading(index);
    onUploadingChange?.(true);
    try {
      const result = await requestSamagriUpload({ name: file.name, size: file.size,
        contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' });
      const response = await fetch(result.uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!response.ok) throw new Error('Photo upload failed');
      await completeSamagriUpload({ imageUrl: result.imageUrl });
      updateSamagri(index, 'imageUrl', result.imageUrl);
      toast({ title: 'Photo uploaded', description: 'Save the puja to keep this photo on its samagri list.' });
    } catch (error) {
      toast({ title: 'Photo could not be uploaded', description: error instanceof Error ? error.message : 'Please retry.', variant: 'destructive' });
    } finally { setUploading(null); onUploadingChange?.(false); }
  };
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
    <fieldset className="space-y-4 min-w-0" disabled={uploading !== null}>
      <div className="flex justify-between items-center">
        <Label>Required samagri · mandatory and optional</Label>
        <Button type="button" variant="outline" size="sm" onClick={addSamagri}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="max-h-[250px] overflow-y-auto"> {/* This line has been modified */}
      {samagri.map((item, index) => (
        <div key={index} className="mb-3 rounded border p-3 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
          <Input
            aria-label={`Samagri item ${index + 1}`}
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
          <Input className="w-28" placeholder="Unit (g, ml...)" aria-label="Quantity unit"
            value={item.unit ?? ''} onChange={event => updateSamagri(index, 'unit', event.target.value)} />
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
            <Label htmlFor={`optional-${index}`}>{item.optional ? 'Optional' : 'Mandatory'}</Label>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => removeSamagri(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {item.imageUrl && <><img src={item.imageUrl} alt={item.name || 'Samagri'} className="h-16 w-16 rounded object-cover" />
              <Button type="button" variant="ghost" size="sm" onClick={() => updateSamagri(index, 'imageUrl', '')}>Remove photo</Button></>}
            <label className="space-y-1">Photo (optional, JPG/PNG/WebP, up to 5 MB)
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
                const file = event.target.files?.[0]; if (file) void uploadPhoto(index, file); event.target.value = '';
              }} />
            </label>
          </div>
        </div>
      ))}
      </div>
      {uploading !== null && <p role="status" className="text-sm">Uploading photo… Please wait before saving this puja.</p>}
      <p className="text-xs text-muted-foreground">Customers see this list inside their booking. Mandatory items must be prepared; optional items are not required. This does not change the booking’s samagri selection.</p>
    </fieldset>
  );
}