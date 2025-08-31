import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { 
  MapPin, 
  Navigation,
  Smartphone,
  CircleDot,
  Headphones,
  Bluetooth,
  Crosshair,
} from 'lucide-react-native';
import { LocationService, UserLocation } from '@/services/LocationService';
import { BLEDevice } from '@/types/ble';

interface RealMapViewProps {
  devices: BLEDevice[];
  onDevicePress: (device: BLEDevice) => void;
}

export function RealMapView({ devices, onDevicePress }: RealMapViewProps) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const locationService = LocationService.getInstance();

  useEffect(() => {
    initializeLocation();
    return () => {
      locationService.stopLocationTracking();
    };
  }, []);

  const initializeLocation = async () => {
    try {
      setIsLoadingLocation(true);
      
      // Get current location
      const location = await locationService.getCurrentLocation();
      if (location) {
        setUserLocation(location);
      }

      // Start tracking location updates
      locationService.startLocationTracking((location) => {
        setUserLocation(location);
      });

    } catch (error) {
      console.error('Failed to initialize location:', error);
      Alert.alert(
        'Location Error',
        'Unable to access your location. Please enable location services.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'airtag':
        return <CircleDot size={16} color="#FFFFFF" />;
      case 'iphone':
        return <Smartphone size={16} color="#FFFFFF" />;
      case 'android':
        return <Smartphone size={16} color="#FFFFFF" />;
      case 'headphones':
        return <Headphones size={16} color="#FFFFFF" />;
      default:
        return <Bluetooth size={16} color="#FFFFFF" />;
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

  // Estimate device location based on user location and distance
  const estimateDeviceLocation = (device: BLEDevice, userLoc: UserLocation) => {
    // This is a simplified estimation - in reality, you'd need triangulation
    // from multiple reference points for accurate positioning
    const angle = Math.random() * 2 * Math.PI; // Random angle for demo
    const distanceInDegrees = device.distance / 111320; // Convert meters to degrees (approximate)
    
    return {
      latitude: userLoc.latitude + (distanceInDegrees * Math.cos(angle)),
      longitude: userLoc.longitude + (distanceInDegrees * Math.sin(angle)),
    };
  };

  const centerOnUser = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        setUserLocation(location);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to get current location');
    }
  };

  const toggleMapType = () => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
  };

  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (!userLocation) {
    return (
      <View style={styles.errorContainer}>
        <MapPin size={48} color="#C7C7CC" />
        <Text style={styles.errorTitle}>Location Required</Text>
        <Text style={styles.errorText}>
          Enable location services to see devices on the map
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeLocation}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'ios' ? undefined : PROVIDER_GOOGLE}
        mapType={mapType}
        region={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {/* User Location Marker */}
        <Marker
          coordinate={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }}
          title="Your Location"
          description="Current position"
        >
          <View style={styles.userMarker}>
            <Crosshair size={16} color="#FFFFFF" />
          </View>
        </Marker>

        {/* User Location Accuracy Circle */}
        <Circle
          center={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }}
          radius={userLocation.accuracy}
          fillColor="rgba(0, 122, 255, 0.1)"
          strokeColor="rgba(0, 122, 255, 0.3)"
          strokeWidth={1}
        />

        {/* Device Markers */}
        {devices.map((device) => {
          const deviceLocation = estimateDeviceLocation(device, userLocation);
          
          return (
            <Marker
              key={device.id}
              coordinate={deviceLocation}
              title={device.name}
              description={`${device.distance.toFixed(1)}m away • ${device.signalStrength}dBm`}
              onPress={() => onDevicePress(device)}
            >
              <View style={[
                styles.deviceMarker,
                { backgroundColor: getDeviceColor(device) }
              ]}>
                {getDeviceIcon(device.type)}
              </View>
            </Marker>
          );
        })}

        {/* Device Range Circles */}
        {devices.map((device) => {
          const deviceLocation = estimateDeviceLocation(device, userLocation);
          
          return (
            <Circle
              key={`circle-${device.id}`}
              center={deviceLocation}
              radius={Math.max(device.distance, 5)} // Minimum 5m radius for visibility
              fillColor={`${getDeviceColor(device)}20`} // 20% opacity
              strokeColor={`${getDeviceColor(device)}60`} // 60% opacity
              strokeWidth={2}
            />
          );
        })}
      </MapView>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlButton} onPress={centerOnUser}>
          <MapPin size={20} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleMapType}>
          <Text style={styles.mapTypeText}>
            {mapType === 'standard' ? 'SAT' : 'STD'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Device Info Panel */}
      {devices.length > 0 && (
        <View style={styles.devicePanel}>
          <Text style={styles.devicePanelTitle}>
            {devices.length} Device{devices.length !== 1 ? 's' : ''} Nearby
          </Text>
          <View style={styles.deviceSummary}>
            {devices.slice(0, 3).map((device, index) => (
              <View key={device.id} style={styles.deviceSummaryItem}>
                {getDeviceIcon(device.type)}
                <Text style={styles.deviceSummaryText}>
                  {device.distance.toFixed(0)}m
                </Text>
              </View>
            ))}
            {devices.length > 3 && (
              <Text style={styles.moreDevicesText}>+{devices.length - 3} more</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  deviceMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 16,
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#007AFF',
  },
  devicePanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  devicePanelTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  deviceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deviceSummaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  deviceSummaryText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  moreDevicesText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    marginLeft: 8,
  },
});