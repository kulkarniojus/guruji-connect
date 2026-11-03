import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import OtherCategorySelector from '@/components/shared/OtherCategorySelector';
import { CityMultiSelect } from '@/components/shared/ProfileEditSelectors';

type Application = {
  categoryId: number;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  isActive: boolean;
};

export default function OtherCategoryProfileSection({ city }: { city?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [serviceCities, setServiceCities] = useState<string[]>(city ? [city] : []);
  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ['/api/other-categories/my-applications'],
    queryFn: async () => {
      const response = await fetch('/api/other-categories/my-applications', { credentials: 'include' });
      if (!response.ok) throw new Error('Could not load category applications');
      return response.json();
    },
  });
  const applyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/other-categories/apply', {
        categoryIds: selectedIds,
        serviceCities,
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Could not submit application');
      return response.json();
    },
    onSuccess: (data: any) => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['/api/other-categories/my-applications'] });
      toast({ title: 'Application submitted', description: data.message });
    },
    onError: (error: any) => toast({ title: 'Application failed', description: error.message, variant: 'destructive' }),
  });
  const approved = applications.some(application => application.status === 'approved');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Other service categories</CardTitle>
        <CardDescription>
          Apply to provide additional services. Each category is reviewed by the Vaidik Dhara support team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <OtherCategorySelector selectedIds={selectedIds} onChange={setSelectedIds} />
          <div>
            <p className="mb-1 text-sm font-medium">Service cities</p>
            <CityMultiSelect selectedCities={serviceCities} onChange={setServiceCities} />
          </div>
          <Button
            onClick={() => applyMutation.mutate()}
            disabled={!selectedIds.length || !serviceCities.length || applyMutation.isPending}
          >
            {applyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for approval
          </Button>
        </div>

        <div className="space-y-3 border-t pt-5">
          <h3 className="font-semibold">Your applications</h3>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : applications.length === 0 ? (
            <p className="text-sm text-gray-500">You have not applied for any additional categories.</p>
          ) : applications.map(application => (
            <div key={application.categoryId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="font-medium">{application.name}</p>
                {application.rejectionReason && <p className="mt-1 text-sm text-red-700">{application.rejectionReason}</p>}
                {!application.isActive && <p className="mt-1 text-xs text-gray-500">This category is no longer accepting bookings.</p>}
              </div>
              <Badge variant={application.status === 'approved' ? 'default' : application.status === 'rejected' ? 'destructive' : 'secondary'}>
                {application.status}
              </Badge>
            </div>
          ))}
          {approved && (
            <Button asChild variant="outline">
              <Link href="/service-provider-dashboard">Open provider dashboard</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
