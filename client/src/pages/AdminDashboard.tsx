import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import ChatbotDashboard from '@/components/chatbot/ChatbotDashboard';
import { Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('chatbot');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Redirect if not an admin
  if (user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="chatbot">WhatsApp ChatBot</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
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
        
        <TabsContent value="reports">
          <div className="p-6 border rounded-lg text-center">
            <p className="text-muted-foreground">Reports and analytics will appear here</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}