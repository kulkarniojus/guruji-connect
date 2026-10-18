import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Edit, Plus, RefreshCw, Trash2 } from 'lucide-react';

type Service = {
  id: number;
  slug: string;
  title: string;
  description: string;
  image: string;
  bookingHref: string;
  isActive: boolean;
  sortOrder: number;
};

const serviceSchema = z.object({
  title: z.string().trim().min(1, 'Enter a service title'),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens'),
  description: z.string().trim().min(1, 'Enter a service description'),
  image: z.string().trim().min(1, 'Enter an image path or secure URL').refine(
    value => (value.startsWith('/') && !value.startsWith('//')) || /^https:\/\/.+/i.test(value),
    'Use an app-relative path or an https:// URL',
  ),
  bookingHref: z.string().trim().refine(
    value => /^\/(booking|pujas|services)(\/|$|\?)/.test(value) && !value.startsWith('//'),
    'Link must begin with /booking, /pujas, or /services',
  ),
  isActive: z.boolean(),
  sortOrder: z.number().int('Use a whole number'),
});

type ServiceForm = z.infer<typeof serviceSchema>;

const emptyValues: ServiceForm = {
  title: '',
  slug: '',
  description: '',
  image: '',
  bookingHref: '/booking',
  isActive: true,
  sortOrder: 0,
};

export default function ServicesManagementTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: emptyValues,
  });

  const { data: services = [], isLoading, isError, refetch } = useQuery<Service[]>({
    queryKey: ['/api/admin/services'],
    queryFn: () => apiRequest('GET', '/api/admin/services').then(response => response.json()),
  });

  const refreshServices = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/services'] });
    queryClient.invalidateQueries({ queryKey: ['/api/services'] });
  };

  const saveMutation = useMutation({
    mutationFn: ({ values, id }: { values: ServiceForm; id?: number }) =>
      apiRequest(id ? 'PUT' : 'POST', id ? `/api/admin/services/${id}` : '/api/admin/services', values),
    onSuccess: () => {
      refreshServices();
      toast({ title: 'Service saved', description: 'The service information has been updated.' });
      closeDialog();
    },
    onError: error => {
      toast({ title: 'Could not save service', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/services/${id}`),
    onSuccess: () => {
      refreshServices();
      toast({ title: 'Service deleted', description: 'The service has been removed.' });
    },
    onError: error => {
      toast({ title: 'Could not delete service', description: error.message, variant: 'destructive' });
    },
  });
  const statusMutation = useMutation({
    mutationFn: (service: Service) => apiRequest('PUT', `/api/admin/services/${service.id}`, { isActive: !service.isActive }),
    onSuccess: () => {
      refreshServices();
      toast({ title: 'Service availability updated' });
    },
    onError: error => {
      toast({ title: 'Could not update service', description: error.message, variant: 'destructive' });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingService(null);
    form.reset(emptyValues);
  }

  function startCreate() {
    setEditingService(null);
    form.reset(emptyValues);
    setDialogOpen(true);
  }

  function startEdit(service: Service) {
    setEditingService(service);
    form.reset({
      title: service.title,
      slug: service.slug,
      description: service.description,
      image: service.image,
      bookingHref: service.bookingHref,
      isActive: service.isActive,
      sortOrder: service.sortOrder,
    });
    setDialogOpen(true);
  }

  function submit(values: ServiceForm) {
    saveMutation.mutate({ values, id: editingService?.id });
  }

  function confirmDelete(service: Service) {
    if (window.confirm(`Delete “${service.title}”? This cannot be undone.`)) {
      deleteMutation.mutate(service.id);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Our Services</CardTitle>
            <CardDescription className="mt-1">Manage the service cards shown to customers. Only active services appear publicly.</CardDescription>
          </div>
          <Button type="button" onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add service
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" aria-label="Loading services">
            {[0, 1, 2].map(item => <div key={item} className="h-12 animate-pulse rounded-md bg-muted" />)}
          </div>
        ) : isError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <span>Services could not be loaded. Please try again.</span>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No services have been added yet.</TableCell></TableRow>
                ) : services.slice().sort((a, b) => a.sortOrder - b.sortOrder).map(service => (
                  <TableRow key={service.id}>
                    <TableCell className="min-w-[220px]">
                      <div className="flex items-center gap-3">
                        <img src={service.image} alt="" className="h-11 w-14 rounded object-cover" />
                        <div className="min-w-0">
                          <p className="font-medium">{service.title}</p>
                          <p className="max-w-sm truncate text-xs text-muted-foreground">{service.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{service.slug}</TableCell>
                    <TableCell>{service.sortOrder}</TableCell>
                    <TableCell><Badge variant={service.isActive ? 'default' : 'secondary'}>{service.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                         <Button type="button" size="sm" variant="outline"
                           disabled={statusMutation.isPending || deleteMutation.isPending}
                           onClick={() => statusMutation.mutate(service)}
                           aria-label={`${service.isActive ? 'Deactivate' : 'Activate'} ${service.title}`}>
                           {service.isActive ? 'Deactivate' : 'Activate'}
                         </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(service)} aria-label={`Edit ${service.title}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={deleteMutation.isPending} onClick={() => confirmDelete(service)} aria-label={`Delete ${service.title}`}>
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
        {deleteMutation.isError && (
          <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" />{deleteMutation.error.message}</p>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={open => open ? setDialogOpen(true) : closeDialog()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit service' : 'Add service'}</DialogTitle>
            <DialogDescription>These details are used on the public services pages.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input autoComplete="off" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem><FormLabel>Slug</FormLabel><FormControl><Input autoComplete="off" placeholder="online-puja" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><textarea {...field} rows={4} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="image" render={({ field }) => (
                <FormItem><FormLabel>Image path or HTTPS URL</FormLabel><FormControl><Input placeholder="/images/service.png" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="bookingHref" render={({ field }) => (
                <FormItem><FormLabel>Book now destination</FormLabel><FormControl><Input placeholder="/booking" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="sortOrder" render={({ field }) => (
                  <FormItem><FormLabel>Display order</FormLabel><FormControl><Input type="number" step="1" value={field.value} onChange={event => field.onChange(Number(event.target.value))} onBlur={field.onBlur} name={field.name} ref={field.ref} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-end pb-2"><Label className="flex items-center gap-2 font-normal"><input type="checkbox" checked={field.value} onChange={event => field.onChange(event.target.checked)} className="h-4 w-4 accent-primary" />Show this service publicly</Label></FormItem>
                )} />
              </div>
              {saveMutation.isError && <p role="alert" className="text-sm text-destructive">{saveMutation.error.message}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} disabled={saveMutation.isPending}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : editingService ? 'Save changes' : 'Add service'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
