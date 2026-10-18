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
import { ArrowUpRight, TrendingUp, IndianRupee } from 'lucide-react';

interface RevenueData {
  trends: Array<{
    month: string;
    revenue: number;
  }>;
  byPujaType: Array<{
    pujaType: string;
    revenue: number;
  }>;
  topGurujis: Array<{
    name: string;
    revenue: number;
    bookingCount: number;
  }>;
  byPaymentMethod: Array<{
    method: string;
    count: number;
  }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'];

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

const RevenueAnalytics: React.FC<{ data: RevenueData }> = ({ data }) => {
  // Format data for charts
  const formattedTrendData = data.trends.map(item => ({
    ...item,
    month: formatMonth(item.month),
    formattedRevenue: formatCurrency(item.revenue)
  }));

  // Calculate totals
  const totalRevenue = data.trends.reduce((sum, item) => sum + item.revenue, 0);
  const totalBookings = data.topGurujis.reduce((sum, guruji) => sum + guruji.bookingCount, 0);
  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // Format puja type data
  const formattedPujaTypeData = data.byPujaType.map(item => ({
    ...item,
    pujaType: item.pujaType === 'online' ? 'Online' : 'Offline',
    formattedRevenue: formatCurrency(item.revenue)
  }));

  // Format payment method data for pie chart
  const paymentMethodData = data.byPaymentMethod.map(item => ({
    ...item,
    name: item.method,
    value: item.count
  }));

  // Calculate month-over-month growth
  const monthlyGrowth = formattedTrendData.length >= 2 
    ? ((formattedTrendData[formattedTrendData.length - 1].revenue - 
        formattedTrendData[formattedTrendData.length - 2].revenue) / 
       formattedTrendData[formattedTrendData.length - 2].revenue * 100).toFixed(1)
    : '0';

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <div className="flex items-center mt-1 text-xs">
              <span className={Number(monthlyGrowth) >= 0 ? "text-green-500" : "text-red-500"}>
                {Number(monthlyGrowth) >= 0 ? "+" : ""}{monthlyGrowth}%
              </span>
              <TrendingUp className={`h-3 w-3 ml-1 ${Number(monthlyGrowth) >= 0 ? "text-green-500" : "text-red-500"}`} />
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Booking Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageBookingValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per booking revenue
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Online vs Offline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                formattedPujaTypeData.find(p => p.pujaType === 'Online')?.revenue || 0 > 0 &&
                formattedPujaTypeData.find(p => p.pujaType === 'Offline')?.revenue || 0 > 0
                  ? (
                      (formattedPujaTypeData.find(p => p.pujaType === 'Online')?.revenue || 0) /
                      (formattedPujaTypeData.find(p => p.pujaType === 'Offline')?.revenue || 1)
                    ).toFixed(2)
                  : '0'
              }
              <span className="text-sm ml-1">ratio</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Online to offline revenue ratio
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Earner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {data.topGurujis.length > 0 ? formatCurrency(data.topGurujis[0].revenue) : '₹0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {data.topGurujis.length > 0 ? data.topGurujis[0].name : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
            <CardDescription>Monthly revenue</CardDescription>
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
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenue" 
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
            <CardTitle>Revenue by Puja Type</CardTitle>
            <CardDescription>Online vs Offline distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedPujaTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="revenue"
                    nameKey="pujaType"
                    label={({ pujaType, revenue, percent }) => 
                      `${pujaType}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {formattedPujaTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                  <Legend formatter={(value) => (
                    <span className="flex items-center">
                      <span>{value}</span>
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
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Distribution by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} transactions`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Earning Gurujis</CardTitle>
            <CardDescription>Revenue by top performers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Avg/Booking</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topGurujis.map((guruji, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{guruji.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(guruji.revenue)}</TableCell>
                      <TableCell className="text-right">{guruji.bookingCount}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(guruji.revenue / guruji.bookingCount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Summary</CardTitle>
          <CardDescription>Key revenue metrics and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Revenue Highlights</h3>
              <p className="text-sm text-muted-foreground">
                Total revenue across all channels and services is <span className="font-bold">{formatCurrency(totalRevenue)}</span> with 
                a <span className={Number(monthlyGrowth) >= 0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                  {Number(monthlyGrowth) >= 0 ? "+" : ""}{monthlyGrowth}%
                </span> month-over-month growth rate.
              </p>
              
              <div className="pt-4">
                <h3 className="text-lg font-medium">Revenue Distribution</h3>
                <p className="text-sm text-muted-foreground">
                  {
                    formattedPujaTypeData.length > 0 
                      ? `${formattedPujaTypeData[0].pujaType} pujas account for ${
                          ((formattedPujaTypeData[0].revenue / totalRevenue) * 100).toFixed(1)
                        }% of total revenue, while ${formattedPujaTypeData[1]?.pujaType || 'other'} pujas make up the remaining ${
                          ((formattedPujaTypeData[1]?.revenue || 0) / totalRevenue * 100).toFixed(1)
                        }%.`
                      : 'No puja type data available.'
                  }
                </p>
              </div>
              
              <div className="pt-4">
                <h3 className="text-lg font-medium">Payment Insights</h3>
                <p className="text-sm text-muted-foreground">
                  {
                    paymentMethodData.length > 0 
                      ? `${paymentMethodData[0].name} is the most popular payment method, accounting for ${
                          ((paymentMethodData[0].value / paymentMethodData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)
                        }% of all transactions.`
                      : 'No payment method data available.'
                  }
                </p>
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Top Performer Analysis</h3>
              {data.topGurujis.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  The top earning guruji, <span className="font-bold">{data.topGurujis[0].name}</span>, has generated <span className="font-bold">{formatCurrency(data.topGurujis[0].revenue)}</span> from 
                  <span className="font-bold"> {data.topGurujis[0].bookingCount}</span> bookings, with an average of <span className="font-bold">{formatCurrency(data.topGurujis[0].revenue / data.topGurujis[0].bookingCount)}</span> per booking.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No top guruji data available.
                </p>
              )}
              
              <div className="pt-4">
                <h3 className="text-lg font-medium">Revenue Efficiency</h3>
                <p className="text-sm text-muted-foreground">
                  The average booking value across all services is <span className="font-bold">{formatCurrency(averageBookingValue)}</span>.
                  {data.topGurujis.length > 1 && (
                    <> The top 3 gurujis account for <span className="font-bold">{
                      ((data.topGurujis.slice(0, 3).reduce((sum, guruji) => sum + guruji.revenue, 0) / totalRevenue) * 100).toFixed(1)
                    }%</span> of the total revenue.</>
                  )}
                </p>
              </div>
              
              <div className="pt-4">
                <h3 className="text-lg font-medium">Growth Opportunities</h3>
                <p className="text-sm text-muted-foreground">
                  {
                    formattedTrendData.length > 0 && Number(monthlyGrowth) < 0
                      ? 'Revenue shows a downward trend. Consider promotional campaigns or new service offerings to reverse this trend.'
                      : 'Revenue is trending upward. Focus on retaining top performers and expanding high-revenue service offerings.'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueAnalytics;