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
import PaymentSettingsTab from '@/components/admin/PaymentSettingsTab';
import BookingManagementTab from '@/components/admin/BookingManagementTab';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, MessageCircle, Users, Calendar, Package2, UserCheck, HelpCircle, MapPin, Bell, CreditCard } from 'lucide-react';

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  // Fetch pending guruji count for notification badge
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

  // Fetch unread notification count
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        {unreadNotifCount > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
            <Bell className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-orange-700">
              {unreadNotifCount} unread notification{unreadNotifCount > 1 ? 's' : ''}
            </span>
            {pendingCount > 0 && (
              <span className="text-sm text-orange-600">
                — including {pendingCount} pending Guruji application{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-9 mb-8">
          <TabsTrigger value="analytics" className="flex items-center justify-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="flex items-center justify-center">
            <MessageCircle className="h-4 w-4 mr-2" />
            ChatBot
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center justify-center">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center justify-center">
            <Calendar className="h-4 w-4 mr-2" />
            Bookings
          </TabsTrigger>
          <TabsTrigger value="pujas" className="flex items-center justify-center">
            <Package2 className="h-4 w-4 mr-2" />
            Pujas
          </TabsTrigger>
          <TabsTrigger value="guruji-registrations" className="flex items-center justify-center gap-1">
            <UserCheck className="h-4 w-4" />
            <span>Guruji</span>
            {pendingCount > 0 && (
              <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0 h-4 min-w-[16px]">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cities" className="flex items-center justify-center">
            <MapPin className="h-4 w-4 mr-2" />
            Cities
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center justify-center">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="payment-settings" className="flex items-center justify-center">
            <CreditCard className="h-4 w-4 mr-2" />
            Payment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="chatbot">
          <ChatbotManagementTab />
        </TabsContent>

        <TabsContent value="users">
          <div className="p-6 border rounded-lg text-center">
            <p className="text-muted-foreground">User management dashboard will appear here</p>
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <BookingManagementTab />
        </TabsContent>

        <TabsContent value="pujas">
          <PujaManagementTab />
        </TabsContent>

        <TabsContent value="guruji-registrations">
          <GurujiRegistrationTab />
        </TabsContent>

        <TabsContent value="cities">
          <CitiesManagementTab />
        </TabsContent>

        <TabsContent value="faq">
          <FAQManagementTab />
        </TabsContent>

        <TabsContent value="payment-settings">
          <PaymentSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
