import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { 
  Settings, 
  Bell, 
  Heart, 
  History, 
  CreditCard, 
  HelpCircle, 
  LogOut,
  Edit3,
  Camera,
  Star,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import MobileLayout from './MobileLayout';

// Mock user data
const userData = {
  name: 'Rajesh Kumar',
  email: 'rajesh.kumar@email.com',
  phone: '+91 98765 43210',
  location: 'Mumbai, Maharashtra',
  joinDate: 'January 2024',
  avatar: '/api/placeholder/100/100',
  stats: {
    totalBookings: 12,
    completedPujas: 8,
    favoriteGurujis: 5,
    totalSpent: '₹24,500'
  }
};

const menuItems = [
  {
    icon: History,
    label: 'Booking History',
    path: '/booking-history',
    color: 'text-blue-600'
  },
  {
    icon: Heart,
    label: 'Favorite Gurujis',
    path: '/favorites',
    color: 'text-red-600',
    badge: '5'
  },
  {
    icon: CreditCard,
    label: 'Payment Methods',
    path: '/payment-methods',
    color: 'text-green-600'
  },
  {
    icon: Bell,
    label: 'Notifications',
    path: '/notifications',
    color: 'text-orange-600',
    badge: '3'
  },
  {
    icon: Settings,
    label: 'Account Settings',
    path: '/settings',
    color: 'text-gray-600'
  },
  {
    icon: HelpCircle,
    label: 'Help & Support',
    path: '/help',
    color: 'text-purple-600'
  }
];

const MobileProfile: React.FC = () => {
  const [, setLocation] = useLocation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <MobileLayout 
      title="Profile" 
      showBackButton={false}
      className="bg-gray-50"
    >
      {/* Profile Header */}
      <div className="relative">
        {/* Cover Background */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600"></div>
        
        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="relative -mt-16 flex flex-col items-center">
            <motion.div
              className="relative"
              whileTap={{ scale: 0.95 }}
            >
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                <AvatarImage src={userData.avatar} />
                <AvatarFallback className="text-2xl">
                  {userData.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700"
              >
                <Camera size={14} />
              </Button>
            </motion.div>
            
            <div className="text-center mt-4">
              <h2 className="text-2xl font-bold text-gray-900">{userData.name}</h2>
              <div className="flex items-center justify-center mt-2 space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin size={14} className="mr-1" />
                  {userData.location}
                </div>
                <div className="flex items-center">
                  <Calendar size={14} className="mr-1" />
                  {userData.joinDate}
                </div>
              </div>
              <Badge className="mt-3 bg-green-100 text-green-800 hover:bg-green-100">
                <Shield size={12} className="mr-1" />
                Verified Member
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-2xl font-bold text-blue-600">{userData.stats.totalBookings}</div>
            <div className="text-sm text-gray-600">Total Bookings</div>
          </motion.div>
          
          <motion.div
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-2xl font-bold text-green-600">{userData.stats.completedPujas}</div>
            <div className="text-sm text-gray-600">Completed Pujas</div>
          </motion.div>
          
          <motion.div
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-2xl font-bold text-purple-600">{userData.stats.favoriteGurujis}</div>
            <div className="text-sm text-gray-600">Favorite Gurujis</div>
          </motion.div>
          
          <motion.div
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-2xl font-bold text-orange-600">{userData.stats.totalSpent}</div>
            <div className="text-sm text-gray-600">Total Spent</div>
          </motion.div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="px-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Mail size={18} className="text-blue-600 mr-3" />
              <div>
                <div className="font-medium">{userData.email}</div>
                <div className="text-sm text-gray-500">Email Address</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit3 size={16} />
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Phone size={18} className="text-green-600 mr-3" />
              <div>
                <div className="font-medium">{userData.phone}</div>
                <div className="text-sm text-gray-500">Phone Number</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit3 size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Settings */}
      <div className="px-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Quick Settings</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bell size={18} className="text-orange-600 mr-3" />
              <div>
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-gray-500">Receive booking updates</div>
              </div>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Account</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center">
                  <Icon size={20} className={`mr-3 ${item.color}`} />
                  <span className="font-medium text-gray-900">{item.label}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <div className="text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-4 mb-8">
        <motion.button
          onClick={() => {
            // Handle logout logic here
            console.log('Logout clicked');
          }}
          className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-4 px-4 rounded-xl transition-colors flex items-center justify-center"
          whileTap={{ scale: 0.98 }}
        >
          <LogOut size={20} className="mr-2" />
          Sign Out
        </motion.button>
      </div>
    </MobileLayout>
  );
};

export default MobileProfile;