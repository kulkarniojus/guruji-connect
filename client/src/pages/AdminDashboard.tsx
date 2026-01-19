import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import ChatbotManagementTab from '@/components/admin/ChatbotManagementTab';
import FAQManagementTab from '@/components/admin/FAQManagementTab';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import PujaManagementTab from '@/components/admin/PujaManagementTab';
import GurujiRegistrationTab from '@/components/admin/GurujiRegistrationTab';
import CitiesManagementTab from '@/components/admin/CitiesManagementTab';
import { Loader2, BarChart3, MessageCircle, Users, Calendar, Package2, UserCheck, HelpCircle, MapPin } from 'lucide-react';

export default function AdminDashboard() {
  // All hooks must be called before any conditional logic
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  
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

  // Demo mode - no authentication check for demonstration purposes
  // In a production environment, we would authenticate and verify admin role

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-8 mb-8">
          <TabsTrigger value="analytics" className="flex items-center justify-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="flex items-center justify-center">
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp ChatBot
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
            Puja Management
          </TabsTrigger>
          <TabsTrigger value="guruji-registrations" className="flex items-center justify-center">
            <UserCheck className="h-4 w-4 mr-2" />
            Guruji Registrations
          </TabsTrigger>
          <TabsTrigger value="cities" className="flex items-center justify-center">
            <MapPin className="h-4 w-4 mr-2" />
            Cities
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center justify-center">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQ Management
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
          <div className="p-6 border rounded-lg text-center">
            <p className="text-muted-foreground">Booking management dashboard will appear here</p>
          </div>
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
      </Tabs>
    </div>
  );
}