import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash, Edit, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Puja {
  id: number;
  name: string;
  description: string;
  duration: number;
  basePrice: number;
  price: number;
  type: "offline" | "online";
  items: string[];
  imageUrl?: string;
  isPopular: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type PujaFormData = Omit<Puja, "id" | "createdAt" | "updatedAt">;

export default function AdminPujas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPuja, setSelectedPuja] = useState<Puja | null>(null);
  const [formData, setFormData] = useState<PujaFormData>({
    name: "",
    description: "",
    duration: 60,
    basePrice: 1000,
    price: 1000,
    type: "offline",
    items: [],
    isPopular: false,
    isActive: true,
  });
  const [itemsInput, setItemsInput] = useState("");

  // Fetch pujas
  const { data: pujas, isLoading, error } = useQuery({
    queryKey: ["/api/pujas"],
    staleTime: 60000, // 1 minute
  });

  // Create puja mutation
  const createPuja = useMutation({
    mutationFn: (data: PujaFormData) => apiRequest("POST", "/api/admin/pujas", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Puja created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pujas"] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create puja",
        variant: "destructive",
      });
    },
  });

  // Update puja mutation
  const updatePuja = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PujaFormData> }) =>
      apiRequest("PUT", `/api/admin/pujas/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Puja updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pujas"] });
      setIsEditDialogOpen(false);
      setSelectedPuja(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update puja",
        variant: "destructive",
      });
    },
  });

  // Delete puja mutation
  const deletePuja = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/pujas/${id}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Puja deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pujas"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete puja",
        variant: "destructive",
      });
    },
  });

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      duration: 60,
      basePrice: 1000,
      price: 1000,
      type: "offline",
      items: [],
      isPopular: false,
      isActive: true,
    });
    setItemsInput("");
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "basePrice" || name === "price" || name === "duration" ? Number(value) : value,
    });
  };

  // Handle switch changes
  const handleSwitchChange = (name: "isPopular" | "isActive", checked: boolean) => {
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle items input
  const handleAddItem = () => {
    if (itemsInput.trim()) {
      setFormData({
        ...formData,
        items: [...formData.items, itemsInput.trim()],
      });
      setItemsInput("");
    }
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({
      ...formData,
      items: newItems,
    });
  };

  // Handle create form submission
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPuja.mutate(formData);
  };

  // Handle edit form submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPuja) {
      updatePuja.mutate({
        id: selectedPuja.id,
        data: formData,
      });
    }
  };

  // Set form data when editing
  useEffect(() => {
    if (selectedPuja) {
      setFormData({
        name: selectedPuja.name,
        description: selectedPuja.description,
        duration: selectedPuja.duration,
        basePrice: selectedPuja.basePrice,
        price: selectedPuja.price,
        type: selectedPuja.type,
        items: selectedPuja.items || [],
        imageUrl: selectedPuja.imageUrl,
        isPopular: selectedPuja.isPopular,
        isActive: selectedPuja.isActive,
      });
    }
  }, [selectedPuja]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Error Loading Pujas</h1>
        <p className="text-red-500">{(error as Error).message}</p>
      </div>
    );
  }

  // Form component for both create and edit
  const PujaForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={isEdit ? handleEditSubmit : handleCreateSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Puja Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Puja Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => handleSelectChange("type", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            name="duration"
            type="number"
            min="15"
            step="15"
            value={formData.duration}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="basePrice">Base Price (₹)</Label>
          <Input
            id="basePrice"
            name="basePrice"
            type="number"
            min="0"
            step="100"
            value={formData.basePrice}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price (₹)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            min="0"
            step="100"
            value={formData.price}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            name="imageUrl"
            value={formData.imageUrl || ""}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2 col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            required
          />
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Items Required</Label>
          <div className="flex space-x-2">
            <Input
              value={itemsInput}
              onChange={(e) => setItemsInput(e.target.value)}
              placeholder="Add item"
            />
            <Button type="button" onClick={handleAddItem} variant="outline">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.items.map((item, index) => (
              <div
                key={index}
                className="bg-muted px-3 py-1 rounded-full text-sm flex items-center"
              >
                {item}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="ml-2 text-gray-500 hover:text-red-500"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="isPopular"
            checked={formData.isPopular}
            onCheckedChange={(checked) => handleSwitchChange("isPopular", checked)}
          />
          <Label htmlFor="isPopular">Popular</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => handleSwitchChange("isActive", checked)}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => {
          if (isEdit) setIsEditDialogOpen(false);
          else setIsCreateDialogOpen(false);
          setSelectedPuja(null);
          resetForm();
        }}>
          Cancel
        </Button>
        <Button type="submit" disabled={createPuja.isPending || updatePuja.isPending}>
          {isEdit ? (updatePuja.isPending ? "Updating..." : "Update Puja") : (createPuja.isPending ? "Creating..." : "Create Puja")}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Pujas</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="mr-2 h-4 w-4" /> Add New Puja
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Puja</DialogTitle>
              <DialogDescription>
                Add a new puja to the system. Fill in all the required fields.
              </DialogDescription>
            </DialogHeader>
            <PujaForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(pujas) && pujas.map((puja: Puja) => (
          <Card key={puja.id} className={!puja.isActive ? "opacity-70" : ""}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{puja.name}</CardTitle>
                  <CardDescription>
                    Duration: {puja.duration} min | Type: {puja.type === "offline" ? "Offline" : "Online"}
                  </CardDescription>
                </div>
                <div className="flex space-x-1">
                  <Dialog open={isEditDialogOpen && selectedPuja?.id === puja.id} onOpenChange={(open) => {
                    setIsEditDialogOpen(open);
                    if (!open) setSelectedPuja(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedPuja(puja)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Edit Puja</DialogTitle>
                        <DialogDescription>
                          Update the details of this puja.
                        </DialogDescription>
                      </DialogHeader>
                      <PujaForm isEdit />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete "${puja.name}"?`)) {
                        deletePuja.mutate(puja.id);
                      }
                    }}
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Description:</p>
                <p className="text-sm line-clamp-2">{puja.description}</p>
              </div>
              <Separator />
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-gray-500">Base Price:</p>
                  <p className="font-medium">₹{puja.basePrice}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Final Price:</p>
                  <p className="font-medium">₹{puja.price}</p>
                </div>
              </div>
              {puja.items && puja.items.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-500">Items Required:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {puja.items.slice(0, 3).map((item, index) => (
                        <span
                          key={index}
                          className="bg-muted px-2 py-0.5 rounded-full text-xs"
                        >
                          {item}
                        </span>
                      ))}
                      {puja.items.length > 3 && (
                        <span className="bg-muted px-2 py-0.5 rounded-full text-xs">
                          +{puja.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex items-center space-x-2 text-sm">
                <div className={`h-2 w-2 rounded-full ${puja.isActive ? "bg-green-500" : "bg-gray-300"}`}></div>
                <span>{puja.isActive ? "Active" : "Inactive"}</span>
              </div>
              {puja.isPopular && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                  Popular
                </span>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {Array.isArray(pujas) && pujas.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No pujas found. Create a new puja to get started.</p>
        </div>
      )}
    </div>
  );
}