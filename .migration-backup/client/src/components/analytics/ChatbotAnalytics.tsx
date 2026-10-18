import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare,
  Users,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  MessagesSquare,
  Bot
} from 'lucide-react';

interface ChatbotData {
  totalMessages: number;
  byIntent: Array<{
    intent: string;
    count: number;
  }>;
  totalConversations: number;
  averageMessagesPerConversation: number;
  userEngagement: Array<{
    day: string;
    activeUsers: number;
  }>;
  popularTemplates: Array<{
    templateName: string;
    usageCount: number;
  }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'];

const INTENT_COLORS: Record<string, string> = {
  greeting: 'bg-blue-100 text-blue-800',
  booking_inquiry: 'bg-green-100 text-green-800',
  puja_information: 'bg-purple-100 text-purple-800',
  guruji_availability: 'bg-indigo-100 text-indigo-800',
  payment_issue: 'bg-red-100 text-red-800',
  cancel_booking: 'bg-orange-100 text-orange-800',
  reschedule_booking: 'bg-yellow-100 text-yellow-800',
  general_inquiry: 'bg-teal-100 text-teal-800',
  technical_support: 'bg-gray-100 text-gray-800',
  other: 'bg-pink-100 text-pink-800',
};

const formatDay = (dateString: string) => {
  // Format "2025-04-01 00:00:00" to "Apr 1"
  const date = new Date(dateString);
  return date.toLocaleString('default', { month: 'short', day: 'numeric' });
};

const formatIntent = (intent: string) => {
  return intent
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const ChatbotAnalytics: React.FC<{ data: ChatbotData }> = ({ data }) => {
  // Format data for charts
  const formattedEngagementData = data.userEngagement.map(item => ({
    ...item,
    day: formatDay(item.day)
  }));

  // Format intent data with nice labels
  const formattedIntentData = data.byIntent.map(item => ({
    ...item,
    name: formatIntent(item.intent),
    value: item.count,
  }));

  // Sort templates by usage
  const sortedTemplates = [...data.popularTemplates].sort((a, b) => b.usageCount - a.usageCount);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              WhatsApp messages processed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalConversations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique customer interactions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Messages per Conversation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageMessagesPerConversation}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average conversation length
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                data.byIntent.length > 0 
                  ? (
                      ((data.byIntent.filter(i => 
                        !['payment_issue', 'technical_support', 'cancel_booking'].includes(i.intent)
                      ).reduce((sum, i) => sum + i.count, 0) / 
                      data.byIntent.reduce((sum, i) => sum + i.count, 0)) * 100).toFixed(1)
                    ) + '%'
                  : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Positive interaction rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Message Intent Distribution</CardTitle>
            <CardDescription>Types of customer inquiries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedIntentData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {formattedIntentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} messages`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
            <CardDescription>Daily active WhatsApp users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={formattedEngagementData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} users`, 'Active Users']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="activeUsers" 
                    name="Active Users" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Intent Analysis</CardTitle>
            <CardDescription>Distribution of user intentions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 overflow-y-auto grid grid-cols-1 gap-2">
              {formattedIntentData.map(intent => (
                <div 
                  key={intent.name}
                  className="flex items-center justify-between p-3 rounded-md border"
                >
                  <div className="flex items-center">
                    <Badge className={`${INTENT_COLORS[intent.name.toLowerCase().replace(' ', '_')] || 'bg-gray-100 text-gray-800'} mr-2`}>
                      {intent.name}
                    </Badge>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">{intent.value}</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      ({((intent.value / data.totalMessages) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Used Templates</CardTitle>
            <CardDescription>Popular response templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sortedTemplates}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="templateName" 
                    tick={{ fontSize: 12 }}
                    width={150}
                  />
                  <Tooltip formatter={(value) => [`${value} uses`, 'Usage']} />
                  <Legend />
                  <Bar 
                    dataKey="usageCount" 
                    name="Usage Count" 
                    fill="#82ca9d" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ChatBot Performance Summary</CardTitle>
          <CardDescription>Key insights and analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-4 flex items-center">
              <MessageSquare className="h-8 w-8 text-primary mr-3" />
              <div>
                <h3 className="font-medium">Total Interactions</h3>
                <p className="text-2xl font-bold mt-1">{data.totalMessages.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="bg-muted rounded-lg p-4 flex items-center">
              <Users className="h-8 w-8 text-primary mr-3" />
              <div>
                <h3 className="font-medium">Customer Engagement</h3>
                <p className="text-2xl font-bold mt-1">
                  {data.userEngagement.length > 0 
                    ? `${data.userEngagement[data.userEngagement.length - 1].activeUsers} active`
                    : '0 active'
                  }
                </p>
              </div>
            </div>
            
            <div className="bg-muted rounded-lg p-4 flex items-center">
              <Bot className="h-8 w-8 text-primary mr-3" />
              <div>
                <h3 className="font-medium">Bot Efficiency</h3>
                <p className="text-2xl font-bold mt-1">
                  {data.averageMessagesPerConversation.toFixed(1)} msg/conv
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Key Insights</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <MessageCircle className="h-4 w-4 text-primary mt-1 mr-2" />
                <span>
                  The chatbot has processed a total of <span className="font-medium">{data.totalMessages.toLocaleString()}</span> messages
                  across <span className="font-medium">{data.totalConversations.toLocaleString()}</span> unique conversations.
                </span>
              </li>
              
              {formattedIntentData.length > 0 && (
                <li className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-primary mt-1 mr-2" />
                  <span>
                    The most common user intent is <span className="font-medium">{formattedIntentData[0].name}</span>, 
                    which accounts for <span className="font-medium">
                      {((formattedIntentData[0].value / data.totalMessages) * 100).toFixed(1)}%
                    </span> of all messages.
                  </span>
                </li>
              )}
              
              {sortedTemplates.length > 0 && (
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mt-1 mr-2" />
                  <span>
                    The most frequently used template is <span className="font-medium">{sortedTemplates[0].templateName}</span>, 
                    which has been used <span className="font-medium">{sortedTemplates[0].usageCount.toLocaleString()}</span> times.
                  </span>
                </li>
              )}
              
              {data.userEngagement.length > 0 && (
                <li className="flex items-start">
                  <MessagesSquare className="h-4 w-4 text-primary mt-1 mr-2" />
                  <span>
                    User engagement {
                      data.userEngagement.length > 1 && 
                      data.userEngagement[data.userEngagement.length - 1].activeUsers > 
                      data.userEngagement[data.userEngagement.length - 2].activeUsers
                        ? 'is trending upward'
                        : 'has remained stable'
                    } with an average of <span className="font-medium">
                      {(data.userEngagement.reduce((sum, day) => sum + day.activeUsers, 0) / data.userEngagement.length).toFixed(1)}
                    </span> daily active users.
                  </span>
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatbotAnalytics;