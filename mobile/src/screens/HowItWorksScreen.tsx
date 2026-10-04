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

interface Step {
  id: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

const steps: Step[] = [
  {
    id: 1,
    icon: 'search',
    title: 'Browse Pujas',
    description: 'Explore our extensive collection of traditional pujas and find the one that suits your spiritual needs.',
  },
  {
    id: 2,
    icon: 'person',
    title: 'Choose Your Guruji',
    description: 'Select from our network of verified and experienced pandits based on ratings, reviews, and expertise.',
  },
  {
    id: 3,
    icon: 'calendar',
    title: 'Book Your Slot',
    description: 'Pick a convenient date and time for your puja. Choose between online or at-home service.',
  },
  {
    id: 4,
    icon: 'card',
    title: 'Secure Payment',
    description: 'Complete your booking with our secure payment system. Multiple payment options available.',
  },
  {
    id: 5,
    icon: 'videocam',
    title: 'Attend Puja',
    description: 'Join the puja online via video call or welcome the pandit to your home at the scheduled time.',
  },
  {
    id: 6,
    icon: 'star',
    title: 'Rate & Review',
    description: 'Share your experience by rating the service and help others make informed decisions.',
  },
];

const faqs: FAQ[] = [
  {
    id: 1,
    question: 'How are pandits verified?',
    answer: 'All pandits undergo a thorough verification process including identity verification, background checks, and certification validation before joining our platform.',
  },
  {
    id: 2,
    question: 'Can I reschedule my booking?',
    answer: 'Yes, you can reschedule your booking up to 24 hours before the scheduled time without any additional charges.',
  },
  {
    id: 3,
    question: 'What if I need to cancel?',
    answer: 'Cancellations made 48 hours before the puja receive a full refund. Cancellations within 24-48 hours receive a 50% refund.',
  },
  {
    id: 4,
    question: 'How do online pujas work?',
    answer: 'For online pujas, you will receive a video call link. The pandit performs the puja while you participate from your home, guiding you through each step.',
  },
  {
    id: 5,
    question: 'What materials are needed?',
    answer: 'For online pujas, a basic puja kit list will be shared. For home visits, the pandit can arrange all materials for an additional fee.',
  },
];

const HowItWorksScreen: React.FC = () => {
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  const renderStep = (step: Step, index: number) => (
    <View key={step.id} style={styles.stepContainer}>
      <View style={styles.stepIndicator}>
        <LinearGradient
          colors={['#3B82F6', '#1D4ED8']}
          style={styles.stepCircle}
        >
          <Ionicons name={step.icon} size={24} color="#FFFFFF" />
        </LinearGradient>
        {index < steps.length - 1 && <View style={styles.stepLine} />}
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepNumber}>Step {step.id}</Text>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepDescription}>{step.description}</Text>
      </View>
    </View>
  );

  const renderFaq = (faq: FAQ) => {
    const isExpanded = expandedFaq === faq.id;
    return (
      <TouchableOpacity
        key={faq.id}
        style={styles.faqItem}
        onPress={() => setExpandedFaq(isExpanded ? null : faq.id)}
        activeOpacity={0.7}
      >
        <View style={styles.faqHeader}>
          <Text style={styles.faqQuestion}>{faq.question}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6B7280"
          />
        </View>
        {isExpanded && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.header}>
        <Text style={styles.headerTitle}>How It Works</Text>
        <Text style={styles.headerSubtitle}>
          Simple steps to book your spiritual services
        </Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Book in 6 Easy Steps</Text>
          <Text style={styles.introText}>
            Connect with verified spiritual guides on Sanatan Guruji
            for authentic puja services.
          </Text>
        </View>

        <View style={styles.stepsSection}>
          {steps.map((step, index) => renderStep(step, index))}
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Why Choose Us?</Text>
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.benefitTitle}>100% Verified</Text>
              <Text style={styles.benefitText}>All pandits are thoroughly verified</Text>
            </View>
            <View style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="cash" size={24} color="#10B981" />
              </View>
              <Text style={styles.benefitTitle}>Best Prices</Text>
              <Text style={styles.benefitText}>Competitive and transparent pricing</Text>
            </View>
            <View style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.benefitTitle}>Flexible Timing</Text>
              <Text style={styles.benefitText}>Book as per your convenience</Text>
            </View>
            <View style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="headset" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.benefitTitle}>24/7 Support</Text>
              <Text style={styles.benefitText}>Always here to help you</Text>
            </View>
          </View>
        </View>

        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map(renderFaq)}
        </View>

        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Start Booking Now</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
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
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  stepsSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  stepContainer: {
    flexDirection: 'row',
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 24,
  },
  stepNumber: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  benefitsSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  faqSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  faqItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    paddingRight: 8,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 12,
  },
  ctaSection: {
    padding: 20,
    paddingBottom: 32,
  },
  ctaButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HowItWorksScreen;
