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
import { Badge } from '@/components/ui/badge';
import { 
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';

interface BookingData {
  trends: Array<{
    month: string;
    count: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
  byCity: Array<{
    city: string;
    count: number;
  }>;
  popularPujas: Array<{
    name: string;
    count: number;
  }>;
  averageValue: number;
  completionRate: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <CalendarClock className="h-4 w-4 text-yellow-600" />,
  confirmed: <CalendarCheck className="h-4 w-4 text-blue-600" />,
  in_progress: <Clock className="h-4 w-4 text-indigo-600" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  cancelled: <XCircle className="h-4 w-4 text-red-600" />,
};

const formatMonth = (dateString: string) => {
  // Format "2025-04-01 00:00:00" to "Apr"
  const date = new Date(dateString);
  return date.toLocaleString('default', { month: 'short' });
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

const formatStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
};

const BookingAnalytics: React.FC<{ data: BookingData }> = ({ data }) => {
  // Format data for charts
  const formattedTrendData = data.trends.map(item => ({
    ...item,
    month: formatMonth(item.month)
  }));

  // Format status data with nice labels
  const formattedStatusData = data.byStatus.map(item => ({
    ...item,
    status: formatStatusLabel(item.status)
  }));
  
  // Calculate total bookings
  const totalBookings = data.byStatus.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All bookings in selected period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully completed bookings
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Booking Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.averageValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average revenue per booking
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancellation Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                (data.byStatus.find(s => s.status === 'cancelled')?.count || 0) > 0
                  ? ((data.byStatus.find(s => s.status === 'cancelled')?.count || 0) / totalBookings * 100).toFixed(1)
                  : '0'
              }%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Percentage of cancelled bookings
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking Trends</CardTitle>
            <CardDescription>Monthly booking volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={formattedTrendData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} bookings`, 'Count']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="Bookings" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Status</CardTitle>
            <CardDescription>Distribution by booking status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {formattedStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} bookings`, 'Count']} />
                  <Legend formatter={(value) => (
                    <span className="flex items-center">
                      {STATUS_ICONS[value.toLowerCase().replace(' ', '_')] || null}
                      <span className="ml-1">{value}</span>
                    </span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Cities</CardTitle>
            <CardDescription>Most popular booking locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.byCity}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="city" 
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip formatter={(value) => [`${value} bookings`, 'Count']} />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="Bookings" 
                    fill="#82ca9d" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Puja Services</CardTitle>
            <CardDescription>Most requested services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.popularPujas}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    width={150}
                  />
                  <Tooltip formatter={(value) => [`${value} bookings`, 'Count']} />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="Bookings" 
                    fill="#8884d8" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Status Breakdown</CardTitle>
          <CardDescription>Detailed view of all booking statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            {formattedStatusData.map((status) => (
              <div 
                key={status.status} 
                className={`border rounded-lg p-4 flex flex-col items-center justify-center ${
                  STATUS_COLORS[status.status.toLowerCase().replace(' ', '_')] || 'bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  {STATUS_ICONS[status.status.toLowerCase().replace(' ', '_')] || null}
                </div>
                <p className="text-sm font-medium">{status.status}</p>
                <p className="text-2xl font-bold mt-1">{status.count}</p>
                <p className="text-xs mt-1">
                  {((status.count / totalBookings) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingAnalytics;