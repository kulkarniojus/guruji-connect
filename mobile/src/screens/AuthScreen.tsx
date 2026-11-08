import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;

const AuthScreen: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<AuthScreenNavigationProp>();

  const sendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowOtpInput(true);
      Alert.alert('OTP Sent', 'Verification code sent to your phone');
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Error', 'Please enter the complete OTP');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      navigation.navigate('Main');
    } catch (error) {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.header}
          >
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name="leaf" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.appName}>Vaidik Dhara</Text>
              <Text style={styles.appSubtitle}>Connect with Spiritual Wisdom</Text>
            </View>
          </LinearGradient>

          {/* Form Container */}
          <View style={styles.formContainer}>
            <View style={styles.form}>
              <Text style={styles.title}>
                {showOtpInput ? 'Verify OTP' : 'Welcome Back'}
              </Text>
              <Text style={styles.subtitle}>
                {showOtpInput 
                  ? `Enter the verification code sent to ${phoneNumber}`
                  : 'Enter your phone number to continue'
                }
              </Text>

              {!showOtpInput ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.phoneInputContainer}>
                    <Text style={styles.countryCode}>+91</Text>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="Enter phone number"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>OTP</Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={showOtpInput ? verifyOtp : sendOtp}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading ? ['#9CA3AF', '#6B7280'] : ['#3B82F6', '#1D4ED8']}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <Ionicons name="time" size={20} color="#FFFFFF" />
                      <Text style={styles.buttonText}>
                        {showOtpInput ? 'Verifying...' : 'Sending OTP...'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>
                      {showOtpInput ? 'Verify OTP' : 'Send OTP'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {showOtpInput && (
                <View style={styles.otpActions}>
                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={sendOtp}
                  >
                    <Text style={styles.resendText}>Resend OTP</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.changeNumberButton}
                    onPress={() => setShowOtpInput(false)}
                  >
                    <Text style={styles.changeNumberText}>Change Number</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Features Section */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Why Choose Vaidik Dhara?</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="videocam" size={20} color="#3B82F6" />
                  <Text style={styles.featureText}>Live Video Consultations</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="calendar" size={20} color="#10B981" />
                  <Text style={styles.featureText}>Easy Puja Booking</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="star" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Spiritual Journey Tracking</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="shield-checkmark" size={20} color="#8B5CF6" />
                  <Text style={styles.featureText}>Verified Spiritual Guides</Text>
                </View>
              </View>
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
    backgroundColor: '#F9FAFB',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    marginTop: -30,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  form: {
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  countryCode: {
    fontSize: 16,
    color: '#374151',
    marginRight: 12,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#111827',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 18,
    color: '#111827',
    letterSpacing: 4,
    backgroundColor: '#FFFFFF',
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  changeNumberButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  changeNumberText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  featuresContainer: {
    marginTop: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
  },
});

export default AuthScreen;