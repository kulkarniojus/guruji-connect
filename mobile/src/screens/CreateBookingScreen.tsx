import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface BookingStep {
  id: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const bookingSteps: BookingStep[] = [
  { id: 1, label: 'Service', icon: 'leaf' },
  { id: 2, label: 'Schedule', icon: 'calendar' },
  { id: 3, label: 'Guruji', icon: 'person' },
  { id: 4, label: 'Details', icon: 'document-text' },
  { id: 5, label: 'Payment', icon: 'card' },
];

const mockPujas = [
  { id: 1, name: 'Satyanarayan Puja', price: 2100, duration: '2 hours' },
  { id: 2, name: 'Ganesh Puja', price: 1500, duration: '1.5 hours' },
  { id: 3, name: 'Mahalakshmi Puja', price: 2500, duration: '2 hours' },
  { id: 4, name: 'Griha Pravesh', price: 5000, duration: '3 hours' },
];

const mockGurujis = [
  { id: 1, name: 'Pandit Ramesh Sharma', rating: 4.9, experience: '15 years' },
  { id: 2, name: 'Acharya Priya Devi', rating: 4.8, experience: '12 years' },
  { id: 3, name: 'Pandit Suresh Kumar', rating: 4.7, experience: '20 years' },
];

const timeSlots = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '5:00 PM', '6:00 PM', '7:00 PM'];

interface AnimatedProgressIndicatorProps {
  steps: BookingStep[];
  currentStep: number;
}

const AnimatedProgressIndicator: React.FC<AnimatedProgressIndicatorProps> = ({ steps, currentStep }) => {
  const scaleAnims = useRef(steps.map(() => new Animated.Value(1))).current;
  const progressAnims = useRef(steps.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    steps.forEach((step, index) => {
      const isActive = step.id === currentStep;
      const isCompleted = step.id < currentStep;

      Animated.spring(scaleAnims[index], {
        toValue: isActive ? 1.15 : 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();

      Animated.timing(progressAnims[index], {
        toValue: isCompleted ? 1 : 0,
        duration: 400,
        useNativeDriver: false,
      }).start();
    });
  }, [currentStep]);

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressRow}>
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isLast = index === steps.length - 1;

          return (
            <View key={step.id} style={styles.progressItem}>
              <View style={styles.stepAndLineWrapper}>
                <Animated.View
                  style={[
                    styles.stepCircle,
                    {
                      transform: [{ scale: scaleAnims[index] }],
                      backgroundColor: isCompleted ? '#22C55E' : isActive ? '#3B82F6' : '#E5E7EB',
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  ) : (
                    <Ionicons 
                      name={step.icon} 
                      size={16} 
                      color={isActive ? '#FFFFFF' : '#6B7280'} 
                    />
                  )}
                </Animated.View>
                {!isLast && (
                  <View style={styles.lineWrapper}>
                    <View style={styles.progressLineBackground} />
                    <Animated.View
                      style={[
                        styles.progressLineFill,
                        {
                          width: progressAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: isActive ? '#3B82F6' : isCompleted ? '#22C55E' : '#6B7280',
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const CreateBookingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPuja, setSelectedPuja] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedGuruji, setSelectedGuruji] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      navigation.goBack();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedPuja !== null;
      case 2:
        return selectedDate !== null && selectedTime !== null;
      case 3:
        return selectedGuruji !== null;
      case 4:
        return name.trim() !== '' && phone.trim() !== '' && address.trim() !== '';
      case 5:
        return true;
      default:
        return false;
    }
  };

  const dates = [
    { label: 'Today', value: new Date().toISOString().split('T')[0] },
    { label: 'Tomorrow', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
    { label: new Date(Date.now() + 86400000 * 2).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }), value: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] },
    { label: new Date(Date.now() + 86400000 * 3).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }), value: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] },
    { label: new Date(Date.now() + 86400000 * 4).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }), value: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0] },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Select a Puja</Text>
            <Text style={styles.sectionSubtitle}>Choose the puja you want to book</Text>
            {mockPujas.map((puja) => (
              <TouchableOpacity
                key={puja.id}
                style={[
                  styles.selectionCard,
                  selectedPuja === puja.id && styles.selectionCardActive,
                ]}
                onPress={() => setSelectedPuja(puja.id)}
                activeOpacity={0.7}
              >
                <View style={styles.selectionCardContent}>
                  <Text style={[styles.selectionCardTitle, selectedPuja === puja.id && styles.selectionCardTitleActive]}>
                    {puja.name}
                  </Text>
                  <Text style={styles.selectionCardSubtitle}>
                    {puja.duration} • ₹{puja.price}
                  </Text>
                </View>
                {selectedPuja === puja.id && (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {dates.map((date) => (
                <TouchableOpacity
                  key={date.value}
                  style={[
                    styles.dateCard,
                    selectedDate === date.value && styles.dateCardActive,
                  ]}
                  onPress={() => setSelectedDate(date.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateLabel, selectedDate === date.value && styles.dateLabelActive]}>
                    {date.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Select Time</Text>
            <View style={styles.timeGrid}>
              {timeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeCard,
                    selectedTime === time && styles.timeCardActive,
                  ]}
                  onPress={() => setSelectedTime(time)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timeLabel, selectedTime === time && styles.timeLabelActive]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Choose Your Guruji</Text>
            <Text style={styles.sectionSubtitle}>Select from our verified pandits</Text>
            {mockGurujis.map((guruji) => (
              <TouchableOpacity
                key={guruji.id}
                style={[
                  styles.gurujiCard,
                  selectedGuruji === guruji.id && styles.gurujiCardActive,
                ]}
                onPress={() => setSelectedGuruji(guruji.id)}
                activeOpacity={0.7}
              >
                <View style={styles.gurujiAvatar}>
                  <Ionicons name="person" size={28} color="#3B82F6" />
                </View>
                <View style={styles.gurujiInfo}>
                  <Text style={styles.gurujiName}>{guruji.name}</Text>
                  <View style={styles.gurujiMeta}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.gurujiRating}>{guruji.rating}</Text>
                    <Text style={styles.gurujiExperience}> • {guruji.experience}</Text>
                  </View>
                </View>
                {selectedGuruji === guruji.id && (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Your Details</Text>
            <Text style={styles.sectionSubtitle}>Please provide your contact information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your address"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        );

      case 5:
        const selectedPujaData = mockPujas.find(p => p.id === selectedPuja);
        const selectedGurujiData = mockGurujis.find(g => g.id === selectedGuruji);
        return (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Booking Summary</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Puja</Text>
                <Text style={styles.summaryValue}>{selectedPujaData?.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date & Time</Text>
                <Text style={styles.summaryValue}>{selectedDate} at {selectedTime}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Guruji</Text>
                <Text style={styles.summaryValue}>{selectedGurujiData?.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Name</Text>
                <Text style={styles.summaryValue}>{name}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{selectedPujaData?.price}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.payButton} activeOpacity={0.8}>
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.payButtonGradient}
              >
                <Ionicons name="card" size={20} color="#FFFFFF" />
                <Text style={styles.payButtonText}>Proceed to Payment</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Puja</Text>
        <View style={styles.backButton} />
      </View>

      <AnimatedProgressIndicator steps={bookingSteps} currentStep={currentStep} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep < 5 && (
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!canProceed()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={canProceed() ? ['#3B82F6', '#1D4ED8'] : ['#D1D5DB', '#9CA3AF']}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === 4 ? 'Review Booking' : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  progressContainer: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepAndLineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  stepLabel: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  lineWrapper: {
    flex: 1,
    height: 2,
    marginLeft: -2,
    position: 'relative',
  },
  progressLineBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#E5E7EB',
    borderRadius: 1,
  },
  progressLineFill: {
    position: 'absolute',
    left: 0,
    height: 2,
    backgroundColor: '#22C55E',
    borderRadius: 1,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectionCardActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  selectionCardContent: {
    flex: 1,
  },
  selectionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  selectionCardTitleActive: {
    color: '#3B82F6',
  },
  selectionCardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateScroll: {
    marginTop: 12,
  },
  dateCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  dateCardActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  dateLabelActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 10,
  },
  timeCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  timeCardActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  timeLabelActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  gurujiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  gurujiCardActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  gurujiAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
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
  gurujiMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gurujiRating: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4,
  },
  gurujiExperience: {
    fontSize: 13,
    color: '#6B7280',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22C55E',
  },
  payButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CreateBookingScreen;
