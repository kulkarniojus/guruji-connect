import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useLocation } from 'wouter';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Star, 
  Phone, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Search,
  Heart,
  Share
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import MobileLayout from './MobileLayout';

// Mock data for gurujis
const gurujis = [
  {
    id: 1,
    name: 'Pandit Rajesh Sharma',
    specialization: 'Vedic Rituals',
    rating: 4.9,
    reviews: 156,
    price: '₹1,500',
    location: 'Mumbai',
    availability: 'Available Today',
    image: '/api/placeholder/80/80',
    verified: true,
    pujas: ['Satyanarayan', 'Griha Pravesh', 'Navgraha Shanti']
  },
  {
    id: 2,
    name: 'Pandit Amit Kumar',
    specialization: 'Spiritual Guidance',
    rating: 4.8,
    reviews: 203,
    price: '₹2,000',
    location: 'Delhi',
    availability: 'Available Tomorrow',
    image: '/api/placeholder/80/80',
    verified: true,
    pujas: ['Ganesh Puja', 'Rudrabhishek', 'Havan']
  },
  {
    id: 3,
    name: 'Pandit Suresh Joshi',
    specialization: 'Temple Ceremonies',
    rating: 4.7,
    reviews: 98,
    price: '₹1,800',
    location: 'Pune',
    availability: 'Available in 2 days',
    image: '/api/placeholder/80/80',
    verified: true,
    pujas: ['Lakshmi Puja', 'Saraswati Puja', 'Durga Puja']
  }
];

const MobileBooking: React.FC = () => {
  const [, setLocation] = useLocation();
  const [currentGurujiIndex, setCurrentGurujiIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');

  // Filter gurujis based on search query and selected filters
  const filteredGurujis = gurujis.filter(guruji => {
    // Search query filter
    const matchesSearch = searchQuery === '' || 
      guruji.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guruji.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guruji.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guruji.pujas.some(puja => puja.toLowerCase().includes(searchQuery.toLowerCase()));

    // Filter chip filter
    let matchesFilter = true;
    switch (selectedFilter) {
      case 'Available Today':
        matchesFilter = guruji.availability === 'Available Today';
        break;
      case 'Top Rated':
        matchesFilter = guruji.rating >= 4.8;
        break;
      case 'Nearby':
        matchesFilter = guruji.location.includes('Mumbai') || guruji.location.includes('Pune');
        break;
      case 'Budget Friendly':
        matchesFilter = parseInt(guruji.price.replace('₹', '').replace(',', '')) <= 1500;
        break;
      default:
        matchesFilter = true;
    }

    return matchesSearch && matchesFilter;
  });

  const handleSwipe = (event: any, info: PanInfo) => {
    const threshold = 50;
    
    if (info.offset.x > threshold && currentGurujiIndex > 0) {
      // Swipe right - previous
      setCurrentGurujiIndex(prev => prev - 1);
    } else if (info.offset.x < -threshold && currentGurujiIndex < filteredGurujis.length - 1) {
      // Swipe left - next
      setCurrentGurujiIndex(prev => prev + 1);
    }
  };

  // Reset current index if filters change and current index is out of bounds
  React.useEffect(() => {
    if (currentGurujiIndex >= filteredGurujis.length && filteredGurujis.length > 0) {
      setCurrentGurujiIndex(0);
    }
  }, [filteredGurujis.length, currentGurujiIndex]);

  const currentGuruji = filteredGurujis[currentGurujiIndex];

  return (
    <MobileLayout 
      title="Find Guruji" 
      showBackButton={true}
      className="pb-4"
    >
      {/* Search and Filters */}
      <div className="px-4 py-4 bg-white border-b">
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search by puja or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-blue-50 border-blue-200' : ''}
          >
            <Filter size={18} />
          </Button>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {['All', 'Available Today', 'Top Rated', 'Nearby', 'Budget Friendly'].map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setSelectedFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Swipeable Guruji Cards */}
      <div className="px-4 py-6">
        {filteredGurujis.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No gurujis found matching your search criteria.</p>
            <Button onClick={() => {
              setSearchQuery('');
              setSelectedFilter('All');
            }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
              key={currentGurujiIndex}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleSwipe}
              dragElastic={0.1}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
            >
              {/* Guruji Image and Basic Info */}
              <div className="relative">
                <div className="h-48 bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={currentGuruji.image} />
                    <AvatarFallback className="text-2xl">
                      {currentGuruji.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex space-x-2">
                  <motion.button
                    className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm"
                    whileTap={{ scale: 0.9 }}
                  >
                    <Heart size={18} className="text-gray-600" />
                  </motion.button>
                  <motion.button
                    className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm"
                    whileTap={{ scale: 0.9 }}
                  >
                    <Share size={18} className="text-gray-600" />
                  </motion.button>
                </div>

                {/* Availability Badge */}
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-green-500 hover:bg-green-500">
                    {currentGuruji.availability}
                  </Badge>
                </div>
              </div>

              {/* Guruji Details */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h3 className="text-xl font-bold text-gray-900">{currentGuruji.name}</h3>
                      {currentGuruji.verified && (
                        <Badge variant="secondary" className="ml-2 text-xs">Verified</Badge>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{currentGuruji.specialization}</p>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Star className="text-yellow-400 mr-1" size={16} />
                        <span className="font-medium">{currentGuruji.rating}</span>
                        <span className="text-gray-500 ml-1">({currentGuruji.reviews})</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <MapPin size={14} className="mr-1" />
                        <span className="text-sm">{currentGuruji.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{currentGuruji.price}</p>
                    <p className="text-sm text-gray-500">Starting from</p>
                  </div>
                </div>

                {/* Specialization Tags */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Specializes in:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentGuruji.pujas.map((puja) => (
                      <Badge key={puja} variant="outline" className="text-xs">
                        {puja}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setLocation(`/chat`)}
                  >
                    <MessageCircle size={16} className="mr-2" />
                    Message
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setLocation(`/video-call/${currentGuruji.id}`)}
                  >
                    <Phone size={16} className="mr-2" />
                    Call
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => setLocation(`/puja/${currentGuruji.id}`)}
                  >
                    Book Now
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

            {/* Navigation Indicators */}
            <div className="flex justify-center mt-6 space-x-2">
              {filteredGurujis.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => setCurrentGurujiIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentGurujiIndex ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                  whileTap={{ scale: 0.8 }}
                />
              ))}
          </div>

          {/* Swipe Hint */}
          <div className="flex justify-center items-center mt-4 space-x-4 text-gray-400">
            <ChevronLeft size={20} />
            <span className="text-sm">Swipe to browse</span>
            <ChevronRight size={20} />
            </div>
          </div>
        )}
      </div>

      {/* Quick Book Section */}
      <div className="px-4 py-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Quick Book Popular Services</h3>
        <div className="grid grid-cols-2 gap-3">
          {['Satyanarayan Puja', 'Griha Pravesh', 'Ganesh Puja', 'Navgraha Shanti'].map((service) => (
            <motion.button
              key={service}
              onClick={() => setLocation('/booking')}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-left"
              whileTap={{ scale: 0.95 }}
            >
              <h4 className="font-medium text-gray-900 mb-1">{service}</h4>
              <p className="text-sm text-gray-600">Book instantly</p>
            </motion.button>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileBooking;