export interface BLEDevice {
  id: string;
  name: string;
  type: 'airtag' | 'iphone' | 'android' | 'headphones' | 'unknown';
  distance: number;
  signalStrength: number;
  isConnected: boolean;
  isFavorite: boolean;
  lastSeen: Date;
  batteryLevel?: number;
  manufacturer?: string;
  serviceUUIDs?: string[];
  advertisementData?: any;
  txPower?: number;
  isConnectable?: boolean;
}

export interface ScanOptions {
  allowDuplicates: boolean;
  scanMode: 'lowPower' | 'balanced' | 'lowLatency';
  timeout?: number;
  serviceUUIDs?: string[];
}

export interface DeviceLocation {
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  estimatedFromSignal: boolean;
}

export interface ConnectionState {
  deviceId: string;
  isConnected: boolean;
  connectionTime?: Date;
  services?: string[];
  characteristics?: string[];
}

export interface NotificationSettings {
  deviceId: string;
  enabled: boolean;
  proximityAlerts: boolean;
  connectionAlerts: boolean;
  batteryAlerts: boolean;
}