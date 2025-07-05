import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const VideoCallScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoContainer}>
        <Text style={styles.placeholder}>Video Call Interface</Text>
        <Text style={styles.subtext}>Connect with your Guruji</Text>
      </View>
      
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton}>
          <Ionicons name="mic" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, styles.endCall]}>
          <Ionicons name="call" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton}>
          <Ionicons name="videocam" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  videoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  subtext: { fontSize: 16, color: '#9CA3AF' },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 30, gap: 20 },
  controlButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  endCall: { backgroundColor: '#EF4444' },
});

export default VideoCallScreen;