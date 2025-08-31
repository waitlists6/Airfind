import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { MapPin, Navigation, Locate, Layers, CircleAlert as AlertCircle } from 'lucide-react-native';
import { RealMapView } from '@/components/RealMapView';
import { RealBLEService } from '@/services/RealBLEService';
import { LocationService } from '@/services/LocationService';
import { BLEDevice } from '@/types/ble';

export default function MapScreen() {
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  const bleService = RealBLEService.getInstance();
  const locationService = LocationService.getInstance();

  useFocusEffect(
    React.useCallback(() => {
      checkPermissionsAndStartScanning();
      return () => {
        if (isScanning) {
          bleService.stopScanning();
          setIsScanning(false);
        }
      };
    }, [])
  );

  const checkPermissionsAndStartScanning = async () => {
    try {
      // Check location permissions
      const location = await locationService.getCurrentLocation();
      setHasLocationPermission(!!location);

      if (location) {
        // Start scanning for devices
        setIsScanning(true);
        await bleService.startScanning((device: BLEDevice) => {
          setDevices(prev => {
            const existingIndex = prev.findIndex(d => d.id === device.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = device;
              return updated;
            } else {
              return [...prev, device];
            }
          });
        });
      }
    } catch (error) {
      console.error('Failed to initialize map screen:', error);
    }
  };

  const handleDevicePress = (device: BLEDevice) => {
    const signalQuality = device.signalStrength > -60 ? 'Strong' : 
                         device.signalStrength > -70 ? 'Moderate' : 'Weak';
    
    Alert.alert(
      device.name,
      `Distance: ${device.distance.toFixed(1)} meters\nSignal Strength: ${device.signalStrength}dBm (${signalQuality})\nType: ${device.type}\nLast Seen: ${device.lastSeen.toLocaleTimeString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Navigate', 
          onPress: () => navigateToDevice(device)
        },
        {
          text: 'Connect',
          onPress: () => connectToDevice(device)
        }
      ]
    );
  };

  const navigateToDevice = (device: BLEDevice) => {
    // In real implementation, this would:
    // 1. Calculate precise direction to device
    // 2. Open Apple Maps with directions
    // 3. Or provide in-app navigation with compass
    
    Alert.alert(
      'Navigation',
      `Starting navigation to ${device.name}. Follow the signal strength indicator to get closer.`,
      [{ text: 'OK' }]
    );
  };

  const connectToDevice = async (device: BLEDevice) => {
    try {
      const success = await bleService.connectToDevice(device.id);
      if (success) {
        setDevices(prev =>
          prev.map(d =>
            d.id === device.id ? { ...d, isConnected: true } : d
          )
        );
        Alert.alert('Connected', `Successfully connected to ${device.name}`);
      }
    } catch (error) {
      Alert.alert('Connection Failed', 'Unable to connect to device');
    }
  };

  if (!hasLocationPermission) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Device Map</Text>
          <Text style={styles.headerSubtitle}>Location required</Text>
        </View>

        <View style={styles.permissionContainer}>
          <AlertCircle size={48} color="#FF9500" />
          <Text style={styles.permissionTitle}>Location Access Required</Text>
          <Text style={styles.permissionText}>
            To show device locations on the map, this app needs access to your location.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={checkPermissionsAndStartScanning}
          >
            <Text style={styles.permissionButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Device Map</Text>
        <Text style={styles.headerSubtitle}>
          {devices.length} device{devices.length !== 1 ? 's' : ''} nearby
        </Text>
      </View>

      {/* Real Map View */}
      <RealMapView
        devices={devices}
        onDevicePress={handleDevicePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '400',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});