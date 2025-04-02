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

interface UserData {
  growth: Array<{
    month: string;
    newUsers: number;
  }>;
  byRole: Array<{
    role: string;
    count: number;
  }>;
  byCity: Array<{
    city: string;
    count: number;
  }>;
  byAge: Array<{
    ageGroup: string;
    count: number;
  }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'];

const formatMonth = (dateString: string) => {
  // Format "2025-04-01 00:00:00" to "Apr"
  const date = new Date(dateString);
  return date.toLocaleString('default', { month: 'short' });
};

const UserAnalytics: React.FC<{ data: UserData }> = ({ data }) => {
  // Format data for charts
  const formattedGrowthData = data.growth.map(item => ({
    ...item,
    month: formatMonth(item.month)
  }));

  // Role mapping for better display
  const roleMap: Record<string, string> = {
    customer: 'Customers',
    guruji: 'Gurujis',
    admin: 'Admins'
  };

  const formattedRoleData = data.byRole.map(item => ({
    ...item,
    role: roleMap[item.role] || item.role
  }));

  // Calculate total users
  const totalUsers = data.byRole.reduce((sum, item) => sum + item.count, 0);

  // Calculate percentage for each role
  const rolePercentageData = formattedRoleData.map(item => ({
    ...item,
    percentage: ((item.count / totalUsers) * 100).toFixed(1)
  }));

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Growth Over Time</CardTitle>
            <CardDescription>Monthly new user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={formattedGrowthData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} users`, 'New Registrations']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="newUsers" 
                    name="New Users" 
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
            <CardTitle>User Distribution by Role</CardTitle>
            <CardDescription>Breakdown of user types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rolePercentageData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="role"
                    label={({ role, percentage }) => `${role}: ${percentage}%`}
                  >
                    {rolePercentageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} users`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Cities</CardTitle>
            <CardDescription>User distribution by location</CardDescription>
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
                  <Tooltip formatter={(value) => [`${value} users`, 'Count']} />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="Users" 
                    fill="#82ca9d" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Age Distribution</CardTitle>
            <CardDescription>Users by age group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.byAge}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageGroup" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} users`, 'Count']} />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="Users" 
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
          <CardTitle>User Demographics Summary</CardTitle>
          <CardDescription>Key insights about user distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-medium mb-2">Total Users</h3>
              <p className="text-3xl font-bold">{totalUsers}</p>
            </div>
            
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-medium mb-2">Customer/Guruji Ratio</h3>
              <p className="text-3xl font-bold">
                {
                  data.byRole.find(r => r.role === 'customer')?.count || 0 > 0 && 
                  data.byRole.find(r => r.role === 'guruji')?.count || 0 > 0 
                    ? (
                        (data.byRole.find(r => r.role === 'customer')?.count || 0) / 
                        (data.byRole.find(r => r.role === 'guruji')?.count || 1)
                      ).toFixed(1)
                    : '0'
                }:1
              </p>
            </div>
            
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-medium mb-2">Growth Rate</h3>
              <p className="text-3xl font-bold">
                {
                  formattedGrowthData.length > 1 
                    ? ((
                        (formattedGrowthData[formattedGrowthData.length - 1].newUsers - 
                         formattedGrowthData[formattedGrowthData.length - 2].newUsers) / 
                        formattedGrowthData[formattedGrowthData.length - 2].newUsers
                      ) * 100).toFixed(1) + '%'
                    : '0%'
                }
              </p>
            </div>
            
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-medium mb-2">Top City</h3>
              <p className="text-3xl font-bold">
                {data.byCity.length > 0 ? data.byCity[0].city : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserAnalytics;