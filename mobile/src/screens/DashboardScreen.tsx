import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface Booking {
  id: number;
  title: string;
  location: string;
  date: string;
  amount: number;
  guruji: string | null;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
}

const mockBookings: Booking[] = [
  {
    id: 1,
    title: 'Satyanarayan Puja',
    location: 'Mumbai, Maharashtra',
    date: 'Today at 5:00 PM',
    amount: 1500,
    guruji: 'Pandit Ramesh Ji',
    status: 'confirmed',
  },
  {
    id: 2,
    title: 'Ganesh Puja',
    location: 'Online Consultation',
    date: 'Tomorrow at 10:00 AM',
    amount: 1200,
    guruji: null,
    status: 'pending',
  },
  {
    id: 3,
    title: 'Griha Pravesh Puja',
    location: 'Pune, Maharashtra',
    date: '15 days ago',
    amount: 2500,
    guruji: 'Pandit Suresh Ji',
    status: 'completed',
  },
];

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);

  const user = {
    firstName: 'Customer',
    lastName: 'User',
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setBookings(mockBookings);
      setRefreshing(false);
    }, 1000);
  };

  const upcomingBookings = bookings.filter(
    (booking) => ['confirmed', 'pending'].includes(booking.status)
  );

  const pastBookings = bookings.filter(
    (booking) => ['completed', 'cancelled'].includes(booking.status)
  );

  const totalSpent = bookings.reduce((total, booking) => total + booking.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'completed':
        return '#6B7280';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const renderBookingCard = (booking: Booking) => (
    <TouchableOpacity key={booking.id} style={styles.bookingCard} activeOpacity={0.7}>
      <View style={styles.bookingHeader}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(booking.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>
        <Text style={styles.bookingDate}>{booking.date}</Text>
      </View>
      
      <Text style={styles.bookingTitle}>{booking.title}</Text>
      <Text style={styles.bookingLocation}>{booking.location}</Text>
      
      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>₹{booking.amount.toLocaleString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Guruji</Text>
          <Text style={styles.detailValue}>{booking.guruji || 'Pending Assignment'}</Text>
        </View>
      </View>
      
      <View style={styles.bookingActions}>
        {booking.status === 'confirmed' && (
          <>
            <TouchableOpacity style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View Details</Text>
            </TouchableOpacity>
          </>
        )}
        {booking.status === 'completed' && (
          <TouchableOpacity style={styles.rateButton}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.rateButtonText}>Rate Experience</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.header}>
          <Text style={styles.welcomeText}>Welcome, {user.firstName}!</Text>
          <Text style={styles.subText}>Manage your bookings and account settings here.</Text>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#EBF5FF' }]}>
              <Ionicons name="calendar" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{bookings.length}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="document-text" size={24} color="#2563EB" />
            </View>
            <Text style={styles.statValue}>{upcomingBookings.length}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="card" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>₹{totalSpent.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>

        <View style={styles.bookingsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Bookings</Text>
            <TouchableOpacity style={styles.bookPujaButton}>
              <Text style={styles.bookPujaText}>Book a Puja</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
              onPress={() => setActiveTab('upcoming')}
            >
              <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
                Upcoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'past' && styles.activeTab]}
              onPress={() => setActiveTab('past')}
            >
              <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
                Past
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'upcoming' ? (
            upcomingBookings.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No upcoming bookings</Text>
                <Text style={styles.emptySubtitle}>
                  You don't have any upcoming puja bookings.
                </Text>
                <TouchableOpacity style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>Book a Puja</Text>
                </TouchableOpacity>
              </View>
            ) : (
              upcomingBookings.map(renderBookingCard)
            )
          ) : pastBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={48} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No past bookings</Text>
              <Text style={styles.emptySubtitle}>Your completed bookings will appear here.</Text>
            </View>
          ) : (
            pastBookings.map(renderBookingCard)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 60,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -40,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  bookingsSection: {
    padding: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  bookPujaButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookPujaText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#1F2937',
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  bookingLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  bookingDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  viewButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  rateButtonText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default DashboardScreen;
