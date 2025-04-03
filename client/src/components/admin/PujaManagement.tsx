import React, { useState, useEffect } from 'react';
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
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    price: 0,
    imageUrl: '',
    items: [],
    samagri: [],
    isPopular: false,
    isActive: true,
    type: 'offline',
    duration: 60,
  });
  const [itemsInput, setItemsInput] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // For demo purposes, we're using a simpler approach to avoid unnecessary API calls
  // In production, this would use the actual API endpoint
  // Initial loading state
  const [isUiLoading, setIsUiLoading] = useState(true);
  
  // Fetch pujas from the API
  const { 
    data: apiPujas, 
    isLoading: isApiLoading, 
    error: apiError 
  } = useQuery<Puja[]>({
    queryKey: ['/api/pujas'],
  });

  // Demo data for initial load and fallback - properly typed
  const initialPujas: Puja[] = [
    {
      id: 1,
      name: "Satyanarayan Puja",
      description: "A traditional Hindu worship ceremony dedicated to Lord Satyanarayan, a form of Lord Vishnu.",
      basePrice: 1100,
      price: 999,
      imageUrl: "https://example.com/satyanarayan.jpg",
      items: ["Flowers", "Incense sticks", "Fruits", "Sweets"],
      isPopular: true,
      isActive: true,
      type: "offline" as "offline",
      duration: 120,
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z"
    },
    {
      id: 2,
      name: "Griha Pravesh",
      description: "House warming ceremony performed when entering a new home for the first time.",
      basePrice: 2100,
      price: 1899,
      imageUrl: "https://example.com/grihapravesh.jpg",
      items: ["Kalash", "Coconut", "Flowers", "Rice"],
      isPopular: true,
      isActive: true,
      type: "offline" as "offline",
      duration: 180,
      createdAt: "2023-01-02T00:00:00Z",
      updatedAt: "2023-01-02T00:00:00Z"
    },
    {
      id: 3,
      name: "Online Consultation",
      description: "Virtual consultation with a Guruji for spiritual guidance and advice.",
      basePrice: 500,
      price: undefined,
      imageUrl: "https://example.com/online.jpg",
      items: [],
      isPopular: false,
      isActive: true,
      type: "online" as "online",
      duration: 45,
      createdAt: "2023-01-03T00:00:00Z",
      updatedAt: "2023-01-03T00:00:00Z"
    }
  ];
  
  // Track puja data with local state
  const [pujasData, setPujasData] = useState<Puja[]>(initialPujas);
  
  // Update local state when API data is available
  useEffect(() => {
    if (apiPujas) {
      setPujasData(apiPujas);
    }
  }, [apiPujas]);
  
  // Loading states
  useEffect(() => {
    // Add a small delay for demo loading state
    const timer = setTimeout(() => {
      setIsUiLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Derived values
  const pujas = pujasData;
  const setPujas = setPujasData;
  const isLoading = isApiLoading || isUiLoading;
  const error = apiError;

  // Real API mutations combined with optimistic UI updates 
  // This provides immediate UI feedback while ensuring data persistence

  // Real API mutations with optimistic UI updates
  const createRealPujaMutation = useMutation({
    mutationFn: async (data: PujaFormData) => {
      const response = await apiRequest('POST', '/api/pujas', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pujas'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pujas'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pujas'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete puja',
        variant: 'destructive',
      });
    }
  });

  // Update local state immediately for responsive UI
  // Create puja - optimistic UI update + real API call
  const createPujaMutation = {
    mutate: (data: PujaFormData) => {
      // Create optimistic puja entry with temporary ID
      const tempId = Math.max(0, ...pujas.map(p => p.id)) + 1;
      const newPuja: Puja = {
        id: tempId,
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        price: data.price,
        imageUrl: data.imageUrl,
        items: data.items,
        isPopular: data.isPopular,
        isActive: data.isActive,
        type: data.type,
        duration: data.duration,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Update local state immediately for responsive UI
      setPujas(prev => [...prev, newPuja]);
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Puja created successfully',
      });
      
      // Clean up UI
      resetForm();
      setIsAddDialogOpen(false);
      
      // Make the actual API call
      createRealPujaMutation.mutate(data);
    },
    isPending: createRealPujaMutation.isPending
  };

  // Update puja - optimistic UI update + real API call
  const updatePujaMutation = {
    mutate: (data: { id: number; puja: PujaFormData }) => {
      // Update local state immediately
      setPujas(prev => prev.map(puja => {
        if (puja.id === data.id) {
          // Create an updated puja object
          const updatedPuja: Puja = {
            ...puja,
            name: data.puja.name,
            description: data.puja.description,
            basePrice: data.puja.basePrice,
            price: data.puja.price,
            imageUrl: data.puja.imageUrl,
            items: data.puja.items,
            isPopular: data.puja.isPopular,
            isActive: data.puja.isActive,
            type: data.puja.type,
            duration: data.puja.duration,
            updatedAt: new Date().toISOString()
          };
          return updatedPuja;
        }
        return puja;
      }));
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Puja updated successfully',
      });
      
      // Clean up UI
      resetForm();
      setIsEditDialogOpen(false);
      
      // Make the actual API call
      updateRealPujaMutation.mutate(data);
    },
    isPending: updateRealPujaMutation.isPending
  };

  // Delete puja - optimistic UI update + real API call
  const deletePujaMutation = {
    mutate: (id: number) => {
      // Update local state immediately
      setPujas(prev => prev.filter(puja => puja.id !== id));
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Puja deleted successfully',
      });
      
      // Clean up UI
      setIsDeleteDialogOpen(false);
      
      // Make the actual API call
      deleteRealPujaMutation.mutate(id);
    },
    isPending: deleteRealPujaMutation.isPending
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      basePrice: 0,
      price: 0,
      imageUrl: '',
      items: [],
      isPopular: false,
      isActive: true,
      type: 'offline',
      duration: 60,
    });
    setItemsInput('');
    setSelectedPuja(null);
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle number inputs
    if (name === 'basePrice' || name === 'price' || name === 'duration') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
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
      price: puja.price || 0,
      imageUrl: puja.imageUrl || '',
      items: puja.items || [],
      isPopular: puja.isPopular,
      isActive: puja.isActive,
      type: puja.type,
      duration: puja.duration,
    });
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
    
    if (selectedPuja) {
      // Update existing puja
      updatePujaMutation.mutate({ id: selectedPuja.id, puja: formData });
    } else {
      // Create new puja
      createPujaMutation.mutate(formData);
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
              {pujas?.map((puja: Puja) => (
                <TableRow key={puja.id}>
                  <TableCell className="font-medium">{puja.name}</TableCell>
                  <TableCell>
                    <Badge variant={puja.type === 'online' ? 'default' : 'outline'}>
                      {puja.type === 'online' ? 'Online' : 'Offline'}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{puja.basePrice}</TableCell>
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
                      <Button variant="ghost" size="icon" onClick={() => handleEditPuja(puja)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePuja(puja)}>
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
        <DialogContent className="sm:max-w-[550px]">
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
                    value={formData.price}
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
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                    min={1}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    value={formData.imageUrl || ''}
                    onChange={handleInputChange}
                    placeholder="Optional"
                  />
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
                <div className="col-span-2">
                  <SamagriInput 
                    samagri={formData.samagri || []}
                    onChange={(samagri) => setFormData(prev => ({ ...prev, samagri }))}
                  />
                </div>
                <div className="col-span-2">
                  <SamagriInput 
                    samagri={formData.samagri || []}
                    onChange={(samagri) => setFormData(prev => ({ ...prev, samagri }))}
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
        <DialogContent className="sm:max-w-[550px]">
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
                    value={formData.price}
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
                  <Label htmlFor="edit-duration">Duration (minutes) *</Label>
                  <Input
                    id="edit-duration"
                    name="duration"
                    type="number"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                    min={1}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-imageUrl">Image URL</Label>
                  <Input
                    id="edit-imageUrl"
                    name="imageUrl"
                    value={formData.imageUrl || ''}
                    onChange={handleInputChange}
                    placeholder="Optional"
                  />
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
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isPopular"
                    checked={formData.isPopular}
                    onCheckedChange={(checked) => handleSwitchChange('isPopular', checked)}
                  />
                  <Label htmlFor="edit-isPopular">Mark as Popular</Label>
                </div>
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
            <DialogTitle>Delete Puja</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete "{selectedPuja?.name}"? This action cannot be undone.</p>
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
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}