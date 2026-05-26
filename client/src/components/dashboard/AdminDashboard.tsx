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
  X,
  MessageSquare,
  Send,
  AlertTriangle,
  MapPin,
  Phone,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
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

  // Fetch bookings awaiting guruji acceptance
  const { data: pendingAcceptanceBookings = [], isLoading: isPendingLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/pending-bookings'],
    queryFn: async () => {
      const r = await fetch('/api/admin/pending-bookings', { credentials: 'include' });
      return r.ok ? r.json() : [];
    },
    enabled: !!user && user.role === 'admin',
    refetchInterval: 30000,
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
  const pendingBookings = bookings.filter((booking: any) => 
    booking.status === 'pending' || booking.status === 'pending_approval'
  ).length;

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
              <TabsTrigger value="awaiting" className="relative">
                Awaiting Acceptance
                {pendingAcceptanceBookings.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold px-1.5 min-w-[18px] h-[18px]">
                    {pendingAcceptanceBookings.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="queries">Queries</TabsTrigger>
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

          <TabsContent value="awaiting">
            <AwaitingAcceptanceTab bookings={pendingAcceptanceBookings} isLoading={isPendingLoading} />
          </TabsContent>

          <TabsContent value="queries">
            <QueriesTab />
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

// ── Awaiting Acceptance Tab — admin tracks bookings not yet accepted by any guruji ──
function AwaitingAcceptanceTab({ bookings, isLoading }: { bookings: any[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    return `${mins}m ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Bookings Awaiting Guruji Acceptance
        </CardTitle>
        <CardDescription>
          {bookings.length === 0
            ? 'All bookings are attended to.'
            : `${bookings.length} booking${bookings.length > 1 ? 's' : ''} raised but not yet accepted by a guruji`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mb-4">
              <Check className="h-7 w-7 text-green-500" />
            </div>
            <p className="text-lg font-medium text-neutral-700">All clear!</p>
            <p className="text-sm text-neutral-500 mt-1">No bookings are waiting for guruji acceptance right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b: any) => {
              const isPendingApproval = b.status === 'pending_approval';
              const waitTime = getTimeAgo(b.createdat || b.createdAt);
              const pendingReqs = parseInt(b.pending_requests || '0');
              const declinedReqs = parseInt(b.declined_requests || '0');
              const totalReqs = parseInt(b.total_requests || '0');
              return (
                <div
                  key={b.id}
                  className="border-l-4 border-orange-400 bg-orange-50 rounded-r-lg p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-neutral-800">#{b.id} — {b.puja_name || 'Puja Service'}</span>
                      <Badge
                        variant="outline"
                        className={isPendingApproval
                          ? 'border-orange-400 text-orange-700 bg-white'
                          : 'border-amber-400 text-amber-700 bg-white'}
                      >
                        {isPendingApproval ? 'Awaiting guruji response' : 'No guruji assigned yet'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-neutral-700">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-neutral-400" />
                        {b.customer_name || 'Customer'}
                      </span>
                      {b.customer_mobile && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-neutral-400" />
                          {b.customer_mobile}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                        {b.date ? new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        {b.time ? ` · ${b.time}` : ''}
                      </span>
                      {b.city && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                          {b.city}
                        </span>
                      )}
                    </div>

                    {totalReqs > 0 && (
                      <div className="flex items-center gap-3 text-xs text-neutral-600 pt-1">
                        <span className="bg-white border rounded px-2 py-0.5">
                          {pendingReqs} guruji{pendingReqs !== 1 ? 's' : ''} notified — awaiting reply
                        </span>
                        {declinedReqs > 0 && (
                          <span className="bg-red-50 border border-red-200 text-red-600 rounded px-2 py-0.5">
                            {declinedReqs} declined
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-sm font-semibold text-neutral-800">₹{Number(b.amount || 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-orange-600 flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      Raised {waitTime}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Queries Tab — admin views and replies to customer queries ──────────────
function QueriesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replies, setReplies] = useState<Record<number, string>>({});

  const { data: queries = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/queries'],
    queryFn: async () => {
      const r = await fetch('/api/admin/queries', { credentials: 'include' });
      return r.ok ? r.json() : [];
    },
    refetchInterval: 30000,
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, reply }: { id: number; reply: string }) => {
      const r = await apiRequest('POST', `/api/admin/queries/${id}/reply`, { reply });
      return r.json();
    },
    onSuccess: (_d, vars) => {
      toast({ title: 'Reply sent', description: 'Customer has been notified.' });
      setReplies(prev => { const n = { ...prev }; delete n[vars.id]; return n; });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/queries'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const open = queries.filter((q: any) => q.status === 'open');
  const answered = queries.filter((q: any) => q.status !== 'open');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-violet-500" />
          Customer Queries
        </CardTitle>
        <CardDescription>
          {open.length} open · {answered.length} answered
        </CardDescription>
      </CardHeader>
      <CardContent>
        {queries.length === 0 ? (
          <p className="text-center text-neutral-500 py-12">No customer queries yet</p>
        ) : (
          <div className="space-y-4">
            {queries.map((q: any) => (
              <div key={q.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <p className="font-medium">{q.customer_name || 'Customer'}</p>
                    <p className="text-xs text-neutral-500">
                      {q.customer_mobile} · Booking #{q.booking_id} · {q.puja_name || 'Puja'}
                    </p>
                  </div>
                  <Badge variant={q.status === 'open' ? 'default' : 'outline'}
                    className={q.status === 'open' ? 'bg-amber-500' : ''}>
                    {q.status}
                  </Badge>
                </div>
                <div className="bg-neutral-50 p-3 rounded text-sm">{q.message}</div>
                {q.admin_reply ? (
                  <div className="border-l-2 border-violet-400 pl-3">
                    <p className="text-xs font-medium text-violet-600 mb-1">Your reply:</p>
                    <p className="text-sm">{q.admin_reply}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {q.replied_at ? new Date(q.replied_at).toLocaleString('en-IN') : ''}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Textarea
                      value={replies[q.id] || ''}
                      onChange={e => setReplies(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Type your reply..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => replyMutation.mutate({ id: q.id, reply: replies[q.id] || '' })}
                      disabled={!replies[q.id]?.trim() || replyMutation.isPending}
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
