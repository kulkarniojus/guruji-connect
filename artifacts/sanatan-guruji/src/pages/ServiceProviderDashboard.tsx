import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import GurujiDashboard from '@/components/dashboard/GurujiDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function ServiceProviderDashboard() {
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) return null;
      return response.json();
    },
  });
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<any[]>({
    queryKey: ['/api/other-categories/my-applications'],
    queryFn: async () => {
      const response = await fetch('/api/other-categories/my-applications', { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: user?.role === 'customer',
  });
  const approvedProvider = user?.role === 'guruji' ||
    applications.some(application => application.status === 'approved');

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="container mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-9">
        {userLoading || applicationsLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-orange-600" /></div>
        ) : approvedProvider ? (
          <GurujiDashboard />
        ) : (
          <Card className="mx-auto max-w-xl">
            <CardHeader><CardTitle>Provider access is awaiting approval</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm text-neutral-600">
              <p>Once an Other-category application is approved, booking requests and availability tools will appear here.</p>
              <Button asChild><Link href="/profile">View your applications</Link></Button>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
