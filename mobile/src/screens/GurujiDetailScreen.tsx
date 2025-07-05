import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const GurujiDetailScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop' }} 
            style={styles.profileImage} 
          />
          <Text style={styles.name}>Pandit Ramesh Sharma</Text>
          <Text style={styles.specialization}>Vedic Rituals Expert</Text>
          <View style={styles.rating}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.ratingText}>4.8 (120 reviews)</Text>
          </View>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Book Consultation</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>
            With over 15 years of experience in Vedic rituals and spiritual guidance, 
            Pandit Ramesh Sharma has helped thousands of devotees on their spiritual journey.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { alignItems: 'center', padding: 20, backgroundColor: '#FFFFFF' },
  profileImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  specialization: { fontSize: 16, color: '#6B7280', marginBottom: 8 },
  rating: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 14, color: '#6B7280', marginLeft: 4 },
  actions: { flexDirection: 'row', padding: 20, gap: 12 },
  actionButton: { flex: 1, borderRadius: 8, overflow: 'hidden' },
  buttonGradient: { paddingVertical: 12, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  messageButtonText: { fontSize: 16, fontWeight: '600', color: '#3B82F6', textAlign: 'center', paddingVertical: 12, borderWidth: 1, borderColor: '#3B82F6', borderRadius: 8 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  description: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
});

export default GurujiDetailScreen;