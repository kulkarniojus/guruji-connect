import React, { useState } from 'react';
import SamagriInput from './SamagriInput';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PujaImage from '@/components/PujaImage';
import type { PujaSamagri } from '@/types/puja';

// Define types based on the schema
interface Puja {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  price?: number;
  imageUrl?: string;
  items?: string[];
  isPopular: boolean;
  isActive: boolean;
  type: 'offline' | 'online';
  duration: number; // in minutes
  createdAt: string;
  updatedAt: string;
}

interface PujaFormData {
  name: string;
  description: string;
  basePrice: number;
  price?: number;
  imageUrl?: string;
  items?: string[];
  samagri?: PujaSamagri[];
  samagriPrice?: number;
  isPopular: boolean;
  isActive: boolean;
  type: 'offline' | 'online';
  duration: number; // in minutes
}

export default function PujaManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPuja, setSelectedPuja] = useState<Puja | null>(null);
  const [formData, setFormData] = useState<PujaFormData>({
    name: '',
    description: '',
    basePrice: 0,
    price: undefined,
    imageUrl: '',
    items: [],
    samagri: [],
    isPopular: false,
    isActive: true,
    type: 'offline',
    duration: 120,
  });
  const [durationHoursInput, setDurationHoursInput] = useState('2');
  const [itemsInput, setItemsInput] = useState('');
  const [pujaSearch, setPujaSearch] = useState('');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch pujas from the API
  const { 
    data: apiPujas, 
    isLoading: isApiLoading, 
    error: apiError 
  } = useQuery<Puja[]>({
    queryKey: ['/api/pujas', 'admin-catalog'],
    queryFn: async () => (await apiRequest('GET', '/api/pujas?includeInactive=true')).json(),
  });

  const pujas = apiPujas ?? [];
  const filteredPujas = pujas.filter(puja => puja.name.toLocaleLowerCase().includes(pujaSearch.trim().toLocaleLowerCase()));
  const isLoading = isApiLoading;
  const error = apiError;

  // Confirm persistence before reporting success or closing the editor.
  const createRealPujaMutation = useMutation({
    mutationFn: async (data: PujaFormData) => {
      const response = await apiRequest('POST', '/api/pujas', data);
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/pujas'] });
      toast({ title: 'Success', description: 'Puja created successfully' });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create puja',
        variant: 'destructive',
      });
    }
  });

  const updateRealPujaMutation = useMutation({
    mutationFn: async (data: { id: number; puja: PujaFormData }) => {
      const response = await apiRequest('PUT', `/api/pujas/${data.id}`, data.puja);
      return await response.json();
    },
    onSuccess: async (puja) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/pujas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pujas', String(puja.id)] });
      queryClient.invalidateQueries({ queryKey: [`/api/pujas/${puja.id}`] });
      toast({ title: 'Success', description: 'Puja updated successfully' });
      resetForm();
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update puja',
        variant: 'destructive',
      });
    }
  });

  const deleteRealPujaMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/pujas/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/pujas'] });
      toast({ title: 'Success', description: 'Puja deactivated successfully' });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete puja',
        variant: 'destructive',
      });
    }
  });

  // Do not show success or discard entered settings until the server saves them.
  const createPujaMutation = createRealPujaMutation;
  const updatePujaMutation = updateRealPujaMutation;
  const deletePujaMutation = deleteRealPujaMutation;

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      basePrice: 0,
      price: undefined,
      imageUrl: '',
      items: [],
      isPopular: false,
      isActive: true,
      type: 'offline',
      duration: 120,
    });
    setItemsInput('');
    setDurationHoursInput('2');
    setSelectedPuja(null);
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Handle number inputs
    if (name === 'basePrice' || name === 'price' || name === 'samagriPrice') {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'price' && !value.trim() ? undefined : parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle boolean inputs (switches)
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Handle type select
  const handleTypeChange = (value: 'offline' | 'online') => {
    setFormData(prev => ({
      ...prev,
      type: value
    }));
  };

  // Handle items input (comma-separated list)
  const handleItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setItemsInput(e.target.value);

    // Convert comma-separated string to array
    const itemsArray = e.target.value.split(',').map(item => item.trim()).filter(Boolean);

    setFormData(prev => ({
      ...prev,
      items: itemsArray
    }));
  };

  // Handle edit puja
  const handleEditPuja = (puja: Puja) => {
    setSelectedPuja(puja);
    setFormData({
      name: puja.name,
      description: puja.description,
      basePrice: puja.basePrice,
      price: puja.price ?? undefined,
      imageUrl: puja.imageUrl || '',
      items: puja.items || [],
      isPopular: puja.isPopular,
      isActive: puja.isActive,
      type: puja.type,
      duration: puja.duration,
    });
    setDurationHoursInput(String(puja.duration / 60));
    setItemsInput(puja.items?.join(', ') || '');
    setIsEditDialogOpen(true);
  };

  // Handle delete puja
  const handleDeletePuja = (puja: Puja) => {
    setSelectedPuja(puja);
    setIsDeleteDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const imageUrl = formData.imageUrl?.trim() || '';
    if (imageUrl && !/^\/(?!\/)/.test(imageUrl)) {
      try {
        const url = new URL(imageUrl);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid photo URL');
      } catch {
        toast({ title: 'Invalid photo URL', description: 'Use an HTTP/HTTPS image URL or a site image path beginning with /.', variant: 'destructive' });
        return;
      }
    }
    const hours = Number(durationHoursInput);
    if (!durationHoursInput.trim() || !Number.isFinite(hours) || hours < 0 || hours > 24 ||
        !Number.isInteger(hours * 60)) {
      toast({ title: 'Duration required', description: 'Enter a duration from 0 to 24 hours (0 only for exceptions).', variant: 'destructive' });
      return;
    }

    if (selectedPuja) {
      // Update existing puja
      updatePujaMutation.mutate({ id: selectedPuja.id, puja: { ...formData, imageUrl } });
    } else {
      // Create new puja
      createPujaMutation.mutate({ ...formData, imageUrl });
    }
  };

  // Format duration as hours and minutes
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${mins > 0 ? `${mins}m` : hours === 0 ? '0m' : ''}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Puja Management</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Puja
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search puja catalogue"
          placeholder="Search puja catalogue"
          value={pujaSearch}
          onChange={event => setPujaSearch(event.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center text-destructive p-4 border border-destructive/20 rounded-md">
          Error loading pujas. Please try again.
        </div>
      ) : pujas?.length === 0 ? (
        <div className="text-center p-8 border rounded-md">
          <p className="text-muted-foreground">No pujas found. Add your first puja to get started.</p>
        </div>
      ) : filteredPujas.length === 0 ? (
        <div className="text-center p-8 border border-dashed rounded-md">
          <p className="font-medium">No matching pujas</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Popular</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPujas.map((puja: Puja) => (
                <TableRow key={puja.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <PujaImage imageUrl={puja.imageUrl} name={puja.name} className="max-w-20 shrink-0 rounded-md" />
                      <span>{puja.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={puja.type === 'online' ? 'default' : 'outline'}>
                      {puja.type === 'online' ? 'Online' : 'Offline'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {puja.price !== undefined && puja.price !== null ? (
                      <div className="flex flex-col leading-tight">
                        <span className="font-semibold">₹{puja.price}</span>
                        <span className="text-xs text-muted-foreground line-through">₹{puja.basePrice}</span>
                      </div>
                    ) : (
                      <>₹{puja.basePrice}</>
                    )}
                  </TableCell>
                  <TableCell>{formatDuration(puja.duration)}</TableCell>
                  <TableCell>
                    <Badge variant={puja.isActive ? 'default' : 'destructive'}>
                      {puja.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {puja.isPopular ? (
                      <Badge variant="secondary">Popular</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${puja.name}`} onClick={() => handleEditPuja(puja)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Deactivate ${puja.name}`} onClick={() => handleDeletePuja(puja)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Puja Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Puja</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="basePrice">Base Price (₹) *</Label>
                  <Input
                    id="basePrice"
                    name="basePrice"
                    type="number"
                    value={formData.basePrice}
                    onChange={handleInputChange}
                    required
                    min={0}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Sale Price (₹)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    value={formData.price ?? ''}
                    onChange={handleInputChange}
                    min={0}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'offline' | 'online') => handleTypeChange(value)}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration">Booking duration (hours) *</Label>
                  <Input
                    id="duration"
                    name="durationHours"
                    type="number"
                    value={durationHoursInput}
                    onChange={(e) => {
                      setDurationHoursInput(e.target.value);
                      if (e.target.value !== '') setFormData(prev => ({ ...prev, duration: Math.round(Number(e.target.value) * 60) }));
                    }}
                    required
                    min={0}
                    max={24}
                    step={0.25}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Required for every puja. Use 0 only for exceptional cases; it reserves only the selected starting minute.</p>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="imageUrl">Photo URL</Label>
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    value={formData.imageUrl || ''}
                    onChange={handleInputChange}
                    placeholder="https://example.com/puja.jpg or /images/pujas/ganesh.jpg"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Use a direct image link. Leave blank to remove the photo.</p>
                  {formData.imageUrl && <PujaImage imageUrl={formData.imageUrl} name={formData.name || 'Puja preview'} className="mt-3 max-w-xs rounded-lg" />}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="samagriPrice">Samagri Price (₹)</Label>
                  <Input
                    id="samagriPrice"
                    name="samagriPrice"
                    type="number"
                    value={formData.samagriPrice || 0}
                    onChange={handleInputChange}
                    min={0}
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-2 max-h-[300px] overflow-y-auto">
                  <SamagriInput 
                    samagri={formData.samagri || []}
                    onChange={(samagri) => {
                      const totalPrice = samagri.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                      setFormData(prev => ({ 
                        ...prev, 
                        samagri,
                        samagriPrice: totalPrice
                      }));
                    }}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPopular"
                    checked={formData.isPopular}
                    onCheckedChange={(checked) => handleSwitchChange('isPopular', checked)}
                  />
                  <Label htmlFor="isPopular">Mark as Popular</Label>
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">Active pujas marked popular appear in the homepage Popular Pujas section.</p>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleSwitchChange('isActive', checked)}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => {
                resetForm();
                setIsAddDialogOpen(false);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPujaMutation.isPending}>
                {createPujaMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Puja'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Puja Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Puja</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-description">Description *</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-basePrice">Base Price (₹) *</Label>
                  <Input
                    id="edit-basePrice"
                    name="basePrice"
                    type="number"
                    value={formData.basePrice}
                    onChange={handleInputChange}
                    required
                    min={0}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-price">Sale Price (₹)</Label>
                  <Input
                    id="edit-price"
                    name="price"
                    type="number"
                    value={formData.price ?? ''}
                    onChange={handleInputChange}
                    min={0}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-type">Type *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'offline' | 'online') => handleTypeChange(value)}
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-duration">Booking duration (hours) *</Label>
                  <Input
                    id="edit-duration"
                    name="durationHours"
                    type="number"
                    value={durationHoursInput}
                    onChange={(e) => {
                      setDurationHoursInput(e.target.value);
                      if (e.target.value !== '') setFormData(prev => ({ ...prev, duration: Math.round(Number(e.target.value) * 60) }));
                    }}
                    required
                    min={0}
                    max={24}
                    step={0.25}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Use 0 only for exceptional cases; it reserves only the selected starting minute.</p>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-imageUrl">Photo URL</Label>
                  <Input
                    id="edit-imageUrl"
                    name="imageUrl"
                    value={formData.imageUrl || ''}
                    onChange={handleInputChange}
                    placeholder="https://example.com/puja.jpg or /images/pujas/ganesh.jpg"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Use a direct image link. Leave blank to remove the photo.</p>
                  {formData.imageUrl && <PujaImage imageUrl={formData.imageUrl} name={formData.name || 'Puja preview'} className="mt-3 max-w-xs rounded-lg" />}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-items">Items (comma-separated)</Label>
                  <Input
                    id="edit-items"
                    name="items"
                    value={itemsInput}
                    onChange={handleItemsChange}
                    placeholder="e.g. incense, flowers, ghee"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-samagriPrice">Samagri Price (₹)</Label>
                  <Input
                    id="edit-samagriPrice"
                    name="samagriPrice"
                    type="number"
                    value={formData.samagriPrice || 0}
                    onChange={handleInputChange}
                    min={0}
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-2 max-h-[300px] overflow-y-auto">
                  <SamagriInput 
                    samagri={formData.samagri || []}
                    onChange={(samagri) => {
                      const totalPrice = samagri.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                      setFormData(prev => ({ 
                        ...prev, 
                        samagri,
                        samagriPrice: totalPrice
                      }));
                    }}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isPopular"
                    checked={formData.isPopular}
                    onCheckedChange={(checked) => handleSwitchChange('isPopular', checked)}
                  />
                  <Label htmlFor="edit-isPopular">Mark as Popular</Label>
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">Active pujas marked popular appear in the homepage Popular Pujas section.</p>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleSwitchChange('isActive', checked)}
                  />
                  <Label htmlFor="edit-isActive">Active</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => {
                resetForm();
                setIsEditDialogOpen(false);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatePujaMutation.isPending}>
                {updatePujaMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Puja'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Deactivate Puja</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Hide "{selectedPuja?.name}" from the public catalogue and Popular Pujas? You can reactivate it later using Edit.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedPuja && deletePujaMutation.mutate(selectedPuja.id)}
              disabled={deletePujaMutation.isPending}
            >
              {deletePujaMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}