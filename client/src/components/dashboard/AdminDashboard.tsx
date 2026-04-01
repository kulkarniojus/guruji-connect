import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  DollarSign, 
  Search, 
  UserX, 
  Clock,
  BarChart,
  Settings,
  Edit,
  Lock,
  Unlock,
  Check,
  X
} from 'lucide-react';
import { DataTable } from '../ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as BarChartComponent,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);

  // Fetch users
  const { 
    data: users = [], 
    isLoading: isUsersLoading, 
    error: usersError 
  } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: !!user && user.role === 'admin',
  });

  // Fetch bookings
  const { 
    data: bookings = [], 
    isLoading: isBookingsLoading, 
    error: bookingsError 
  } = useQuery({
    queryKey: ['/api/bookings'],
    enabled: !!user && user.role === 'admin',
  });

  // Block/unblock user mutations
  const blockUserMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest('PUT', `/api/admin/users/${userId}/block`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'User blocked',
        description: 'User has been blocked successfully',
      });
      setIsBlockDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to block user',
        description: 'An error occurred while blocking the user',
        variant: 'destructive',
      });
    }
  });

  const unblockUserMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest('PUT', `/api/admin/users/${userId}/unblock`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'User unblocked',
        description: 'User has been unblocked successfully',
      });
      setIsBlockDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to unblock user',
        description: 'An error occurred while unblocking the user',
        variant: 'destructive',
      });
    }
  });

  // Calculate statistics
  const totalCustomers = users.filter((user: any) => user.role === 'customer').length;
  const totalGurujis = users.filter((user: any) => user.role === 'guruji').length;
  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((sum: number, booking: any) => sum + (booking.amount || 0), 0);
  const pendingBookings = bookings.filter((booking: any) => booking.status === 'pending').length;

  // Filter users based on search
  const filteredUsers = searchQuery
    ? users.filter((user: any) => 
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.mobile.includes(searchQuery)
      )
    : users;

  const gurujiColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'firstName',
      header: 'First Name',
    },
    {
      accessorKey: 'lastName',
      header: 'Last Name',
    },
    {
      accessorKey: 'mobile',
      header: 'Mobile',
    },
    {
      accessorKey: 'isVerified',
      header: 'Verified',
      cell: ({ row }) => (
        <Badge variant={row.original.isVerified ? 'default' : 'outline'}>
          {row.original.isVerified ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      accessorKey: 'isBlocked',
      header: 'Status',
      cell: ({ row }) => (
        <Badge 
          variant={row.original.isBlocked ? 'destructive' : 'outline'} 
          className={!row.original.isBlocked ? 'bg-green-50 text-green-700 hover:bg-green-50 border-green-300' : ''}
        >
          {row.original.isBlocked ? 'Blocked' : 'Active'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setSelectedUser(row.original);
              setIsEditDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant={row.original.isBlocked ? 'outline' : 'destructive'} 
            size="sm"
            onClick={() => {
              setSelectedUser(row.original);
              setIsBlockDialogOpen(true);
            }}
          >
            {row.original.isBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ];

  // Mock chart data - in a real app, this would come from the API
  const bookingStats = [
    { name: 'Jan', bookings: 65 },
    { name: 'Feb', bookings: 78 },
    { name: 'Mar', bookings: 90 },
    { name: 'Apr', bookings: 81 },
    { name: 'May', bookings: 95 },
    { name: 'Jun', bookings: 110 },
    { name: 'Jul', bookings: 129 },
  ];

  const pujaStats = [
    { name: 'Satyanarayan Puja', count: 42 },
    { name: 'Ganesh Puja', count: 28 },
    { name: 'Griha Pravesh', count: 19 },
    { name: 'Navgraha Shanti', count: 15 },
    { name: 'Other', count: 24 },
  ];

  const pieColors = ['#FF9800', '#FFC107', '#4CAF50', '#2196F3', '#9E9E9E'];

  if (isUsersLoading || isBookingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (usersError || bookingsError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading dashboard data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 font-poppins">Admin Dashboard</h1>
        <p className="text-neutral-600">Manage users, bookings, and system settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Total Users</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Total Gurujis</p>
                <p className="text-3xl font-bold">{totalGurujis}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-full">
                <BookOpen className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Total Bookings</p>
                <p className="text-3xl font-bold">{totalBookings}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Revenue</p>
                <p className="text-3xl font-bold">₹{totalRevenue}</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-full">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Pending Bookings</p>
                <p className="text-3xl font-bold">{pendingBookings}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <Clock className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Booking Trends</CardTitle>
            <CardDescription>Monthly booking statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={bookingStats}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="bookings" stroke="#FF9800" fill="#FFE0B2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Pujas</CardTitle>
            <CardDescription>Most booked pujas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pujaStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pujaStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Tabs defaultValue="gurujis">
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="gurujis">Gurujis</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
            </TabsList>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                className="pl-10 pr-4 w-64"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="gurujis">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle>Guruji Management</CardTitle>
                <CardDescription>Manage all gurujis on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable 
                  columns={gurujiColumns} 
                  data={filteredUsers.filter((user: any) => user.role === 'guruji')} 
                  searchKey="firstName"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>Manage all customers on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable 
                  columns={gurujiColumns} 
                  data={filteredUsers.filter((user: any) => user.role === 'customer')} 
                  searchKey="firstName"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle>Booking Management</CardTitle>
                <CardDescription>Manage and assign bookings to gurujis</CardDescription>
              </CardHeader>
              <CardContent>
                {isBookingsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : bookings.length === 0 ? (
                  <p className="text-center py-4 text-neutral-500">No bookings found</p>
                ) : (
                  <div className="space-y-4">
                    {bookings.slice(0, 10).map((booking: any) => (
                      <div key={booking.id} className="border rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">Booking #{booking.id}</p>
                          <p className="text-sm text-neutral-500">
                            {booking.pujaName || 'Puja'} · {booking.city} · Status: <Badge variant="outline">{booking.status}</Badge>
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            Date: {new Date(booking.date).toLocaleDateString('en-IN')} {booking.time && `· Time: ${booking.time}`}
                          </p>
                          {booking.gurujiId && (
                            <p className="text-xs text-green-600 mt-1">✓ Assigned to Guruji ID: {booking.gurujiId}</p>
                          )}
                        </div>
                        <Button variant="outline" size="sm">Manage</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>Configure application settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div className="flex items-center">
                <Settings className="h-5 w-5 mr-3 text-neutral-500" />
                <span>Content Management</span>
              </div>
              <Button variant="outline" size="sm">Manage</Button>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div className="flex items-center">
                <UserX className="h-5 w-5 mr-3 text-neutral-500" />
                <span>User Verification Settings</span>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div className="flex items-center">
                <BarChart className="h-5 w-5 mr-3 text-neutral-500" />
                <span>Analytics Configuration</span>
              </div>
              <Button variant="outline" size="sm">Setup</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center p-3 border-b">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New guruji registered</p>
                  <p className="text-xs text-neutral-500">10 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center p-3 border-b">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Booking completed</p>
                  <p className="text-xs text-neutral-500">1 hour ago</p>
                </div>
              </div>
              <div className="flex items-center p-3 border-b">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Booking cancelled</p>
                  <p className="text-xs text-neutral-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center p-3">
                <div className="w-2 h-2 rounded-full bg-purple-500 mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Content updated</p>
                  <p className="text-xs text-neutral-500">5 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center py-4">User edit functionality will be implemented here</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block/Unblock User Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.isBlocked ? 'Unblock User' : 'Block User'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to {selectedUser?.isBlocked ? 'unblock' : 'block'} {selectedUser?.firstName} {selectedUser?.lastName}?
            </p>
            {!selectedUser?.isBlocked && (
              <p className="text-red-500 mt-2">
                This will prevent the user from using the platform.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>Cancel</Button>
            <Button 
              variant={selectedUser?.isBlocked ? "default" : "destructive"}
              onClick={() => {
                if (selectedUser) {
                  if (selectedUser.isBlocked) {
                    unblockUserMutation.mutate(selectedUser.id);
                  } else {
                    blockUserMutation.mutate(selectedUser.id);
                  }
                }
              }}
              disabled={blockUserMutation.isPending || unblockUserMutation.isPending}
            >
              {blockUserMutation.isPending || unblockUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : selectedUser?.isBlocked ? (
                <Unlock className="h-4 w-4 mr-2" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              {selectedUser?.isBlocked ? 'Unblock' : 'Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
