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
import { 
  Users,
  Calendar,
  IndianRupee,
  Star,
  PersonStanding,
  FlowerIcon,
  MessageCircle,
  TrendingUp,
  Clock
} from 'lucide-react';

interface OverviewData {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  totalGurujis: number;
  totalPujas: number;
  activeWhatsappUsers: number;
  newUsers30Days: number;
  newBookings30Days: number;
  revenue30Days: number;
  averageRating: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  color?: string;
  percentChange?: number;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  description, 
  icon,
  color = "text-primary",
  percentChange
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className={`${color} rounded-full p-2 bg-background`}>
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      )}
      {percentChange !== undefined && (
        <div className="flex items-center mt-1">
          <span className={percentChange >= 0 ? "text-green-500" : "text-red-500"}>
            {percentChange >= 0 ? "+" : ""}{percentChange}%
          </span>
          <TrendingUp className={`h-3 w-3 ml-1 ${percentChange >= 0 ? "text-green-500" : "text-red-500"}`} />
        </div>
      )}
    </CardContent>
  </Card>
);

const formatCurrency = (value: number | undefined) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value || 0);
};

const OverviewSection: React.FC<{ data: OverviewData }> = ({ data }) => {
  // Use default values for all data to prevent undefined errors
  const totalUsers = data?.totalUsers || 0;
  const totalBookings = data?.totalBookings || 0;
  const totalRevenue = data?.totalRevenue || 0;
  const totalGurujis = data?.totalGurujis || 0;
  const totalPujas = data?.totalPujas || 0;
  const activeWhatsappUsers = data?.activeWhatsappUsers || 0;
  const newUsers30Days = data?.newUsers30Days || 0;
  const newBookings30Days = data?.newBookings30Days || 0;
  const revenue30Days = data?.revenue30Days || 0;
  const averageRating = data?.averageRating || 4.5;
  
  // Calculate growth percentages safely
  const userGrowth = totalUsers > newUsers30Days ? 
    ((newUsers30Days / (totalUsers - newUsers30Days)) * 100).toFixed(1) : '0.0';
  const bookingGrowth = totalBookings > newBookings30Days ? 
    ((newBookings30Days / (totalBookings - newBookings30Days)) * 100).toFixed(1) : '0.0';

  // Chart data with safe values - calculate total customers vs gurujis
  const customers = Math.max(0, totalUsers - totalGurujis);
  
  // Ensure we always have at least 1 for each category to avoid rendering issues
  const pieData = [
    { name: 'Customers', value: customers || 1, color: '#8884d8' },
    { name: 'Gurujis', value: totalGurujis || 1, color: '#82ca9d' },
  ];

  const barData = [
    { name: 'Users', value: newUsers30Days, color: '#8884d8' },
    { name: 'Bookings', value: newBookings30Days, color: '#82ca9d' },
    { name: 'Revenue (₹K)', value: revenue30Days / 1000, color: '#ffc658' },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={totalUsers}
          description="All registered users"
          icon={<Users className="h-5 w-5" />}
          color="text-blue-500"
          percentChange={Number(userGrowth)}
        />
        <StatCard
          title="Total Bookings"
          value={totalBookings}
          description="All time bookings"
          icon={<Calendar className="h-5 w-5" />}
          color="text-purple-500"
          percentChange={Number(bookingGrowth)}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          description="All time revenue"
          icon={<IndianRupee className="h-5 w-5" />}
          color="text-green-500"
        />
        <StatCard
          title="Average Rating"
          value={averageRating.toFixed(1)}
          description="Overall customer satisfaction"
          icon={<Star className="h-5 w-5" />}
          color="text-yellow-500"
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Gurujis"
          value={totalGurujis}
          description="Registered religious professionals"
          icon={<PersonStanding className="h-5 w-5" />}
          color="text-orange-500"
        />
        <StatCard
          title="Total Pujas"
          value={totalPujas}
          description="Available religious services"
          icon={<FlowerIcon className="h-5 w-5" />}
          color="text-red-500"
        />
        <StatCard
          title="Active WhatsApp Users"
          value={activeWhatsappUsers}
          description="Users subscribed to WhatsApp"
          icon={<MessageCircle className="h-5 w-5" />}
          color="text-teal-500"
        />
        <StatCard
          title="New Bookings (30d)"
          value={newBookings30Days}
          description="Recent booking activity"
          icon={<Clock className="h-5 w-5" />}
          color="text-indigo-500"
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>Distribution of customers vs. gurujis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Users']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Monthly Growth</CardTitle>
            <CardDescription>New users and bookings in last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    name === 'Revenue (₹K)' ? `₹${value}K` : value, 
                    name
                  ]} />
                  <Legend />
                  <Bar dataKey="value" name="Last 30 Days">
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewSection;