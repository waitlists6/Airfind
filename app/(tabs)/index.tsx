import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Bluetooth, BluetoothConnected, Smartphone, MapPin, Heart, Wifi, Battery, Signal, ChevronRight, RefreshCw, CircleAlert as AlertCircle } from 'lucide-react-native';
import { DeviceCard } from '@/components/DeviceCard';
import { ScanningIndicator } from '@/components/ScanningIndicator';
import { RealBLEService } from '@/services/RealBLEService';
import { LocationService } from '@/services/LocationService';
import { BLEDevice } from '@/types/ble';

export default function ScannerScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [scanAnimation] = useState(new Animated.Value(0));
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const bleService = RealBLEService.getInstance();
  const locationService = LocationService.getInstance();

  // Initialize services and check permissions
  useEffect(() => {
    initializeServices();
    return () => {
      bleService.stopScanning();
      locationService.stopLocationTracking();
    };
  }, []);

  // Handle screen focus
  useFocusEffect(
    useCallback(() => {
      checkBluetoothState();
    }, [])
  );

  const initializeServices = async () => {
    try {
      // Initialize location tracking
      await locationService.getCurrentLocation();
      
      // Check if we have necessary permissions
      const hasPermissions = await bleService.requestPermissions();
      if (!hasPermissions) {
        setScanError('Bluetooth permissions required');
      }
    } catch (error) {
      console.error('Service initialization failed:', error);
      setScanError('Failed to initialize services');
    }
  };

  const checkBluetoothState = async () => {
    try {
      // In real implementation, check BLE manager state
      setIsBluetoothEnabled(true);
    } catch (error) {
      setIsBluetoothEnabled(false);
      setScanError('Bluetooth is disabled');
    }
  };

  const startScanning = async () => {
    if (!isBluetoothEnabled) {
      Alert.alert(
        'Bluetooth Disabled',
        'Please enable Bluetooth to scan for devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setScanError(null);
      setIsScanning(true);
      setDevices([]);
      
      // Start location tracking
      locationService.startLocationTracking((location) => {
        console.log('Location updated:', location);
      });

      // Start BLE scanning
      await bleService.startScanning((device: BLEDevice) => {
        setDevices(prev => {
          const existingIndex = prev.findIndex(d => d.id === device.id);
          if (existingIndex >= 0) {
            // Update existing device
            const updated = [...prev];
            updated[existingIndex] = { ...device, isFavorite: prev[existingIndex].isFavorite };
            return updated;
          } else {
            // Add new device
            return [...prev, device];
          }
        });
      });
      
      // Animate scanning indicator
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

    } catch (error) {
      console.error('Scan start failed:', error);
      setIsScanning(false);
      setScanError(error instanceof Error ? error.message : 'Scan failed');
      
      Alert.alert(
        'Scan Failed',
        'Unable to start scanning. Please check Bluetooth permissions and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const stopScanning = async () => {
    try {
      await bleService.stopScanning();
      locationService.stopLocationTracking();
      setIsScanning(false);
      scanAnimation.stopAnimation();
      scanAnimation.setValue(0);
    } catch (error) {
      console.error('Stop scan failed:', error);
    }
  };

  const refreshDevices = async () => {
    setRefreshing(true);
    if (isScanning) {
      await stopScanning();
      setTimeout(() => startScanning(), 500);
    }
    setRefreshing(false);
  };

  const toggleFavorite = async (deviceId: string) => {
    setDevices(prev =>
      prev.map(device =>
        device.id === deviceId
          ? { ...device, isFavorite: !device.isFavorite }
          : device
      )
    );

    // Save favorites to storage
    const updatedDevices = devices.map(device =>
      device.id === deviceId
        ? { ...device, isFavorite: !device.isFavorite }
        : device
    );
    
    const favoriteIds = updatedDevices
      .filter(device => device.isFavorite)
      .map(device => device.id);
    
    await bleService.saveFavorites(favoriteIds);
  };

  const connectToDevice = async (deviceId: string) => {
    try {
      const success = await bleService.connectToDevice(deviceId);
      
      if (success) {
        setDevices(prev =>
          prev.map(device =>
            device.id === deviceId
              ? { ...device, isConnected: true }
              : device
          )
        );
        
        Alert.alert(
          'Connected',
          'Successfully connected to device',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Connection Failed',
          'Unable to connect to device',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert(
        'Connection Error',
        'An error occurred while connecting to the device',
        [{ text: 'OK' }]
      );
    }
  };

  const disconnectFromDevice = async (deviceId: string) => {
    try {
      await bleService.disconnectFromDevice(deviceId);
      
      setDevices(prev =>
        prev.map(device =>
          device.id === deviceId
            ? { ...device, isConnected: false }
            : device
        )
      );
    } catch (error) {
      console.error('Disconnection error:', error);
    }
  };

  const handleDeviceAction = (device: BLEDevice) => {
    if (device.isConnected) {
      disconnectFromDevice(device.id);
    } else {
      connectToDevice(device.id);
    }
  };

  // Load favorites on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favoriteIds = await bleService.loadFavorites();
        setDevices(prev =>
          prev.map(device => ({
            ...device,
            isFavorite: favoriteIds.includes(device.id)
          }))
        );
      } catch (error) {
        console.error('Failed to load favorites:', error);
      }
    };

    loadFavorites();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BLE Scanner</Text>
        <Text style={styles.headerSubtitle}>
          Find nearby AirTags, phones & devices
        </Text>
        
        {!isBluetoothEnabled && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#FF3B30" />
            <Text style={styles.errorText}>Bluetooth is disabled</Text>
          </View>
        )}
      </View>

      {/* Scan Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.scanButton, 
            isScanning && styles.scanButtonActive,
            !isBluetoothEnabled && styles.scanButtonDisabled
          ]}
          onPress={isScanning ? stopScanning : startScanning}
          disabled={!isBluetoothEnabled}
        >
          <Bluetooth 
            size={24} 
            color={isScanning ? '#FFFFFF' : (isBluetoothEnabled ? '#007AFF' : '#C7C7CC')} 
          />
          <Text style={[
            styles.scanButtonText, 
            isScanning && styles.scanButtonTextActive,
            !isBluetoothEnabled && styles.scanButtonTextDisabled
          ]}>
            {isScanning ? 'Stop Scanning' : 'Start Scan'}
          </Text>
        </TouchableOpacity>
        
        {!isScanning && devices.length > 0 && (
          <TouchableOpacity style={styles.refreshButton} onPress={refreshDevices}>
            <RefreshCw size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
        
        {isScanning && (
          <ScanningIndicator animation={scanAnimation} />
        )}
      </View>

      {/* Error Display */}
      {scanError && (
        <View style={styles.errorContainer}>
          <AlertCircle size={16} color="#FF3B30" />
          <Text style={styles.errorMessage}>{scanError}</Text>
        </View>
      )}

      {/* Device Count */}
      <View style={styles.deviceCount}>
        <Signal size={16} color="#8E8E93" />
        <Text style={styles.deviceCountText}>
          {devices.length} device{devices.length !== 1 ? 's' : ''} found
        </Text>
        {isScanning && (
          <View style={styles.scanningIndicator}>
            <View style={styles.scanningDot} />
            <Text style={styles.scanningText}>Scanning...</Text>
          </View>
        )}
      </View>

      {/* Devices List */}
      <ScrollView 
        style={styles.devicesList} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshDevices}
            tintColor="#007AFF"
          />
        }
      >
        {devices.length > 0 ? (
          devices
            .sort((a, b) => a.distance - b.distance)
            .map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onToggleFavorite={toggleFavorite}
                onConnect={handleDeviceAction}
                onShowDetails={(device) => {
                  Alert.alert(
                    device.name,
                    `Type: ${device.type}\nDistance: ${device.distance.toFixed(1)}m\nSignal: ${device.signalStrength}dBm\nManufacturer: ${device.manufacturer}\nLast seen: ${device.lastSeen.toLocaleTimeString()}`,
                    [{ text: 'OK' }]
                  );
                }}
              />
            ))
        ) : (
          <View style={styles.emptyState}>
            <Bluetooth size={48} color="#C7C7CC" />
            <Text style={styles.emptyStateText}>
              {isScanning 
                ? 'Scanning for devices...' 
                : isBluetoothEnabled 
                  ? 'Tap "Start Scan" to find nearby devices'
                  : 'Enable Bluetooth to scan for devices'
              }
            </Text>
            {!isBluetoothEnabled && (
              <TouchableOpacity 
                style={styles.enableBluetoothButton}
                onPress={() => Alert.alert('Enable Bluetooth', 'Please enable Bluetooth in Settings')}
              >
                <Text style={styles.enableBluetoothText}>Open Settings</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 24,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
    marginLeft: 6,
  },
  controls: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#FFFFFF',
  },
  scanButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  scanButtonDisabled: {
    borderColor: '#C7C7CC',
    backgroundColor: '#F2F2F7',
  },
  scanButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  scanButtonTextActive: {
    color: '#FFFFFF',
  },
  scanButtonTextDisabled: {
    color: '#C7C7CC',
  },
  refreshButton: {
    position: 'absolute',
    right: 24,
    top: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  deviceCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  deviceCountText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 6,
    fontWeight: '500',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 6,
  },
  scanningText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  devicesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  enableBluetoothButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  enableBluetoothText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});