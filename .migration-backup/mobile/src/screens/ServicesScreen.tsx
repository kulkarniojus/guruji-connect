import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Service {
  id: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  features: string[];
  color: string;
  bgColor: string;
}

const services: Service[] = [
  {
    id: 1,
    icon: 'calendar',
    title: 'Puja Booking',
    description: 'Book traditional pujas performed by verified pandits at your home or online.',
    features: ['100+ Puja Types', 'Verified Pandits', 'Flexible Scheduling', 'Online & Offline Options'],
    color: '#3B82F6',
    bgColor: '#DBEAFE',
  },
  {
    id: 2,
    icon: 'videocam',
    title: 'Online Consultations',
    description: 'Connect with spiritual guides through video calls for personalized guidance.',
    features: ['HD Video Calls', 'Chat Support', 'Screen Sharing', 'Recording Available'],
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
  },
  {
    id: 3,
    icon: 'star',
    title: 'Spiritual Journey',
    description: 'Track your spiritual progress with personalized milestones and achievements.',
    features: ['Progress Tracking', 'Daily Mantras', 'Achievement Badges', 'Community Support'],
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  {
    id: 4,
    icon: 'people',
    title: 'Guruji Network',
    description: 'Access to a network of verified spiritual guides from across India.',
    features: ['Verified Profiles', 'Ratings & Reviews', 'Direct Booking', 'Background Checked'],
    color: '#10B981',
    bgColor: '#D1FAE5',
  },
  {
    id: 5,
    icon: 'notifications',
    title: 'Smart Reminders',
    description: 'Never miss important spiritual occasions with our intelligent reminder system.',
    features: ['Festival Alerts', 'Puja Reminders', 'Muhurat Notifications', 'Custom Alerts'],
    color: '#EF4444',
    bgColor: '#FEE2E2',
  },
  {
    id: 6,
    icon: 'shield-checkmark',
    title: 'Secure Payments',
    description: 'Safe and secure payment processing with multiple payment options.',
    features: ['UPI Support', 'Card Payments', 'EMI Options', '100% Secure'],
    color: '#06B6D4',
    bgColor: '#CFFAFE',
  },
];

const ServicesScreen: React.FC = () => {
  const renderServiceCard = (service: Service) => (
    <TouchableOpacity key={service.id} style={styles.serviceCard} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: service.bgColor }]}>
        <Ionicons name={service.icon} size={28} color={service.color} />
      </View>
      <View style={styles.serviceContent}>
        <Text style={styles.serviceTitle}>{service.title}</Text>
        <Text style={styles.serviceDescription}>{service.description}</Text>
        <View style={styles.featuresList}>
          {service.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={service.color} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.header}>
        <Text style={styles.headerTitle}>Our Services</Text>
        <Text style={styles.headerSubtitle}>
          Comprehensive spiritual services to support your journey
        </Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Why Choose Sanatan Guruji?</Text>
          <Text style={styles.introText}>
            We provide a complete platform connecting devotees with verified spiritual guides, 
            offering authentic puja services both online and at your doorstep.
          </Text>
        </View>

        <View style={styles.servicesList}>
          {services.map(renderServiceCard)}
        </View>

        <View style={styles.ctaSection}>
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.ctaCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="sparkles" size={32} color="#FFFFFF" />
            <Text style={styles.ctaTitle}>Start Your Spiritual Journey</Text>
            <Text style={styles.ctaSubtitle}>
              Book your first puja today and experience the divine connection
            </Text>
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Book Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#3B82F6" />
            </TouchableOpacity>
          </LinearGradient>
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
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scrollView: {
    flex: 1,
  },
  introSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  servicesList: {
    padding: 16,
    gap: 16,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 11,
    color: '#6B7280',
  },
  ctaSection: {
    padding: 16,
    paddingBottom: 32,
  },
  ctaCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
});

export default ServicesScreen;
