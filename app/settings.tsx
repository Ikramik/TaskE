import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a2d8e", "#142269"]}
        style={styles.headerGradient}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#ffffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.settingsList}>
          {/* Notifications */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={24} color="#1a2d8e" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Receive task reminders</Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#f0f0f0', true: '#1a2d8e' }}
            />
          </View>

          {/* Cloud Sync */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="cloud-outline" size={24} color="#1a2d8e" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Cloud Sync</Text>
                <Text style={styles.settingDescription}>Sync tasks across devices</Text>
              </View>
            </View>
            <Switch
              value={syncEnabled}
              onValueChange={setSyncEnabled}
              trackColor={{ false: '#f0f0f0', true: '#1a2d8e' }}
            />
          </View>

          {/* App Theme */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="color-palette-outline" size={24} color="#1a2d8e" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingDescription}>Switch to dark theme</Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#f0f0f0', true: '#1a2d8e' }}
            />
          </View>

          {/* Language */}
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="language-outline" size={24} color="#1a2d8e" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Language</Text>
                <Text style={styles.settingDescription}>English</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* About */}
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle-outline" size={24} color="#1a2d8e" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>About TaskE</Text>
                <Text style={styles.settingDescription}>Version 1.0.0</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerGradient: {
    height: 120,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    marginTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffffff",
  },
  placeholder: {
    width: 28,
  },
  settingsList: {
    flex: 1,
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});