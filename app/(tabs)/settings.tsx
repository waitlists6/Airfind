import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  Bell, 
  Shield, 
  Bluetooth,
  MapPin,
  Battery,
  Info,
  ChevronRight,
  Smartphone,
} from 'lucide-react-native';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'navigation' | 'info';
  icon: React.ReactNode;
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [backgroundScanning, setBackgroundScanning] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [autoConnect, setAutoConnect] = useState(false);

  const settings: SettingItem[] = [
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Get alerts when devices are found or lost',
      type: 'toggle',
      icon: <Bell size={20} color="#007AFF" />,
      value: notifications,
      onToggle: setNotifications,
    },
    {
      id: 'background',
      title: 'Background Scanning',
      subtitle: 'Continue scanning when app is in background',
      type: 'toggle',
      icon: <Bluetooth size={20} color="#007AFF" />,
      value: backgroundScanning,
      onToggle: setBackgroundScanning,
    },
    {
      id: 'location',
      title: 'Location Services',
      subtitle: 'Required for device mapping and distance estimation',
      type: 'toggle',
      icon: <MapPin size={20} color="#007AFF" />,
      value: locationServices,
      onToggle: setLocationServices,
    },
    {
      id: 'autoconnect',
      title: 'Auto-Connect',
      subtitle: 'Automatically connect to known devices',
      type: 'toggle',
      icon: <Smartphone size={20} color="#007AFF" />,
      value: autoConnect,
      onToggle: setAutoConnect,
    },
    {
      id: 'permissions',
      title: 'App Permissions',
      subtitle: 'Manage Bluetooth and location permissions',
      type: 'navigation',
      icon: <Shield size={20} color="#007AFF" />,
      onPress: () => {
        Alert.alert(
          'App Permissions',
          'This would open iOS Settings for the app to manage permissions.'
        );
      },
    },
    {
      id: 'battery',
      title: 'Battery Usage',
      subtitle: 'View app battery consumption details',
      type: 'navigation',
      icon: <Battery size={20} color="#007AFF" />,
      onPress: () => {
        Alert.alert(
          'Battery Usage',
          'This would show detailed battery usage information.'
        );
      },
    },
    {
      id: 'about',
      title: 'About BLE Scanner',
      subtitle: 'Version 1.0.0',
      type: 'navigation',
      icon: <Info size={20} color="#007AFF" />,
      onPress: () => {
        Alert.alert(
          'About BLE Scanner',
          'Advanced Bluetooth Low Energy scanner for finding and managing nearby devices.\n\nVersion 1.0.0\nBuild 2024.1'
        );
      },
    },
  ];

  const renderSettingItem = (setting: SettingItem) => {
    return (
      <View key={setting.id} style={styles.settingCard}>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={setting.onPress}
          disabled={setting.type === 'toggle'}
        >
          <View style={styles.settingContent}>
            <View style={styles.settingIcon}>
              {setting.icon}
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>{setting.title}</Text>
              {setting.subtitle && (
                <Text style={styles.settingSubtitle}>{setting.subtitle}</Text>
              )}
            </View>
          </View>
          
          {setting.type === 'toggle' ? (
            <Switch
              value={setting.value}
              onValueChange={setting.onToggle}
              trackColor={{ false: '#C7C7CC', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          ) : (
            <ChevronRight size={16} color="#C7C7CC" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>
          Configure scanning and device preferences
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Scanning Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scanning</Text>
          {settings.slice(0, 4).map(renderSettingItem)}
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          {settings.slice(4).map(renderSettingItem)}
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <Shield size={16} color="#8E8E93" />
          <Text style={styles.privacyText}>
            Your privacy is important. Device scanning data is processed locally 
            and never shared with third parties.
          </Text>
        </View>
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
  content: {
    flex: 1,
  },
  section: {
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 24,
  },
  privacyText: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
});