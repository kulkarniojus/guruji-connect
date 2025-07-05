import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface JourneyMilestone {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  date?: string;
  progress: number;
}

const mockJourney: JourneyMilestone[] = [
  {
    id: '1',
    title: 'First Puja Booking',
    description: 'Complete your first spiritual ceremony',
    isCompleted: true,
    date: '2025-01-05',
    progress: 100,
  },
  {
    id: '2',
    title: 'Connect with a Guruji',
    description: 'Have your first consultation session',
    isCompleted: true,
    date: '2025-01-08',
    progress: 100,
  },
  {
    id: '3',
    title: 'Weekly Devotion',
    description: 'Complete 7 consecutive days of prayer',
    isCompleted: false,
    progress: 57, // 4 out of 7 days
  },
  {
    id: '4',
    title: 'Spiritual Knowledge',
    description: 'Read 10 spiritual texts or teachings',
    isCompleted: false,
    progress: 30, // 3 out of 10 texts
  },
  {
    id: '5',
    title: 'Community Participation',
    description: 'Join group prayers or community events',
    isCompleted: false,
    progress: 0,
  },
];

const SpiritualJourneyScreen: React.FC = () => {
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);

  const completedMilestones = mockJourney.filter(m => m.isCompleted).length;
  const totalProgress = Math.round((completedMilestones / mockJourney.length) * 100);

  const renderMilestone = (milestone: JourneyMilestone, index: number) => (
    <TouchableOpacity
      key={milestone.id}
      style={styles.milestoneContainer}
      onPress={() => setSelectedMilestone(
        selectedMilestone === milestone.id ? null : milestone.id
      )}
      activeOpacity={0.7}
    >
      <View style={styles.milestone}>
        <View style={styles.milestoneLeft}>
          <View style={[
            styles.milestoneIcon,
            milestone.isCompleted && styles.completedIcon
          ]}>
            {milestone.isCompleted ? (
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            ) : (
              <Text style={styles.milestoneNumber}>{index + 1}</Text>
            )}
          </View>
          
          {index < mockJourney.length - 1 && (
            <View style={[
              styles.progressLine,
              milestone.isCompleted && styles.completedLine
            ]} />
          )}
        </View>

        <View style={styles.milestoneContent}>
          <View style={styles.milestoneHeader}>
            <Text style={[
              styles.milestoneTitle,
              milestone.isCompleted && styles.completedTitle
            ]}>
              {milestone.title}
            </Text>
            {milestone.isCompleted && milestone.date && (
              <Text style={styles.completedDate}>{milestone.date}</Text>
            )}
          </View>
          
          <Text style={styles.milestoneDescription}>
            {milestone.description}
          </Text>

          {!milestone.isCompleted && milestone.progress > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { width: `${milestone.progress}%` }
                ]} />
              </View>
              <Text style={styles.progressText}>
                {milestone.progress}% complete
              </Text>
            </View>
          )}

          {selectedMilestone === milestone.id && (
            <View style={styles.milestoneDetails}>
              <Text style={styles.detailsText}>
                {milestone.isCompleted 
                  ? 'Congratulations! You have achieved this milestone.'
                  : 'Keep going! Every step brings you closer to spiritual growth.'
                }
              </Text>
              {!milestone.isCompleted && (
                <TouchableOpacity style={styles.continueButton}>
                  <Text style={styles.continueButtonText}>Continue Journey</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Spiritual Journey</Text>
            <Text style={styles.headerSubtitle}>Track your path to enlightenment</Text>
            
            {/* Overall Progress */}
            <View style={styles.overallProgress}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercentage}>{totalProgress}%</Text>
                <Text style={styles.progressLabel}>Complete</Text>
              </View>
              <View style={styles.progressStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{completedMilestones}</Text>
                  <Text style={styles.statLabel}>Milestones</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{mockJourney.length - completedMilestones}</Text>
                  <Text style={styles.statLabel}>Remaining</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Journey Timeline */}
        <View style={styles.journeyContainer}>
          <Text style={styles.sectionTitle}>Your Spiritual Milestones</Text>
          
          <View style={styles.timeline}>
            {mockJourney.map((milestone, index) => renderMilestone(milestone, index))}
          </View>
        </View>

        {/* Inspiration Section */}
        <View style={styles.inspirationSection}>
          <Text style={styles.sectionTitle}>Daily Inspiration</Text>
          <View style={styles.inspirationCard}>
            <Ionicons name="bulb-outline" size={24} color="#F59E0B" />
            <Text style={styles.inspirationText}>
              "The journey of a thousand miles begins with one step. Every prayer, 
              every moment of devotion brings you closer to inner peace."
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Continue Your Journey</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionCard}>
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={styles.actionGradient}
              >
                <Ionicons name="calendar" size={28} color="#FFFFFF" />
                <Text style={styles.actionText}>Book Puja</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.actionGradient}
              >
                <Ionicons name="people" size={28} color="#FFFFFF" />
                <Text style={styles.actionText}>Find Guruji</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.actionGradient}
              >
                <Ionicons name="book" size={28} color="#FFFFFF" />
                <Text style={styles.actionText}>Read Texts</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 24,
  },
  overallProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  progressStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  journeyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  timeline: {
    paddingLeft: 10,
  },
  milestoneContainer: {
    marginBottom: 20,
  },
  milestone: {
    flexDirection: 'row',
  },
  milestoneLeft: {
    alignItems: 'center',
    marginRight: 20,
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedIcon: {
    backgroundColor: '#10B981',
  },
  milestoneNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  progressLine: {
    width: 2,
    height: 60,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  completedLine: {
    backgroundColor: '#10B981',
  },
  milestoneContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  completedTitle: {
    color: '#10B981',
  },
  completedDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  milestoneDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  milestoneDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  detailsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inspirationSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  inspirationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  inspirationText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginLeft: 12,
    fontStyle: 'italic',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SpiritualJourneyScreen;