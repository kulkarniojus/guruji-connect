import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Pencil, Plus, Trash2, Check, X } from 'lucide-react';

type Category = {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  basePrice: number;
  duration: number;
};
type Application = {
  id: number;
  status: string;
  categoryName: string;
  accountRole: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  serviceCity: string;
  serviceCities: string[];
  address: string;
  pincode: string;
  bio: string;
  experience: number;
  languages: string[];
  rejectionReason?: string;
};

const emptyForm = { name: '', description: '', basePrice: '', duration: '60', isActive: true };

export default function OtherCategoryManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [applicationStatus, setApplicationStatus] = useState('pending');
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/admin/other-categories'],
    queryFn: async () => {
      const response = await fetch('/api/admin/other-categories', { credentials: 'include' });
      if (!response.ok) throw new Error('Could not load categories');
      return response.json();
    },
  });
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ['/api/admin/other-category-applications', applicationStatus],
    queryFn: async () => {
      const response = await fetch(`/api/admin/other-category-applications?status=${applicationStatus}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Could not load applications');
      return response.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editingId ? `/api/admin/other-categories/${editingId}` : '/api/admin/other-categories';
      const response = await apiRequest(editingId ? 'PUT' : 'POST', url, {
        ...form,
        basePrice: Number(form.basePrice),
        duration: Number(form.duration),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Could not save category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/other-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/other-categories'] });
      toast({ title: editingId ? 'Category updated' : 'Category added' });
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: (error: any) => toast({ title: 'Unable to save category', description: error.message, variant: 'destructive' }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/other-categories/${id}`);
      if (!response.ok) throw new Error((await response.json()).message || 'Could not delete category');
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/other-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/other-categories'] });
      toast({ title: data.message });
    },
    onError: (error: any) => toast({ title: 'Unable to delete category', description: error.message, variant: 'destructive' }),
  });
  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'approved' | 'rejected' }) => {
      let rejectionReason: string | undefined;
      if (status === 'rejected') {
        rejectionReason = window.prompt('Reason for rejecting this application')?.trim();
        if (!rejectionReason) throw new Error('A rejection reason is required');
      }
      const response = await apiRequest('PUT', `/api/admin/other-category-applications/${id}`, { status, rejectionReason });
      if (!response.ok) throw new Error((await response.json()).message || 'Could not update application');
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/other-category-applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/other-categories/my-applications'] });
      toast({ title: data.message });
    },
    onError: (error: any) => {
      if (error.message !== 'A rejection reason is required') {
        toast({ title: 'Unable to review application', description: error.message, variant: 'destructive' });
      }
    },
  });

  const beginEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description || '',
      basePrice: String(category.basePrice ?? ''),
      duration: String(category.duration ?? 60),
      isActive: category.isActive,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit other category' : 'Add an other category'}</CardTitle>
          <CardDescription>
            Each category becomes a bookable service with its own configured price and duration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Category name</label>
              <Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. Kumarika" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Base price (₹)</label>
                <Input type="number" min="1" value={form.basePrice} onChange={event => setForm({ ...form, basePrice: event.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Duration (minutes)</label>
                <Input type="number" min="1" value={form.duration} onChange={event => setForm({ ...form, duration: event.target.value })} />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} maxLength={1000} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} />
            Available for registration and booking
          </label>
          <div className="flex gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || form.name.trim().length < 2 || Number(form.basePrice) < 1}
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {editingId ? 'Save category' : 'Add category'}
            </Button>
            {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel edit</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Configured categories</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {categoriesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : categories.length === 0 ? (
            <p className="text-sm text-gray-500">No categories configured yet.</p>
          ) : categories.map(category => (
            <div key={category.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{category.name}</span>
                  <Badge variant={category.isActive ? 'default' : 'secondary'}>{category.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                {category.description && <p className="mt-1 text-sm text-gray-500">{category.description}</p>}
                <p className="mt-1 text-xs text-gray-600">₹{category.basePrice} · {category.duration} min</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => beginEdit(category)}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
              <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(category.id)} disabled={deleteMutation.isPending}>
                <Trash2 className="mr-1 h-4 w-4" />Delete
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div><CardTitle>Provider applications</CardTitle><CardDescription>Review category access separately from regular Guruji registration.</CardDescription></div>
          <Select value={applicationStatus} onValueChange={setApplicationStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {applicationsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : applications.length === 0 ? (
            <p className="text-sm text-gray-500">No applications in this status.</p>
          ) : applications.map(application => (
            <div key={application.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{application.firstName} {application.lastName}</span>
                    <Badge variant="outline" className="capitalize">{application.accountRole} account</Badge>
                    <Badge>{application.categoryName}</Badge>
                    <Badge variant={application.status === 'approved' ? 'default' : application.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {application.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{application.email} · {application.mobile}</p>
                  <p className="mt-1 text-sm text-gray-600">Service areas: {(application.serviceCities || []).join(', ') || application.serviceCity || '—'}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {application.address || 'Address not provided'} {application.pincode ? `· ${application.pincode}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {application.experience ?? 0} years · Languages: {(application.languages || []).join(', ') || '—'}
                  </p>
                  {application.bio && <p className="mt-2 whitespace-pre-wrap text-sm">{application.bio}</p>}
                  {application.rejectionReason && <p className="mt-2 text-sm text-red-700">Reason: {application.rejectionReason}</p>}
                </div>
                {application.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => reviewMutation.mutate({ id: application.id, status: 'approved' })}>
                      <Check className="mr-1 h-4 w-4" />Approve
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => reviewMutation.mutate({ id: application.id, status: 'rejected' })}>
                      <X className="mr-1 h-4 w-4" />Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
