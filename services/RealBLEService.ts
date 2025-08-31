import { BleManager, Device, State, BleError } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BLEDevice } from '@/types/ble';

export class RealBLEService {
  private static instance: RealBLEService;
  private bleManager: BleManager;
  private isScanning: boolean = false;
  private discoveredDevices: Map<string, BLEDevice> = new Map();
  private scanSubscription: any = null;
  private onDeviceFoundCallback?: (device: BLEDevice) => void;

  private constructor() {
    this.bleManager = new BleManager();
    this.setupBleManager();
  }

  static getInstance(): RealBLEService {
    if (!RealBLEService.instance) {
      RealBLEService.instance = new RealBLEService();
    }
    return RealBLEService.instance;
  }

  private setupBleManager() {
    this.bleManager.onStateChange((state) => {
      console.log('BLE State changed:', state);
      if (state === State.PoweredOff) {
        this.stopScanning();
        Alert.alert(
          'Bluetooth Disabled',
          'Please enable Bluetooth to scan for devices.',
          [{ text: 'OK' }]
        );
      }
    }, true);
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );
      }
      
      // iOS permissions are handled through Info.plist
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  async startScanning(onDeviceFound: (device: BLEDevice) => void): Promise<void> {
    if (this.isScanning) {
      console.log('Already scanning');
      return;
    }

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Bluetooth permissions not granted');
    }

    const state = await this.bleManager.state();
    if (state !== State.PoweredOn) {
      throw new Error('Bluetooth is not enabled');
    }

    this.onDeviceFoundCallback = onDeviceFound;
    this.isScanning = true;
    this.discoveredDevices.clear();

    console.log('Starting BLE scan...');

    this.scanSubscription = this.bleManager.startDeviceScan(
      null, // Scan for all devices
      { 
        allowDuplicates: true, // Allow updates for same device
        scanMode: 'balanced',
        callbackType: 'all_matches'
      },
      (error: BleError | null, device: Device | null) => {
        if (error) {
          console.error('Scan error:', error);
          this.stopScanning();
          return;
        }

        if (device) {
          const bleDevice = this.processBLEDevice(device);
          this.discoveredDevices.set(device.id, bleDevice);
          onDeviceFound(bleDevice);
        }
      }
    );
  }

  async stopScanning(): Promise<void> {
    if (!this.isScanning) return;

    this.isScanning = false;
    this.bleManager.stopDeviceScan();
    
    if (this.scanSubscription) {
      this.scanSubscription = null;
    }
    
    console.log('Stopped BLE scanning');
  }

  private processBLEDevice(device: Device): BLEDevice {
    const deviceType = this.identifyDeviceType(device);
    const distance = this.calculateDistance(device.rssi || -100);
    
    return {
      id: device.id,
      name: device.localName || device.name || 'Unknown Device',
      type: deviceType,
      distance: distance,
      signalStrength: device.rssi || -100,
      isConnected: false,
      isFavorite: false,
      lastSeen: new Date(),
      batteryLevel: this.extractBatteryLevel(device),
      manufacturer: this.extractManufacturer(device),
      serviceUUIDs: device.serviceUUIDs || [],
      advertisementData: device.manufacturerData,
    };
  }

  private identifyDeviceType(device: Device): BLEDevice['type'] {
    const name = (device.localName || device.name || '').toLowerCase();
    const manufacturerData = device.manufacturerData;
    const serviceUUIDs = device.serviceUUIDs || [];

    // Check for Apple devices (manufacturer ID 0x004C)
    if (manufacturerData) {
      const appleManufacturerData = this.parseManufacturerData(manufacturerData, '004c');
      if (appleManufacturerData) {
        // AirTag detection patterns
        if (this.isAirTag(appleManufacturerData, serviceUUIDs)) {
          return 'airtag';
        }
        
        // iPhone detection patterns
        if (this.isIPhone(appleManufacturerData, serviceUUIDs, name)) {
          return 'iphone';
        }
      }
    }

    // Audio device detection
    if (this.isAudioDevice(serviceUUIDs, name)) {
      return 'headphones';
    }

    // Android device detection
    if (this.isAndroidDevice(manufacturerData, name)) {
      return 'android';
    }

    return 'unknown';
  }

  private parseManufacturerData(data: string, manufacturerId: string): string | null {
    try {
      // Convert base64 to hex and look for manufacturer ID
      const buffer = Buffer.from(data, 'base64');
      const hex = buffer.toString('hex');
      
      if (hex.toLowerCase().startsWith(manufacturerId.toLowerCase())) {
        return hex;
      }
    } catch (error) {
      console.error('Error parsing manufacturer data:', error);
    }
    return null;
  }

  private isAirTag(manufacturerData: string, serviceUUIDs: string[]): boolean {
    // AirTag identification patterns:
    // 1. Apple manufacturer data with specific patterns
    // 2. Find My service UUIDs
    // 3. Specific advertisement data structures
    
    const findMyServiceUUID = '7DFC9000-7D1C-4951-86AA-8D9728F8D66C';
    const hasAppleData = manufacturerData.startsWith('004c');
    const hasFindMyService = serviceUUIDs.some(uuid => 
      uuid.toUpperCase().includes(findMyServiceUUID.toUpperCase())
    );
    
    // AirTags often have specific data patterns in manufacturer data
    const hasAirTagPattern = manufacturerData.length >= 8 && 
                            manufacturerData.substring(4, 6) === '12';
    
    return hasAppleData && (hasFindMyService || hasAirTagPattern);
  }

  private isIPhone(manufacturerData: string, serviceUUIDs: string[], name: string): boolean {
    // iPhone identification patterns:
    // 1. Handoff/Continuity service UUIDs
    // 2. AirDrop service UUIDs
    // 3. Apple manufacturer data with iPhone patterns
    
    const handoffServiceUUID = 'D0611E78-BBB4-4591-A5F8-487910AE4366';
    const airdropServiceUUID = '7BA94D80-5DAD-4544-8CF4-370E39BB1CA0';
    
    const hasHandoff = serviceUUIDs.some(uuid => 
      uuid.toUpperCase().includes(handoffServiceUUID.toUpperCase())
    );
    const hasAirDrop = serviceUUIDs.some(uuid => 
      uuid.toUpperCase().includes(airdropServiceUUID.toUpperCase())
    );
    
    const nameIndicatesIPhone = name.includes('iphone') || name.includes('ios');
    
    return hasHandoff || hasAirDrop || nameIndicatesIPhone;
  }

  private isAudioDevice(serviceUUIDs: string[], name: string): boolean {
    // Audio device service UUIDs
    const audioServiceUUIDs = [
      '0000110B-0000-1000-8000-00805F9B34FB', // Audio Sink
      '0000110A-0000-1000-8000-00805F9B34FB', // Audio Source
      '0000111E-0000-1000-8000-00805F9B34FB', // Hands-Free
    ];
    
    const hasAudioService = serviceUUIDs.some(uuid =>
      audioServiceUUIDs.some(audioUUID => 
        uuid.toUpperCase().includes(audioUUID.toUpperCase())
      )
    );
    
    const nameIndicatesAudio = name.includes('airpods') || 
                              name.includes('headphones') || 
                              name.includes('speaker') ||
                              name.includes('beats');
    
    return hasAudioService || nameIndicatesAudio;
  }

  private isAndroidDevice(manufacturerData: string | null, name: string): boolean {
    if (!manufacturerData) return false;
    
    // Common Android manufacturer IDs
    const androidManufacturerIds = [
      '00e0', // Google
      '0075', // Samsung
      '001d', // Qualcomm
    ];
    
    const hasAndroidManufacturer = androidManufacturerIds.some(id =>
      manufacturerData.toLowerCase().startsWith(id)
    );
    
    const nameIndicatesAndroid = name.includes('android') || 
                                name.includes('pixel') ||
                                name.includes('samsung');
    
    return hasAndroidManufacturer || nameIndicatesAndroid;
  }

  private extractBatteryLevel(device: Device): number | undefined {
    // Extract battery level from manufacturer data or service data
    // This is device-specific and may not always be available
    try {
      if (device.manufacturerData) {
        const buffer = Buffer.from(device.manufacturerData, 'base64');
        // Battery level extraction logic would go here
        // Different devices encode battery differently
      }
    } catch (error) {
      console.error('Error extracting battery level:', error);
    }
    return undefined;
  }

  private extractManufacturer(device: Device): string {
    if (!device.manufacturerData) return 'Unknown';
    
    try {
      const buffer = Buffer.from(device.manufacturerData, 'base64');
      const manufacturerId = buffer.readUInt16LE(0);
      
      // Map manufacturer IDs to names
      const manufacturerMap: { [key: number]: string } = {
        0x004C: 'Apple',
        0x00E0: 'Google',
        0x0075: 'Samsung',
        0x001D: 'Qualcomm',
        0x000F: 'Broadcom',
      };
      
      return manufacturerMap[manufacturerId] || 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  private calculateDistance(rssi: number, txPower: number = -59): number {
    if (rssi === 0) return -1;
    
    // More accurate distance calculation
    const ratio = (txPower - rssi) / 20.0;
    const distance = Math.pow(10, ratio);
    
    // Apply environmental factors and smoothing
    return Math.max(0.1, Math.min(100, distance));
  }

  async connectToDevice(deviceId: string): Promise<boolean> {
    try {
      const device = await this.bleManager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      
      console.log(`Connected to device: ${device.name}`);
      return true;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }

  async disconnectFromDevice(deviceId: string): Promise<void> {
    try {
      await this.bleManager.cancelDeviceConnection(deviceId);
      console.log(`Disconnected from device: ${deviceId}`);
    } catch (error) {
      console.error('Disconnection failed:', error);
    }
  }

  async getConnectedDevices(): Promise<Device[]> {
    return await this.bleManager.connectedDevices([]);
  }

  // Save/load favorites
  async saveFavorites(favorites: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem('ble_favorites', JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  }

  async loadFavorites(): Promise<string[]> {
    try {
      const favorites = await AsyncStorage.getItem('ble_favorites');
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error('Failed to load favorites:', error);
      return [];
    }
  }

  destroy() {
    this.stopScanning();
    this.bleManager.destroy();
  }
}