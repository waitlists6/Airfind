import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { 
  Smartphone, 
  Heart, 
  Wifi, 
  Battery, 
  MapPin, 
  Bluetooth, 
  Headphones, 
  CircleDot,
  BluetoothConnected,
  Info,
  Navigation,
} from 'lucide-react-native';
import { BLEDevice } from '@/types/ble';

interface DeviceCardProps {
  device: BLEDevice;
  onToggleFavorite: (deviceId: string) => void;
  onConnect: (deviceId: string) => void;
  onShowDetails?: (device: BLEDevice) => void;
}

export function DeviceCard({ device, onToggleFavorite, onConnect, onShowDetails }: DeviceCardProps) {
  const getDeviceIcon = () => {
    switch (device.type) {
      case 'airtag':
        return <CircleDot size={24} color="#007AFF" />;
      case 'iphone':
        return <Smartphone size={24} color="#007AFF" />;
      case 'android':
        return <Smartphone size={24} color="#34C759" />;
      case 'headphones':
        return <Headphones size={24} color="#AF52DE" />;
      default:
        return <Bluetooth size={24} color="#8E8E93" />;
    }
  };

  const getDeviceTypeLabel = () => {
    switch (device.type) {
      case 'airtag':
        return 'AirTag';
      case 'iphone':
        return 'iPhone';
      case 'android':
        return 'Android Phone';
      case 'headphones':
        return 'Headphones';
      default:
        return 'Unknown Device';
    }
  };

  const getSignalColor = () => {
    if (device.signalStrength > -50) return '#34C759'; // Green - Very Strong
    if (device.signalStrength > -60) return '#30D158'; // Light Green - Strong
    if (device.signalStrength > -70) return '#FF9500'; // Orange - Moderate
    if (device.signalStrength > -80) return '#FF6B35'; // Red Orange - Weak
    return '#FF3B30'; // Red - Very Weak
  };

  const getSignalStrength = () => {
    if (device.signalStrength > -50) return 'Excellent';
    if (device.signalStrength > -60) return 'Good';
    if (device.signalStrength > -70) return 'Fair';
    if (device.signalStrength > -80) return 'Poor';
    return 'Very Poor';
  };

  const getDistanceColor = () => {
    if (device.distance < 2) return '#34C759'; // Very close
    if (device.distance < 5) return '#30D158'; // Close
    if (device.distance < 10) return '#FF9500'; // Moderate
    if (device.distance < 20) return '#FF6B35'; // Far
    return '#FF3B30'; // Very far
  };

  const handleLocate = () => {
    Alert.alert(
      'Navigate to Device',
      `Start navigation to ${device.name}?\n\nDistance: ${device.distance.toFixed(1)}m\nSignal: ${getSignalStrength()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Navigate', 
          onPress: () => {
            // In real implementation, this would open Apple Maps or in-app navigation
            console.log('Navigate to device:', device.id);
          }
        },
      ]
    );
  };

  const handleShowDetails = () => {
    if (onShowDetails) {
      onShowDetails(device);
    } else {
      const serviceUUIDs = device.serviceUUIDs?.join(', ') || 'None';
      Alert.alert(
        `${device.name} Details`,
        `Type: ${getDeviceTypeLabel()}\nManufacturer: ${device.manufacturer}\nDistance: ${device.distance.toFixed(1)}m\nSignal Strength: ${device.signalStrength}dBm (${getSignalStrength()})\nLast Seen: ${device.lastSeen.toLocaleString()}\nService UUIDs: ${serviceUUIDs}${device.batteryLevel ? `\nBattery: ${device.batteryLevel}%` : ''}`,
        [{ text: 'OK' }]
      );
    }
  };

  const timeSinceLastSeen = Math.floor((Date.now() - device.lastSeen.getTime()) / 1000);
  const lastSeenText = timeSinceLastSeen < 10 ? 'Live' : 
                      timeSinceLastSeen < 60 ? `${timeSinceLastSeen}s ago` : 
                      `${Math.floor(timeSinceLastSeen / 60)}m ago`;

  return (
    <TouchableOpacity style={styles.card} onPress={handleShowDetails} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.deviceInfo}>
          {getDeviceIcon()}
          <View style={styles.deviceDetails}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceType}>{getDeviceTypeLabel()}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onToggleFavorite(device.id)}
        >
          <Heart 
            size={20} 
            color={device.isFavorite ? '#FF3B30' : '#C7C7CC'} 
            fill={device.isFavorite ? '#FF3B30' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {/* Live Metrics */}
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <MapPin size={14} color={getDistanceColor()} />
          <Text style={[styles.metricText, { color: getDistanceColor() }]}>
            {device.distance.toFixed(1)}m
          </Text>
        </View>
        <View style={styles.metric}>
          <Wifi size={14} color={getSignalColor()} />
          <Text style={[styles.metricText, { color: getSignalColor() }]}>
            {device.signalStrength}dBm
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.signalStrengthText, { color: getSignalColor() }]}>
            {getSignalStrength()}
          </Text>
        </View>
        {device.batteryLevel && (
          <View style={styles.metric}>
            <Battery size={14} color="#34C759" />
            <Text style={styles.metricText}>{device.batteryLevel}%</Text>
          </View>
        )}
      </View>

      {/* Status and Last Seen */}
      <View style={styles.status}>
        <View style={styles.connectionStatus}>
          <View style={[
            styles.statusDot, 
            { backgroundColor: device.isConnected ? '#34C759' : timeSinceLastSeen < 10 ? '#007AFF' : '#FF9500' }
          ]} />
          <Text style={styles.statusText}>
            {device.isConnected ? 'Connected' : timeSinceLastSeen < 10 ? 'Live' : 'Discovered'}
          </Text>
        </View>
        <Text style={styles.lastSeen}>{lastSeenText}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.connectButton]}
          onPress={() => onConnect(device.id)}
        >
          <BluetoothConnected size={16} color="#FFFFFF" />
          <Text style={styles.connectButtonText}>
            {device.isConnected ? 'Disconnect' : 'Connect'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLocate}
        >
          <Navigation size={16} color="#007AFF" />
          <Text style={styles.actionButtonText}>Navigate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShowDetails}
        >
          <Info size={16} color="#007AFF" />
          <Text style={styles.actionButtonText}>Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 8,
    marginVertical: 6,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceDetails: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  favoriteButton: {
    padding: 8,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    marginLeft: 4,
  },
  signalStrengthText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  status: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
  },
  lastSeen: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  actions: {
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
  connectButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  connectButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
});