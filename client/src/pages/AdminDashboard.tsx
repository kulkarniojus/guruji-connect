import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import ChatbotDashboard from '@/components/chatbot/ChatbotDashboard';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { Loader2, BarChart3, MessageCircle, Users, Calendar } from 'lucide-react';

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  // Demo mode - no authentication check for demonstration purposes
  // In a production environment, we would authenticate and verify admin role

  return (
    <div className="container mx-auto py-8">
      <div className="bg-primary/10 rounded-lg p-4 mb-6 border border-primary/20">
        <p className="text-center font-medium">
          Demo Mode: You're viewing the Admin Analytics Dashboard with sample data
        </p>
      </div>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-8">
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
        </TabsList>
        
        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>
        
        <TabsContent value="chatbot">
          <ChatbotDashboard />
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
      </Tabs>
    </div>
  );
}