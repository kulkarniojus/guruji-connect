import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, BarChart3, Users, Calendar, IndianRupee, MessageCircle, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import OverviewSection from './OverviewSection';
import UserAnalytics from './UserAnalytics';
import BookingAnalytics from './BookingAnalytics';
import RevenueAnalytics from './RevenueAnalytics';
import ChatbotAnalytics from './ChatbotAnalytics';
import VideoAnalytics from './VideoAnalytics';

const AnalyticsDashboard: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('6months');

  // Format date for API requests
  const getDateRange = () => {
    const endDate = new Date();
    let startDate: Date;

    switch (dateRange) {
      case '30days':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '6months':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  // Fetch overview data
  const { 
    data: overviewData, 
    isLoading: isLoadingOverview,
    refetch: refetchOverview
  } = useQuery({
    queryKey: ['/api/analytics/overview'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/analytics/overview');
      return response.json();
    }
  });

  // Fetch user analytics
  const { 
    data: userData, 
    isLoading: isLoadingUsers,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['/api/analytics/users', dateRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const response = await apiRequest('GET', `/api/analytics/users?startDate=${startDate}&endDate=${endDate}`);
      return response.json();
    }
  });

  // Fetch booking analytics
  const { 
    data: bookingData, 
    isLoading: isLoadingBookings,
    refetch: refetchBookings
  } = useQuery({
    queryKey: ['/api/analytics/bookings', dateRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const response = await apiRequest('GET', `/api/analytics/bookings?startDate=${startDate}&endDate=${endDate}`);
      return response.json();
    }
  });

  // Fetch revenue analytics
  const { 
    data: revenueData, 
    isLoading: isLoadingRevenue,
    refetch: refetchRevenue
  } = useQuery({
    queryKey: ['/api/analytics/revenue', dateRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const response = await apiRequest('GET', `/api/analytics/revenue?startDate=${startDate}&endDate=${endDate}`);
      return response.json();
    }
  });

  // Fetch chatbot analytics
  const { 
    data: chatbotData, 
    isLoading: isLoadingChatbot,
    refetch: refetchChatbot
  } = useQuery({
    queryKey: ['/api/analytics/chatbot'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/analytics/chatbot');
      return response.json();
    }
  });

  // Fetch video analytics
  const { 
    data: videoData, 
    isLoading: isLoadingVideo,
    refetch: refetchVideo
  } = useQuery({
    queryKey: ['/api/analytics/video'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/analytics/video');
      return response.json();
    }
  });

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
  };

  const handleRefresh = () => {
    refetchOverview();
    refetchUsers();
    refetchBookings();
    refetchRevenue();
    refetchChatbot();
    refetchVideo();
    
    toast({
      title: "Data refreshed",
      description: "Analytics data has been refreshed",
    });
  };

  const isLoading = 
    isLoadingOverview || 
    isLoadingUsers || 
    isLoadingBookings || 
    isLoadingRevenue || 
    isLoadingChatbot || 
    isLoadingVideo;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
        
        <div className="flex items-center gap-4">
          <Select defaultValue={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Refresh
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="bookings">
            <Calendar className="h-4 w-4 mr-2" />
            Bookings
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <IndianRupee className="h-4 w-4 mr-2" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="chatbot">
            <MessageCircle className="h-4 w-4 mr-2" />
            ChatBot
          </TabsTrigger>
          <TabsTrigger value="video">
            <Video className="h-4 w-4 mr-2" />
            Video
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          {isLoadingOverview ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : overviewData ? (
            <OverviewSection data={overviewData} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Failed to load overview data. Please try refreshing.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
          {isLoadingUsers ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : userData ? (
            <UserAnalytics data={userData} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Failed to load user analytics. Please try refreshing.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="bookings" className="mt-6">
          {isLoadingBookings ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bookingData ? (
            <BookingAnalytics data={bookingData} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Failed to load booking analytics. Please try refreshing.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="revenue" className="mt-6">
          {isLoadingRevenue ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : revenueData ? (
            <RevenueAnalytics data={revenueData} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Failed to load revenue analytics. Please try refreshing.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="chatbot" className="mt-6">
          {isLoadingChatbot ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chatbotData ? (
            <ChatbotAnalytics data={chatbotData} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Failed to load chatbot analytics. Please try refreshing.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="video" className="mt-6">
          {isLoadingVideo ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : videoData ? (
            <VideoAnalytics data={videoData} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Failed to load video analytics. Please try refreshing.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;