import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { 
  MapPin, 
  Monitor,
  Smartphone,
} from 'lucide-react-native';
import { BLEDevice } from '@/types/ble';

interface RealMapViewProps {
  devices: BLEDevice[];
  onDevicePress: (device: BLEDevice) => void;
}

export function RealMapView({ devices, onDevicePress }: RealMapViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.webNotice}>
        <Monitor size={48} color="#8E8E93" />
        <Text style={styles.noticeTitle}>Map View</Text>
        <Text style={styles.noticeText}>
          Interactive maps are available on mobile devices. 
          Use the scanner tab to find and manage devices.
        </Text>
      </View>
      
      {devices.length > 0 && (
        <View style={styles.deviceList}>
          <Text style={styles.deviceListTitle}>Nearby Devices</Text>
          {devices.slice(0, 5).map((device) => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceItem}
              onPress={() => onDevicePress(device)}
            >
              <View style={styles.deviceInfo}>
                <Smartphone size={16} color="#007AFF" />
                <Text style={styles.deviceName}>{device.name}</Text>
              </View>
              <Text style={styles.deviceDistance}>
                {device.distance.toFixed(1)}m
              </Text>
            </TouchableOpacity>
          ))}
          {devices.length > 5 && (
            <Text style={styles.moreDevices}>
              +{devices.length - 5} more devices
            </Text>
          )}
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
  webNotice: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noticeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  deviceList: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  deviceListTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    color: '#000000',
    marginLeft: 8,
  },
  deviceDistance: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  moreDevices: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});