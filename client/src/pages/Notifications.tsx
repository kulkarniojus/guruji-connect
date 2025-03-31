import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useIsMobile } from '@/hooks/use-mobile';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Calendar, 
  CheckCircle, 
  MessageCircle, 
  CreditCard, 
  Star, 
  ChevronLeft,
  Trash2 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// Mock notification data
const notifications = [
  {
    id: 1,
    type: 'booking',
    title: 'Booking Confirmed',
    description: 'Your Satyanarayan Puja booking has been confirmed with Pandit Ramesh Shastri.',
    time: '2 hours ago',
    read: false
  },
  {
    id: 2,
    type: 'payment',
    title: 'Payment Successful',
    description: 'Your payment of ₹3500 for Satyanarayan Puja has been received.',
    time: '2 hours ago',
    read: false
  },
  {
    id: 3,
    type: 'message',
    title: 'New Message',
    description: 'Pandit Ramesh Shastri has sent you a message regarding your upcoming puja.',
    time: '1 day ago',
    read: true
  },
  {
    id: 4,
    type: 'system',
    title: 'Profile Update Reminder',
    description: 'Please complete your profile to get personalized recommendations.',
    time: '3 days ago',
    read: true
  },
  {
    id: 5,
    type: 'booking',
    title: 'Booking Reminder',
    description: 'Your Griha Pravesh puja is scheduled for tomorrow at 9:30 AM.',
    time: '1 week ago',
    read: true
  }
];

// Get icon for notification type
const getNotificationIcon = (type: string) => {
  switch(type) {
    case 'booking':
      return <Calendar className="h-5 w-5 text-blue-500" />;
    case 'payment':
      return <CreditCard className="h-5 w-5 text-green-500" />;
    case 'message':
      return <MessageCircle className="h-5 w-5 text-violet-500" />;
    case 'review':
      return <Star className="h-5 w-5 text-yellow-500" />;
    default:
      return <Bell className="h-5 w-5 text-neutral-500" />;
  }
};

// Mobile Notifications component
function MobileNotifications() {
  const [activeTab, setActiveTab] = useState('all');
  const [notificationItems, setNotificationItems] = useState(notifications);
  
  const unreadCount = notificationItems.filter(n => !n.read).length;
  
  const markAsRead = (id: number) => {
    setNotificationItems(prevNotifications => 
      prevNotifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };
  
  const markAllAsRead = () => {
    setNotificationItems(prevNotifications => 
      prevNotifications.map(notification => ({ ...notification, read: true }))
    );
  };
  
  const clearAllNotifications = () => {
    setNotificationItems([]);
  };
  
  const deleteNotification = (id: number) => {
    setNotificationItems(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== id)
    );
  };
  
  const filteredNotifications = activeTab === 'all' 
    ? notificationItems 
    : activeTab === 'unread'
      ? notificationItems.filter(n => !n.read)
      : notificationItems.filter(n => n.type === activeTab);
  
  return (
    <div className="pb-14">
      <div className="bg-primary text-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge className="bg-white text-primary">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearAllNotifications}
            disabled={notificationItems.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear all
          </Button>
        </div>
        
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4 grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="booking">Bookings</TabsTrigger>
            <TabsTrigger value="message">Messages</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-4">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer ${!notification.read ? 'border-l-4 border-l-primary' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <CardContent className="p-4 flex items-start">
                    <div className="mr-3 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h3 className={`font-medium ${!notification.read ? 'text-primary' : ''}`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center">
                          <span className="text-xs text-neutral-500 mr-2">
                            {notification.time}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-neutral-400" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600 mt-1">
                        {notification.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-10">
                <Bell className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium">No notifications</h3>
                <p className="text-neutral-500 mt-2">
                  {activeTab === 'all' 
                    ? "You don't have any notifications yet" 
                    : `You don't have any ${activeTab} notifications`}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Desktop Notifications component
function DesktopNotifications() {
  const [activeTab, setActiveTab] = useState('all');
  const [notificationItems, setNotificationItems] = useState(notifications);
  
  const unreadCount = notificationItems.filter(n => !n.read).length;
  
  const markAsRead = (id: number) => {
    setNotificationItems(prevNotifications => 
      prevNotifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };
  
  const markAllAsRead = () => {
    setNotificationItems(prevNotifications => 
      prevNotifications.map(notification => ({ ...notification, read: true }))
    );
  };
  
  const clearAllNotifications = () => {
    setNotificationItems([]);
  };
  
  const deleteNotification = (id: number) => {
    setNotificationItems(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== id)
    );
  };
  
  const filteredNotifications = activeTab === 'all' 
    ? notificationItems 
    : activeTab === 'unread'
      ? notificationItems.filter(n => !n.read)
      : notificationItems.filter(n => n.type === activeTab);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Notifications</CardTitle>
              <CardDescription>
                Stay updated with your bookings, messages, and more
              </CardDescription>
            </div>
            
            {unreadCount > 0 && (
              <Badge className="bg-primary">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex justify-between mb-6">
            <Button 
              variant="outline" 
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
            
            <Button 
              variant="outline" 
              onClick={clearAllNotifications}
              disabled={notificationItems.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear all
            </Button>
          </div>
          
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="booking">Bookings</TabsTrigger>
              <TabsTrigger value="payment">Payments</TabsTrigger>
              <TabsTrigger value="message">Messages</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab}>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => (
                      <Card 
                        key={notification.id} 
                        className={`cursor-pointer hover:bg-neutral-50 ${!notification.read ? 'border-l-4 border-l-primary' : ''}`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CardContent className="p-4 flex items-start">
                          <div className="mr-4 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-grow">
                            <div className="flex justify-between items-start">
                              <h3 className={`font-medium ${!notification.read ? 'text-primary' : ''}`}>
                                {notification.title}
                              </h3>
                              <div className="flex items-center">
                                <span className="text-sm text-neutral-500 mr-3">
                                  {notification.time}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-neutral-400" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-neutral-600 mt-1">
                              {notification.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <Bell className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                      <h3 className="text-xl font-medium">No notifications</h3>
                      <p className="text-neutral-500 mt-2">
                        {activeTab === 'all' 
                          ? "You don't have any notifications yet" 
                          : `You don't have any ${activeTab} notifications`}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Notifications() {
  const isMobile = useIsMobile();
  
  return (
    <>
      <Helmet>
        <title>Notifications | GurujiConnect</title>
        <meta name="description" content="Stay updated with your bookings, messages, and account activity" />
        {isMobile && <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />}
      </Helmet>
      
      {isMobile ? (
        <MobileLayout>
          <MobileNotifications />
        </MobileLayout>
      ) : (
        <div className="min-h-screen bg-neutral-50 flex flex-col">
          <Header />
          <main className="flex-grow">
            <DesktopNotifications />
          </main>
          <Footer />
        </div>
      )}
    </>
  );
}