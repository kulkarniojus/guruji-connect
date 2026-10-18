import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const { width } = Dimensions.get('window');

interface Puja {
  id: string;
  name: string;
  price: string;
  duration: string;
  image: string;
  description: string;
}

interface Guruji {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  experience: string;
  image: string;
  isOnline: boolean;
  pricePerHour: string;
}

const featuredPujas: Puja[] = [
  {
    id: '1',
    name: 'Ganga Aarti',
    price: '₹500',
    duration: '45 min',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
    description: 'Sacred river worship ceremony'
  },
  {
    id: '2',
    name: 'Mahalakshmi Puja',
    price: '₹800',
    duration: '60 min',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop',
    description: 'Goddess of wealth and prosperity'
  },
  {
    id: '3',
    name: 'Ganesh Puja',
    price: '₹600',
    duration: '50 min',
    image: 'https://images.unsplash.com/photo-1587135941948-670b381f08ce?w=300&h=200&fit=crop',
    description: 'Lord Ganesha blessing ceremony'
  },
];

const topGurujis: Guruji[] = [
  {
    id: '1',
    name: 'Pandit Ramesh Sharma',
    specialization: 'Vedic Rituals',
    rating: 4.8,
    experience: '15+ years',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    isOnline: true,
    pricePerHour: '₹1,200'
  },
  {
    id: '2',
    name: 'Acharya Priya Devi',
    specialization: 'Spiritual Guidance',
    rating: 4.9,
    experience: '12+ years',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    isOnline: true,
    pricePerHour: '₹1,500'
  },
  {
    id: '3',
    name: 'Pandit Suresh Kumar',
    specialization: 'Astrology',
    rating: 4.7,
    experience: '20+ years',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
    isOnline: false,
    pricePerHour: '₹1,000'
  },
];

const HomeScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const renderPujaCard = ({ item }: { item: Puja }) => (
    <TouchableOpacity style={styles.pujaCard} activeOpacity={0.7}>
      <Image source={{ uri: item.image }} style={styles.pujaImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.pujaGradient}
      />
      <View style={styles.pujaContent}>
        <Text style={styles.pujaName}>{item.name}</Text>
        <Text style={styles.pujaDescription}>{item.description}</Text>
        <View style={styles.pujaDetails}>
          <Text style={styles.pujaPrice}>{item.price}</Text>
          <Text style={styles.pujaDuration}>{item.duration}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGurujiCard = ({ item }: { item: Guruji }) => (
    <TouchableOpacity
      style={styles.gurujiCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('GurujiDetail', { gurujiId: item.id })}
    >
      <View style={styles.gurujiImageContainer}>
        <Image source={{ uri: item.image }} style={styles.gurujiImage} />
        <View style={[styles.onlineIndicator, { backgroundColor: item.isOnline ? '#10B981' : '#EF4444' }]} />
      </View>
      <View style={styles.gurujiInfo}>
        <Text style={styles.gurujiName}>{item.name}</Text>
        <Text style={styles.gurujiSpecialization}>{item.specialization}</Text>
        <View style={styles.gurujiStats}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.rating}>{item.rating}</Text>
          </View>
          <Text style={styles.experience}>{item.experience}</Text>
        </View>
        <Text style={styles.pricePerHour}>{item.pricePerHour}/hour</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.greeting}>Namaste 🙏</Text>
                <Text style={styles.userName}>Welcome back, Rajesh</Text>
              </View>
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>3</Text>
                </View>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search pujas, gurujis..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#6B7280"
            />
            <TouchableOpacity style={styles.filterButton}>
              <Ionicons name="options-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('PujasList')}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.quickActionGradient}
              >
                <Ionicons name="calendar" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Book Puja</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.quickActionGradient}
              >
                <Ionicons name="videocam" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Video Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.quickActionGradient}
              >
                <Ionicons name="chatbubble" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.quickActionGradient}
              >
                <Ionicons name="star" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Journey</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Pujas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Pujas</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PujasList')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={featuredPujas}
            renderItem={renderPujaCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pujaList}
          />
        </View>

        {/* Top Gurujis */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Gurujis</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {topGurujis.map((guruji) => (
            <View key={guruji.id}>
              {renderGurujiCard({ item: guruji })}
            </View>
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    marginBottom: 20,
  },
  headerGradient: {
    padding: 20,
    paddingTop: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  filterButton: {
    padding: 4,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  pujaList: {
    paddingLeft: 20,
  },
  pujaCard: {
    width: width * 0.7,
    height: 200,
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pujaImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pujaGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  pujaContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  pujaName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pujaDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  pujaDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pujaPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pujaDuration: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  gurujiCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gurujiImageContainer: {
    position: 'relative',
  },
  gurujiImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  gurujiInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  gurujiName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  gurujiSpecialization: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  gurujiStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  rating: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
    marginLeft: 2,
  },
  experience: {
    fontSize: 14,
    color: '#6B7280',
  },
  pricePerHour: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
});

export default HomeScreen;