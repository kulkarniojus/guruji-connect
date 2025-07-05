import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { 
  Calendar, 
  MapPin, 
  Star, 
  Clock, 
  User, 
  ChevronRight,
  TrendingUp,
  Heart,
  Bookmark,
  Phone,
  Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MobileLayout from './MobileLayout';

// Mock data for demonstration
const recentBookings = [
  {
    id: 1,
    pujaName: 'Satyanarayan Puja',
    gurujiName: 'Pandit Rajesh Sharma',
    date: '2024-01-15',
    time: '10:00 AM',
    status: 'confirmed',
    image: '/api/placeholder/40/40'
  },
  {
    id: 2,
    pujaName: 'Griha Pravesh',
    gurujiName: 'Pandit Amit Kumar',
    date: '2024-01-20',
    time: '11:30 AM',
    status: 'pending',
    image: '/api/placeholder/40/40'
  }
];

const popularPujas = [
  { id: 1, name: 'Ganesh Puja', price: '₹1,500', rating: 4.8, bookings: 120 },
  { id: 2, name: 'Navgraha Shanti', price: '₹2,500', rating: 4.9, bookings: 85 },
  { id: 3, name: 'Rudrabhishek', price: '₹3,500', rating: 4.7, bookings: 95 }
];

const quickActions = [
  { 
    icon: Calendar, 
    label: 'Book Puja', 
    path: '/booking', 
    color: 'bg-blue-500',
    description: 'Find & book services'
  },
  { 
    icon: User, 
    label: 'Find Guruji', 
    path: '/pujas', 
    color: 'bg-green-500',
    description: 'Browse verified priests'
  },
  { 
    icon: Video, 
    label: 'Video Call', 
    path: '/video-call/demo', 
    color: 'bg-purple-500',
    description: 'Online consultation'
  },
  { 
    icon: TrendingUp, 
    label: 'Journey', 
    path: '/spiritual-journey', 
    color: 'bg-orange-500',
    description: 'Track progress'
  }
];

const MobileDashboard: React.FC = () => {
  const [, setLocation] = useLocation();

  return (
    <MobileLayout 
      title="GurujiConnect" 
      showBackButton={false}
      className="p-4 space-y-6"
    >
      {/* Welcome Section */}
      <motion.div
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Welcome back!</h2>
            <p className="text-blue-100">Continue your spiritual journey</p>
          </div>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Heart className="text-pink-300" size={32} />
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.path}
                onClick={() => setLocation(action.path)}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-left"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -2 }}
              >
                <div className={`${action.color} w-12 h-12 rounded-xl flex items-center justify-center mb-3`}>
                  <Icon size={24} className="text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">{action.label}</h4>
                <p className="text-sm text-gray-600 mt-1">{action.description}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Bookings</h3>
          <Button variant="ghost" size="sm" onClick={() => setLocation('/booking')}>
            View All
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
        
        <div className="space-y-3">
          {recentBookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={booking.image} />
                  <AvatarFallback>{booking.gurujiName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">{booking.pujaName}</h4>
                  <p className="text-sm text-gray-600 truncate">{booking.gurujiName}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar size={12} className="mr-1" />
                      {booking.date}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock size={12} className="mr-1" />
                      {booking.time}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <Badge 
                    variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {booking.status}
                  </Badge>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Phone size={14} />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Video size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Popular Pujas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Popular Pujas</h3>
          <Button variant="ghost" size="sm" onClick={() => setLocation('/pujas')}>
            Browse All
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
        
        <div className="space-y-3">
          {popularPujas.map((puja, index) => (
            <motion.div
              key={puja.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation(`/puja/${puja.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{puja.name}</h4>
                  <div className="flex items-center mt-2 space-x-4">
                    <div className="flex items-center">
                      <Star size={14} className="text-yellow-400 mr-1" />
                      <span className="text-sm font-medium">{puja.rating}</span>
                    </div>
                    <span className="text-sm text-gray-600">{puja.bookings} bookings</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{puja.price}</p>
                  <Button size="sm" className="mt-2">
                    Book Now
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <TrendingUp className="text-green-500 mx-auto mb-2" size={24} />
          <p className="text-2xl font-bold text-gray-900">12</p>
          <p className="text-sm text-gray-600">Completed Pujas</p>
        </motion.div>
        
        <motion.div
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Bookmark className="text-blue-500 mx-auto mb-2" size={24} />
          <p className="text-2xl font-bold text-gray-900">5</p>
          <p className="text-sm text-gray-600">Saved Gurujis</p>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default MobileDashboard;