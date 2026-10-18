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
import { Progress } from '@/components/ui/progress';
import { 
  Video,
  VideoOff,
  Clock,
  CheckCircle,
  XCircle,
  CalendarClock,
  Timer
} from 'lucide-react';

interface VideoData {
  totalSessions: number;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
  averageDuration: number;
  trends: Array<{
    day: string;
    count: number;
  }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'];

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  missed: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  scheduled: <CalendarClock className="h-4 w-4 text-blue-600" />,
  in_progress: <Video className="h-4 w-4 text-indigo-600" />,
  completed: <CheckCircle className="h-4 w-4 text-green-600" />,
  cancelled: <XCircle className="h-4 w-4 text-red-600" />,
  missed: <VideoOff className="h-4 w-4 text-yellow-600" />,
};

const formatDay = (dateString: string) => {
  // Format "2025-04-01 00:00:00" to "Apr 1"
  const date = new Date(dateString);
  return date.toLocaleString('default', { month: 'short', day: 'numeric' });
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const formatStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
};

const VideoAnalytics: React.FC<{ data: VideoData }> = ({ data }) => {
  // Format data for charts
  const formattedTrendData = data.trends.map(item => ({
    ...item,
    day: formatDay(item.day)
  }));

  // Format status data with nice labels
  const formattedStatusData = data.byStatus.map(item => ({
    ...item,
    status: formatStatusLabel(item.status),
    value: item.count,
    color: COLORS[data.byStatus.indexOf(item) % COLORS.length]
  }));
  
  // Calculate total sessions
  const completionRate = data.byStatus.find(s => s.status === 'completed')?.count 
    ? ((data.byStatus.find(s => s.status === 'completed')?.count || 0) / data.totalSessions * 100).toFixed(1)
    : '0';

  const cancellationRate = data.byStatus.find(s => s.status === 'cancelled')?.count 
    ? ((data.byStatus.find(s => s.status === 'cancelled')?.count || 0) / data.totalSessions * 100).toFixed(1)
    : '0';

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Video Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All video conferences
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(data.averageDuration)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average session length
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
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress 
              value={Number(completionRate)} 
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancellation Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cancellationRate}%</div>
            <Progress 
              value={Number(cancellationRate)} 
              className="h-2 mt-2 bg-gray-200"
              indicatorClassName="bg-red-500"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Video Session Trends</CardTitle>
            <CardDescription>Daily video conference activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={formattedTrendData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} sessions`, 'Count']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="Video Sessions" 
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
            <CardTitle>Session Status</CardTitle>
            <CardDescription>Distribution by session status</CardDescription>
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
                    dataKey="value"
                    nameKey="status"
                    label={({ status, value }) => `${status}: ${value}`}
                  >
                    {formattedStatusData.map(entry => (
                      <Cell key={`cell-${entry.status}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} sessions`, 'Count']} />
                  <Legend formatter={(value) => (
                    <span className="flex items-center">
                      {STATUS_ICONS[value.toLowerCase()] || null}
                      <span className="ml-1">{value}</span>
                    </span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Status Breakdown</CardTitle>
          <CardDescription>Detailed view of all video session statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            {formattedStatusData.map((status) => (
              <div 
                key={status.status} 
                className={`border rounded-lg p-4 flex flex-col items-center justify-center ${
                  STATUS_COLORS[status.status.toLowerCase()] || 'bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  {STATUS_ICONS[status.status.toLowerCase()] || null}
                </div>
                <p className="text-sm font-medium">{status.status}</p>
                <p className="text-2xl font-bold mt-1">{status.count}</p>
                <p className="text-xs mt-1">
                  {((status.count / data.totalSessions) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Video Conferencing Insights</CardTitle>
          <CardDescription>Key performance metrics and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center">
                <Timer className="h-5 w-5 text-primary mr-3" />
                <div>
                  <h3 className="font-medium">Total Video Time</h3>
                  <p className="text-xl font-bold">
                    {formatDuration(data.averageDuration * (data.byStatus.find(s => s.status === 'completed')?.count || 0))}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-primary mr-3" />
                <div>
                  <h3 className="font-medium">Average Session Duration</h3>
                  <p className="text-xl font-bold">{formatDuration(data.averageDuration)}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <h3 className="font-medium">Completed Sessions</h3>
                  <p className="text-xl font-bold">
                    {data.byStatus.find(s => s.status === 'completed')?.count || 0} ({completionRate}%)
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-3" />
                <div>
                  <h3 className="font-medium">Failed Sessions</h3>
                  <p className="text-xl font-bold">
                    {(data.byStatus.find(s => s.status === 'cancelled')?.count || 0) + 
                     (data.byStatus.find(s => s.status === 'missed')?.count || 0)} 
                    ({((
                      (data.byStatus.find(s => s.status === 'cancelled')?.count || 0) + 
                      (data.byStatus.find(s => s.status === 'missed')?.count || 0)
                    ) / data.totalSessions * 100).toFixed(1)}%)
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <CalendarClock className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <h3 className="font-medium">Upcoming Sessions</h3>
                  <p className="text-xl font-bold">
                    {data.byStatus.find(s => s.status === 'scheduled')?.count || 0}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Video className="h-5 w-5 text-indigo-500 mr-3" />
                <div>
                  <h3 className="font-medium">Active Sessions</h3>
                  <p className="text-xl font-bold">
                    {data.byStatus.find(s => s.status === 'in_progress')?.count || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-medium mb-3">Performance Summary</h3>
            <p className="text-sm text-muted-foreground">
              The video conferencing system has facilitated a total of <span className="font-medium">{data.totalSessions}</span> sessions,
              with a completion rate of <span className="font-medium">{completionRate}%</span>. The average session duration is 
              <span className="font-medium"> {formatDuration(data.averageDuration)}</span>, indicating 
              {data.averageDuration > 30 ? ' good engagement' : ' potential issues with session quality'}.
              
              {data.trends.length > 1 && (
                data.trends[data.trends.length - 1].count > data.trends[data.trends.length - 2].count
                  ? ' Usage is trending upward, showing increased adoption of the video platform.'
                  : ' Usage has remained stable or decreased slightly in recent days.'
              )}
              
              {Number(cancellationRate) > 20 
                ? ' The relatively high cancellation rate suggests there may be issues with scheduling or user experience that should be addressed.'
                : ' The low cancellation rate indicates good user satisfaction with the video platform.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoAnalytics;