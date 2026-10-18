import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Booking {
  id: string;
  pujaName: string;
  gurujiName: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  amount: string;
  gurujiImage: string;
  type: 'online' | 'home';
}

const mockBookings: Booking[] = [
  {
    id: '1',
    pujaName: 'Ganga Aarti',
    gurujiName: 'Pandit Ramesh Sharma',
    date: '2025-01-15',
    time: '6:00 PM',
    status: 'upcoming',
    amount: '₹500',
    gurujiImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    type: 'online'
  },
  {
    id: '2',
    pujaName: 'Mahalakshmi Puja',
    gurujiName: 'Acharya Priya Devi',
    date: '2025-01-10',
    time: '7:30 AM',
    status: 'completed',
    amount: '₹800',
    gurujiImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    type: 'home'
  },
  {
    id: '3',
    pujaName: 'Ganesh Puja',
    gurujiName: 'Pandit Suresh Kumar',
    date: '2025-01-08',
    time: '5:00 PM',
    status: 'cancelled',
    amount: '₹600',
    gurujiImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
    type: 'online'
  },
];

const BookingScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return '#3B82F6';
      case 'completed':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'time-outline';
      case 'completed':
        return 'checkmark-circle-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const filteredBookings = mockBookings.filter(booking => {
    if (activeTab === 'all') return true;
    if (activeTab === 'upcoming') return booking.status === 'upcoming';
    if (activeTab === 'completed') return booking.status === 'completed';
    return true;
  });

  const renderBookingCard = ({ item }: { item: Booking }) => (
    <TouchableOpacity style={styles.bookingCard} activeOpacity={0.7}>
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Text style={styles.pujaName}>{item.pujaName}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        <View style={styles.typeContainer}>
          <Ionicons 
            name={item.type === 'online' ? 'videocam' : 'home'} 
            size={16} 
            color="#6B7280" 
          />
          <Text style={styles.typeText}>{item.type}</Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.gurujiSection}>
          <Image source={{ uri: item.gurujiImage }} style={styles.gurujiImage} />
          <View style={styles.gurujiInfo}>
            <Text style={styles.gurujiName}>{item.gurujiName}</Text>
            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTime}>
                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                <Text style={styles.dateTimeText}>{item.date}</Text>
              </View>
              <View style={styles.dateTime}>
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <Text style={styles.dateTimeText}>{item.time}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.amountSection}>
          <Text style={styles.amount}>{item.amount}</Text>
        </View>
      </View>

      <View style={styles.bookingActions}>
        {item.status === 'upcoming' && (
          <>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Reschedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.primaryAction]}>
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.primaryActionText}>Join Call</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'completed' && (
          <TouchableOpacity style={[styles.actionButton, styles.reviewAction]}>
            <Text style={styles.reviewActionText}>Write Review</Text>
          </TouchableOpacity>
        )}
        {item.status === 'cancelled' && (
          <TouchableOpacity style={[styles.actionButton, styles.rebookAction]}>
            <Text style={styles.rebookActionText}>Book Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'upcoming', 'completed'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        renderItem={renderBookingCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bookingsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No bookings found</Text>
            <Text style={styles.emptyStateText}>
              Book your first puja to get started on your spiritual journey
            </Text>
            <TouchableOpacity style={styles.bookNowButton}>
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={styles.bookNowGradient}
              >
                <Text style={styles.bookNowText}>Book a Puja</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  bookingsList: {
    padding: 20,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bookingInfo: {
    flex: 1,
  },
  pujaName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  bookingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gurujiSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gurujiImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  gurujiInfo: {
    flex: 1,
  },
  gurujiName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  amountSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  primaryAction: {
    borderWidth: 0,
  },
  actionButtonGradient: {
    flex: 1,
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewAction: {
    borderColor: '#F59E0B',
  },
  reviewActionText: {
    color: '#F59E0B',
  },
  rebookAction: {
    borderColor: '#10B981',
  },
  rebookActionText: {
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  bookNowButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookNowGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  bookNowText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BookingScreen;