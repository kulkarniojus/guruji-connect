import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import ChatbotManagementTab from '@/components/admin/ChatbotManagementTab';
import FAQManagementTab from '@/components/admin/FAQManagementTab';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import PujaManagementTab from '@/components/admin/PujaManagementTab';
import GurujiRegistrationTab from '@/components/admin/GurujiRegistrationTab';
import CitiesManagementTab from '@/components/admin/CitiesManagementTab';
import ServicesManagementTab from '@/components/admin/ServicesManagementTab';
import PaymentSettingsTab from '@/components/admin/PaymentSettingsTab';
import BookingManagementTab from '@/components/admin/BookingManagementTab';
import CancellationRulesTab from '@/components/admin/CancellationRulesTab';
import CustomerQueriesTab from '@/components/admin/CustomerQueriesTab';
import CustomersManagementTab from '@/components/admin/CustomersManagementTab';
import { RegisterCustomerTab, RegisterGurujiTab } from '@/pages/SalesRepDashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3, MessageCircle, Users, Calendar, Package2, UserCheck, HelpCircle, MapPin, Bell, CreditCard, XCircle, Inbox, AlertTriangle, RefreshCw, Star } from 'lucide-react';
import { useLocation } from 'wouter';
import { isUnassignedBooking } from '@shared/isUnassignedBooking';
import { RatingsTab } from '@/components/dashboard/AdminDashboard';
import GurujiFinanceTab from '@/components/admin/guruji-finance/GurujiFinanceTab';
import { WalletCards } from 'lucide-react';

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [, setLocation] = useLocation();

  const { data: gurujiProfiles } = useQuery<any[]>({
    queryKey: ['/api/admin/gurujis'],
    queryFn: async () => {
      const res = await fetch('/api/admin/gurujis', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
    enabled: !!user && user.role === 'admin',
  });

  const pendingCount = gurujiProfiles?.filter(g => g.status === 'pending').length ?? 0;

  const { data: notifications } = useQuery<any[]>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
    enabled: !!user && user.role === 'admin',
  });

  const unreadNotifCount = notifications?.filter(n => !n.isRead).length ?? 0;

  const {
    data: adminBookings,
    isLoading: bookingsLoading,
    isError: bookingsError,
    refetch: refetchBookings,
  } = useQuery<any[]>({
    queryKey: ['/api/admin/bookings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/bookings', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch bookings');
      return res.json();
    },
    refetchInterval: 15000,
    enabled: !!user && user.role === 'admin',
  });

  const unassignedBookings = adminBookings?.filter(isUnassignedBooking) ?? [];
  const openUnassignedBookings = () => {
    setShowUnassignedOnly(true);
    setActiveTab('bookings');
  };

  const { data: queries } = useQuery<any[]>({
    queryKey: ['/api/admin/queries'],
    queryFn: async () => {
      const res = await fetch('/api/admin/queries', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
    enabled: !!user && user.role === 'admin',
  });

  const openQueryCount = queries?.filter(q => q.status === 'open').length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Redirect to="/admin" />;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        {unreadNotifCount > 0 && (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
            <Bell className="h-5 w-5 text-orange-500 shrink-0" />
            <span className="text-sm font-medium text-orange-700">
              {unreadNotifCount} unread notification{unreadNotifCount > 1 ? 's' : ''}
            </span>
            {pendingCount > 0 && (
              <span className="text-sm text-orange-600">
                — including {pendingCount} pending Guruji application{pendingCount > 1 ? 's' : ''}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="ml-2 border-orange-300 text-orange-700 hover:bg-orange-100 text-xs h-7"
              onClick={() => setLocation('/notifications')}
            >
              View &amp; Clear
            </Button>
          </div>
        )}
      </div>

      {(bookingsLoading || bookingsError || unassignedBookings.length > 0) && (
        <div
          role={bookingsError ? 'alert' : 'status'}
          className={`mb-6 rounded-lg border px-4 py-3 ${
            bookingsError
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-amber-300 bg-amber-50 text-amber-950'
          }`}
        >
          {bookingsError ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>Unassigned pujas could not be checked. The live count is unavailable.</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchBookings()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : bookingsLoading ? (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking for unassigned pujas…
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  {unassignedBookings.length > 0 ? (
                    <>
                      <p className="font-semibold">
                        {unassignedBookings.length} active puja{unassignedBookings.length === 1 ? '' : 's'} still need a Guruji
                      </p>
                      <p className="mt-0.5 text-sm text-amber-900">
                        These are requests awaiting assignment or acceptance—not confirmed bookings.
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
              {unassignedBookings.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200"
                  onClick={openUnassignedBookings}
                >
                  Review unassigned pujas
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-8 bg-muted p-1 rounded-lg">
          <TabsTrigger value="analytics" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1.5">
            <Inbox className="h-4 w-4" />
            Messages
            {openQueryCount > 0 && (
              <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0 h-4 min-w-[16px] ml-0.5">
                {openQueryCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Bookings
            {unassignedBookings.length > 0 && (
              <Badge className="bg-red-600 text-white text-xs px-1.5 py-0 h-4 min-w-[16px] ml-0.5">
                {unassignedBookings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ratings" className="flex items-center gap-1.5">
            <Star className="h-4 w-4" />
            Ratings
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="guruji-registrations" className="flex items-center gap-1.5">
            <UserCheck className="h-4 w-4" />
            Guruji
            {pendingCount > 0 && (
              <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0 h-4 min-w-[16px]">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="guruji-finance" className="flex items-center gap-1.5">
            <WalletCards className="h-4 w-4" />
            Guruji Finance
          </TabsTrigger>
          <TabsTrigger value="pujas" className="flex items-center gap-1.5">
            <Package2 className="h-4 w-4" />
            Pujas
          </TabsTrigger>
          <TabsTrigger value="cities" className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            Cities
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-1.5">
            <Package2 className="h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="register-accounts">Register accounts</TabsTrigger>
          <TabsTrigger value="payment-settings" className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="cancellation-rules" className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4" />
            Cancellation
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" />
            ChatBot
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="messages">
          <CustomerQueriesTab />
        </TabsContent>

        <TabsContent value="customers">
          <CustomersManagementTab />
        </TabsContent>
        <TabsContent value="register-accounts">
          <Tabs defaultValue="customer">
            <TabsList>
              <TabsTrigger value="customer">Register customer</TabsTrigger>
              <TabsTrigger value="guruji">Register Guruji</TabsTrigger>
            </TabsList>
            <TabsContent value="customer"><RegisterCustomerTab endpoint="/api/admin/register-customer" /></TabsContent>
            <TabsContent value="guruji"><RegisterGurujiTab endpoint="/api/admin/register-guruji" /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="chatbot">
          <ChatbotManagementTab />
        </TabsContent>

        <TabsContent value="bookings">
          <BookingManagementTab
            showUnassignedOnly={showUnassignedOnly}
            onUnassignedFilterChange={setShowUnassignedOnly}
          />
        </TabsContent>

        <TabsContent value="ratings">
          <RatingsTab />
        </TabsContent>

        <TabsContent value="pujas">
          <PujaManagementTab />
        </TabsContent>

        <TabsContent value="guruji-registrations">
          <GurujiRegistrationTab />
        </TabsContent>

        <TabsContent value="guruji-finance">
          <GurujiFinanceTab />
        </TabsContent>

        <TabsContent value="cities">
          <CitiesManagementTab />
        </TabsContent>

        <TabsContent value="services">
          <ServicesManagementTab />
        </TabsContent>

        <TabsContent value="faq">
          <FAQManagementTab />
        </TabsContent>

        <TabsContent value="payment-settings">
          <PaymentSettingsTab />
        </TabsContent>

        <TabsContent value="cancellation-rules">
          <CancellationRulesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
