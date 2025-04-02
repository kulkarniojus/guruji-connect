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

  // Demo mode: Mock data for analytics
  const mockOverviewData = {
    stats: {
      totalUsers: 352,
      totalBookings: 489,
      totalPujas: 18,
      totalRevenue: 163400,
      activeGurujis: 24,
      pendingBookings: 42,
      completedBookings: 347
    },
    growth: {
      users: 5.2,
      bookings: 12.8,
      revenue: 8.5
    },
    totalGurujis: 28,
    activeWhatsappUsers: 124,
    newUsers30Days: 34,
    newBookings30Days: 67,
    revenue30Days: 38200,
    averageRating: 4.5
  };

  const mockUserData = {
    totalUsers: 352,
    activeUsers: {
      daily: 45,
      weekly: 128,
      monthly: 267
    },
    usersByRole: {
      customers: 312,
      gurujis: 28,
      admins: 12
    },
    usersByGender: {
      male: 215,
      female: 127,
      other: 10
    },
    newUserTrend: [
      { month: 'Jan', count: 12 },
      { month: 'Feb', count: 19 },
      { month: 'Mar', count: 23 },
      { month: 'Apr', count: 17 },
      { month: 'May', count: 28 },
      { month: 'Jun', count: 34 }
    ],
    retentionRate: {
      value: 73.2,
      change: 5.6
    }
  };

  const mockBookingData = {
    totalBookings: 489,
    bookingsByStatus: [
      { status: 'pending', count: 42 },
      { status: 'confirmed', count: 78 },
      { status: 'in_progress', count: 22 },
      { status: 'completed', count: 347 },
      { status: 'cancelled', count: 42 }
    ],
    bookingsByType: {
      online: 312,
      offline: 177
    },
    bookingTrend: [
      { month: 'Jan', count: 28 },
      { month: 'Feb', count: 35 },
      { month: 'Mar', count: 42 },
      { month: 'Apr', count: 38 },
      { month: 'May', count: 55 },
      { month: 'Jun', count: 67 }
    ],
    averageDuration: 45,
    popularPujas: [
      { id: 1, name: 'Satyanarayan Puja', count: 78 },
      { id: 2, name: 'Griha Pravesh', count: 65 },
      { id: 3, name: 'Ganesh Puja', count: 59 },
      { id: 4, name: 'Laxmi Puja', count: 45 },
      { id: 5, name: 'Durga Puja', count: 43 }
    ]
  };

  const mockRevenueData = {
    totalRevenue: 163400,
    revenueTrend: [
      { month: 'Jan', amount: 18500 },
      { month: 'Feb', amount: 22400 },
      { month: 'Mar', amount: 28900 },
      { month: 'Apr', amount: 25700 },
      { month: 'May', amount: 32600 },
      { month: 'Jun', amount: 38200 }
    ],
    revenueByPujaType: {
      online: 102400,
      offline: 61000
    },
    avgTransactionValue: 1290,
    paymentMethods: [
      { method: 'credit_card', count: 214 },
      { method: 'upi', count: 186 },
      { method: 'net_banking', count: 68 },
      { method: 'wallet', count: 21 }
    ]
  };

  const mockChatbotData = {
    totalConversations: 235,
    engagement: {
      totalUsers: 189,
      activeUsers: 124,
      averageMessagesPerUser: 8.3
    },
    messageMetrics: {
      totalMessages: 1947,
      averageResponseTime: 2.4,
      automatedResponses: 1683,
      humanHandoffs: 264
    },
    intentMetrics: {
      successRate: 87.2,
      topIntents: [
        { intent: 'booking_inquiry', count: 532 },
        { intent: 'puja_information', count: 423 },
        { intent: 'payment_issue', count: 246 },
        { intent: 'guruji_availability', count: 198 },
        { intent: 'cancel_booking', count: 156 }
      ],
      unrecognizedQueries: 248
    },
    conversationAnalytics: {
      averageDuration: 4.8,
      completionRate: 82.3,
      abandonmentRate: 17.7,
      satisfactionScore: 4.2
    },
    weeklyTrend: [
      { week: 'Week 1', conversations: 42, messages: 347 },
      { week: 'Week 2', conversations: 56, messages: 468 },
      { week: 'Week 3', conversations: 67, messages: 583 },
      { week: 'Week 4', conversations: 70, messages: 549 }
    ]
  };

  const mockVideoData = {
    totalSessions: 122,
    byStatus: [
      { status: 'completed', count: 89 },
      { status: 'dropped', count: 22 },
      { status: 'technical_issue', count: 11 }
    ],
    averageDuration: 28.4,
    technicalMetrics: {
      averageLatency: 245,
      packetLoss: 1.2,
      connectionIssues: 18
    },
    trends: [
      { day: 'Monday', count: 14 },
      { day: 'Tuesday', count: 18 },
      { day: 'Wednesday', count: 21 },
      { day: 'Thursday', count: 17 },
      { day: 'Friday', count: 23 },
      { day: 'Saturday', count: 16 },
      { day: 'Sunday', count: 13 }
    ],
    qualityRatings: {
      excellent: 42,
      good: 36,
      average: 25,
      poor: 8
    },
    deviceStats: {
      desktop: 68,
      mobile: 46,
      tablet: 8
    }
  };

  // Fetch overview data with mock fallback for demo
  const { 
    data: overviewData, 
    isLoading: isLoadingOverview,
    refetch: refetchOverview
  } = useQuery({
    queryKey: ['/api/analytics/overview'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/analytics/overview');
        return response.json();
      } catch (error) {
        console.log('Using mock overview data for demo');
        return mockOverviewData;
      }
    }
  });

  // Fetch user analytics with mock fallback for demo
  const { 
    data: userData, 
    isLoading: isLoadingUsers,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['/api/analytics/users', dateRange],
    queryFn: async () => {
      try {
        const { startDate, endDate } = getDateRange();
        const response = await apiRequest('GET', `/api/analytics/users?startDate=${startDate}&endDate=${endDate}`);
        return response.json();
      } catch (error) {
        console.log('Using mock user data for demo');
        return mockUserData;
      }
    }
  });

  // Fetch booking analytics with mock fallback for demo
  const { 
    data: bookingData, 
    isLoading: isLoadingBookings,
    refetch: refetchBookings
  } = useQuery({
    queryKey: ['/api/analytics/bookings', dateRange],
    queryFn: async () => {
      try {
        const { startDate, endDate } = getDateRange();
        const response = await apiRequest('GET', `/api/analytics/bookings?startDate=${startDate}&endDate=${endDate}`);
        return response.json();
      } catch (error) {
        console.log('Using mock booking data for demo');
        return mockBookingData;
      }
    }
  });

  // Fetch revenue analytics with mock fallback for demo
  const { 
    data: revenueData, 
    isLoading: isLoadingRevenue,
    refetch: refetchRevenue
  } = useQuery({
    queryKey: ['/api/analytics/revenue', dateRange],
    queryFn: async () => {
      try {
        const { startDate, endDate } = getDateRange();
        const response = await apiRequest('GET', `/api/analytics/revenue?startDate=${startDate}&endDate=${endDate}`);
        return response.json();
      } catch (error) {
        console.log('Using mock revenue data for demo');
        return mockRevenueData;
      }
    }
  });

  // Fetch chatbot analytics with mock fallback for demo
  const { 
    data: chatbotData, 
    isLoading: isLoadingChatbot,
    refetch: refetchChatbot
  } = useQuery({
    queryKey: ['/api/analytics/chatbot'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/analytics/chatbot');
        return response.json();
      } catch (error) {
        console.log('Using mock chatbot data for demo');
        return mockChatbotData;
      }
    }
  });

  // Fetch video analytics with mock fallback for demo
  const { 
    data: videoData, 
    isLoading: isLoadingVideo,
    refetch: refetchVideo
  } = useQuery({
    queryKey: ['/api/analytics/video'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/analytics/video');
        return response.json();
      } catch (error) {
        console.log('Using mock video data for demo');
        return mockVideoData;
      }
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