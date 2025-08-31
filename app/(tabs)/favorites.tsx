import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { 
  Heart, 
  Smartphone, 
  CircleDot, 
  Headphones,
  Bluetooth,
  MapPin,
  Trash2,
  Bell,
  BellOff,
  Navigation,
  Wifi,
  Battery,
} from 'lucide-react-native';
import { RealBLEService } from '@/services/RealBLEService';
import { BLEDevice } from '@/types/ble';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<BLEDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const bleService = RealBLEService.getInstance();

  useFocusEffect(
    React.useCallback(() => {
      loadFavorites();
      startScanningForFavorites();
      
      return () => {
        if (isScanning) {
          bleService.stopScanning();
          setIsScanning(false);
        }
      };
    }, [])
  );

  const loadFavorites = async () => {
    try {
      const favoriteIds = await bleService.loadFavorites();
      // Filter current devices to show only favorites
      setFavorites(prev => prev.filter(device => favoriteIds.includes(device.id)));
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const startScanningForFavorites = async () => {
    try {
      setIsScanning(true);
      const favoriteIds = await bleService.loadFavorites();
      
      await bleService.startScanning((device: BLEDevice) => {
        // Only add to favorites list if it's actually a favorite
        if (favoriteIds.includes(device.id)) {
          setFavorites(prev => {
            const existingIndex = prev.findIndex(d => d.id === device.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = { ...device, isFavorite: true };
              return updated;
            } else {
              return [...prev, { ...device, isFavorite: true }];
            }
          });
        }
      });
    } catch (error) {
      console.error('Failed to start scanning for favorites:', error);
      setIsScanning(false);
    }
  };

  const refreshFavorites = async () => {
    setRefreshing(true);
    await loadFavorites();
    if (isScanning) {
      await bleService.stopScanning();
      setTimeout(() => startScanningForFavorites(), 500);
    } else {
      await startScanningForFavorites();
    }
    setRefreshing(false);
  };

  const removeFavorite = async (deviceId: string) => {
    const device = favorites.find(d => d.id === deviceId);
    Alert.alert(
      'Remove Favorite',
      `Remove "${device?.name}" from favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Update local state
            setFavorites(prev => prev.filter(d => d.id !== deviceId));
            
            // Update stored favorites
            const remainingFavorites = favorites
              .filter(d => d.id !== deviceId)
              .map(d => d.id);
            await bleService.saveFavorites(remainingFavorites);
          },
        },
      ]
    );
  };

  const connectToDevice = async (device: BLEDevice) => {
    try {
      if (device.isConnected) {
        await bleService.disconnectFromDevice(device.id);
        setFavorites(prev =>
          prev.map(d =>
            d.id === device.id ? { ...d, isConnected: false } : d
          )
        );
      } else {
        const success = await bleService.connectToDevice(device.id);
        if (success) {
          setFavorites(prev =>
            prev.map(d =>
              d.id === device.id ? { ...d, isConnected: true } : d
            )
          );
          Alert.alert('Connected', `Connected to ${device.name}`);
        }
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Failed to connect to device');
    }
  };

  const locateDevice = (device: BLEDevice) => {
    if (!device.isConnected && device.distance > 50) {
      Alert.alert(
        'Device Too Far',
        `${device.name} is ${device.distance.toFixed(0)}m away and not connected. Move closer to get a better signal.`
      );
      return;
    }

    const signalQuality = device.signalStrength > -60 ? 'Strong' : 
                         device.signalStrength > -70 ? 'Moderate' : 'Weak';

    Alert.alert(
      'Device Location',
      `${device.name} is ${device.distance.toFixed(1)}m away\nSignal: ${signalQuality} (${device.signalStrength}dBm)\n\nUse the signal strength to guide you - the stronger the signal, the closer you are!`,
      [
        { text: 'OK' },
        { 
          text: 'Play Sound', 
          onPress: () => {
            // In real implementation, this would trigger device sound
            Alert.alert('Sound Played', 'Device should now be playing a sound');
          }
        }
      ]
    );
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'airtag':
        return <CircleDot size={20} color="#FFFFFF" />;
      case 'iphone':
        return <Smartphone size={20} color="#FFFFFF" />;
      case 'android':
        return <Smartphone size={20} color="#FFFFFF" />;
      case 'headphones':
        return <Headphones size={20} color="#FFFFFF" />;
      default:
        return <Bluetooth size={20} color="#FFFFFF" />;
    }
  };

  const getDeviceColor = (device: BLEDevice) => {
    if (device.isConnected) return '#34C759';
    
    switch (device.type) {
      case 'airtag':
        return '#007AFF';
      case 'iphone':
        return '#007AFF';
      case 'android':
        return '#34C759';
      case 'headphones':
        return '#AF52DE';
      default:
        return '#8E8E93';
    }
  };

  const getSignalColor = (signalStrength: number) => {
    if (signalStrength > -50) return '#34C759';
    if (signalStrength > -70) return '#FF9500';
    return '#FF3B30';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorite Devices</Text>
        <Text style={styles.headerSubtitle}>
          {favorites.length} favorite device{favorites.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {favorites.length > 0 ? (
        <ScrollView 
          style={styles.favoritesList} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshFavorites}
              tintColor="#007AFF"
            />
          }
        >
          {favorites
            .sort((a, b) => a.distance - b.distance)
            .map((device) => {
              const timeSinceLastSeen = Math.floor((Date.now() - device.lastSeen.getTime()) / 1000);
              const isLive = timeSinceLastSeen < 10;
              
              return (
                <View key={device.id} style={styles.favoriteCard}>
                  {/* Device Header */}
                  <View style={styles.favoriteHeader}>
                    <View style={styles.favoriteInfo}>
                      <View style={[styles.deviceIconContainer, { backgroundColor: getDeviceColor(device) }]}>
                        {getDeviceIcon(device.type)}
                      </View>
                      <View style={styles.favoriteDetails}>
                        <Text style={styles.favoriteName}>{device.name}</Text>
                        <Text style={styles.favoriteType}>
                          {device.type === 'airtag' ? 'AirTag' : 
                           device.type === 'iphone' ? 'iPhone' :
                           device.type === 'android' ? 'Android Phone' :
                           device.type === 'headphones' ? 'Headphones' : 'Unknown Device'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.favoriteStatus}>
                      <View style={[
                        styles.statusIndicator,
                        { backgroundColor: device.isConnected ? '#34C759' : isLive ? '#007AFF' : '#8E8E93' }
                      ]} />
                      <Text style={styles.statusText}>
                        {device.isConnected ? 'Connected' : isLive ? 'Live' : 'Offline'}
                      </Text>
                    </View>
                  </View>

                  {/* Live Metrics */}
                  <View style={styles.metricsContainer}>
                    <View style={styles.metricItem}>
                      <MapPin size={14} color={getSignalColor(device.signalStrength)} />
                      <Text style={[styles.metricValue, { color: getSignalColor(device.signalStrength) }]}>
                        {device.distance.toFixed(1)}m
                      </Text>
                      <Text style={styles.metricLabel}>Distance</Text>
                    </View>
                    
                    <View style={styles.metricItem}>
                      <Wifi size={14} color={getSignalColor(device.signalStrength)} />
                      <Text style={[styles.metricValue, { color: getSignalColor(device.signalStrength) }]}>
                        {device.signalStrength}
                      </Text>
                      <Text style={styles.metricLabel}>dBm</Text>
                    </View>

                    {device.batteryLevel && (
                      <View style={styles.metricItem}>
                        <Battery size={14} color="#34C759" />
                        <Text style={styles.metricValue}>{device.batteryLevel}%</Text>
                        <Text style={styles.metricLabel}>Battery</Text>
                      </View>
                    )}
                  </View>

                  {/* Last Seen */}
                  <Text style={styles.lastSeen}>
                    Last seen: {isLive ? 'Live now' : device.lastSeen.toLocaleString()}
                  </Text>

                  {/* Actions */}
                  <View style={styles.favoriteActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.locateButton]}
                      onPress={() => locateDevice(device)}
                    >
                      <Navigation size={16} color="#FFFFFF" />
                      <Text style={styles.locateButtonText}>Locate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => connectToDevice(device)}
                    >
                      <Bluetooth size={16} color="#007AFF" />
                      <Text style={styles.actionButtonText}>
                        {device.isConnected ? 'Disconnect' : 'Connect'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => removeFavorite(device.id)}
                    >
                      <Trash2 size={16} color="#FF3B30" />
                      <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Heart size={48} color="#C7C7CC" />
          <Text style={styles.emptyStateTitle}>No Favorite Devices</Text>
          <Text style={styles.emptyStateText}>
            Add devices to favorites from the scanner to see them here with live tracking
          </Text>
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => {
              // Navigate to scanner tab
              console.log('Navigate to scanner');
            }}
          >
            <Text style={styles.scanButtonText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      )}
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
  favoritesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  favoriteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  favoriteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  favoriteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteDetails: {
    marginLeft: 12,
    flex: 1,
  },
  favoriteName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  favoriteType: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  favoriteStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginTop: 4,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  lastSeen: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
  },
  favoriteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    flex: 1,
  },
  locateButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
    color: '#007AFF',
  },
  locateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});