import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Benefit {
  id: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const benefits: Benefit[] = [
  {
    id: 1,
    icon: 'globe',
    title: 'Reach More Devotees',
    description: 'Connect with thousands of devotees across India looking for spiritual guidance.',
  },
  {
    id: 2,
    icon: 'calendar',
    title: 'Flexible Schedule',
    description: 'Set your own availability and work on your own terms.',
  },
  {
    id: 3,
    icon: 'cash',
    title: 'Earn More',
    description: 'Increase your earnings with our competitive commission structure.',
  },
  {
    id: 4,
    icon: 'shield-checkmark',
    title: 'Verified Platform',
    description: 'Join a trusted platform with verified and genuine devotees.',
  },
  {
    id: 5,
    icon: 'videocam',
    title: 'Online & Offline',
    description: 'Offer both online and in-person puja services.',
  },
  {
    id: 6,
    icon: 'trending-up',
    title: 'Grow Your Practice',
    description: 'Build your reputation with ratings and reviews.',
  },
];

const BecomeGurujiScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    experience: '',
    specialization: '',
    location: '',
  });

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
  };

  const renderBenefit = (benefit: Benefit) => (
    <View key={benefit.id} style={styles.benefitCard}>
      <View style={styles.benefitIconContainer}>
        <Ionicons name={benefit.icon} size={24} color="#3B82F6" />
      </View>
      <View style={styles.benefitContent}>
        <Text style={styles.benefitTitle}>{benefit.title}</Text>
        <Text style={styles.benefitDescription}>{benefit.description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.header}>
            <View style={styles.headerBadge}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.headerBadgeText}>Join Our Community</Text>
            </View>
            <Text style={styles.headerTitle}>Become a Guruji</Text>
            <Text style={styles.headerSubtitle}>
              Share your spiritual knowledge and connect with devotees across India
            </Text>
          </LinearGradient>

          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>500+</Text>
              <Text style={styles.statLabel}>Active Pandits</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>10K+</Text>
              <Text style={styles.statLabel}>Pujas Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>50+</Text>
              <Text style={styles.statLabel}>Cities Covered</Text>
            </View>
          </View>

          <View style={styles.benefitsSection}>
            <Text style={styles.sectionTitle}>Why Join Sanatan Guruji?</Text>
            {benefits.map(renderBenefit)}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Register Now</Text>
            <Text style={styles.formSubtitle}>
              Fill in your details and our team will contact you within 24 hours.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Years of Experience *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10 years"
                placeholderTextColor="#9CA3AF"
                value={formData.experience}
                onChangeText={(text) => setFormData({ ...formData, experience: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Specialization *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Vedic Rituals, Astrology"
                placeholderTextColor="#9CA3AF"
                value={formData.specialization}
                onChangeText={(text) => setFormData({ ...formData, specialization: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>City/Location *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your city"
                placeholderTextColor="#9CA3AF"
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit Application</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              By submitting, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>

          <View style={styles.helpSection}>
            <Ionicons name="help-circle" size={24} color="#3B82F6" />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpText}>
                Contact Sanatan Guruji by calling +91 8087138429
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 24,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    gap: 6,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  benefitsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  benefitIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  helpContent: {
    flex: 1,
    marginLeft: 12,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  helpText: {
    fontSize: 12,
    color: '#3B82F6',
  },
});

export default BecomeGurujiScreen;
