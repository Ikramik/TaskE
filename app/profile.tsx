import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { signOut, updateProfile, User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth } from '../services/firebase';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1));
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  
  // UI states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace('/sign-in');
      return;
    }
    
    setUser(currentUser);
    setDisplayName(currentUser.displayName || '');
    
    // Load additional user data from storage (you can implement this)
    loadUserData(currentUser.uid);
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      // Load additional user data from AsyncStorage or your database
      // Example:
      // const userData = await AsyncStorage.getItem(`user_${userId}`);
      // if (userData) {
      //   const data = JSON.parse(userData);
      //   if (data.birthDate) setBirthDate(new Date(data.birthDate));
      //   if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
      //   if (data.bio) setBio(data.bio);
      // }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const saveUserData = async (userId: string) => {
    try {
      const userData = {
        birthDate: birthDate.toISOString(),
        phoneNumber,
        bio,
        notificationEnabled,
      };
      // Save to AsyncStorage or your database
      // await AsyncStorage.setItem(`user_${userId}`, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Update Firebase profile (display name)
      if (displayName !== user.displayName) {
        await updateProfile(user, {
          displayName: displayName.trim() || null,
        });
      }
      
      // Save additional user data
      await saveUserData(user.uid);
      
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset form to original values
    if (user) {
      setDisplayName(user.displayName || '');
      // Reload other saved data if needed
      loadUserData(user.uid);
    }
    setEditMode(false);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              Alert.alert('Success', 'Signed out successfully!');
              router.replace('/sign-in');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const calculateAge = () => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a2d8e" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={["#1a2d8e", "#142269"]}
        style={styles.header}
      />
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          
          {editMode ? (
            <TouchableOpacity onPress={handleCancelEdit}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setEditMode(true)}>
              <Ionicons name="create-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person-circle" size={100} color="#1a2d8e" />
            </View>
            {editMode && (
              <TouchableOpacity style={styles.cameraButton}>
                <Ionicons name="camera-outline" size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>

          {/* Display Name */}
          {editMode ? (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                maxLength={50}
              />
            </View>
          ) : (
            <Text style={styles.name}>
              {displayName || 'No name set'}
            </Text>
          )}

          <Text style={styles.email}>{user.email}</Text>

          {/* User Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.statText}>
                Joined: {new Date(user.metadata.creationTime!).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.statText}>
                Last login: {new Date(user.metadata.lastSignInTime!).toLocaleDateString()}
              </Text>
            </View>
            
            {!editMode && displayName && (
              <View style={styles.statItem}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <Text style={styles.statText}>
                  {displayName.split(' ')[0]} • {calculateAge()} years
                </Text>
              </View>
            )}
          </View>

          {/* Bio Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color="#1a2d8e" />
              <Text style={styles.sectionTitle}>Bio</Text>
            </View>
            {editMode ? (
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                multiline
                numberOfLines={4}
                maxLength={200}
              />
            ) : (
              <Text style={styles.bioText}>
                {bio || 'No bio added yet'}
              </Text>
            )}
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#1a2d8e" />
              <Text style={styles.sectionTitle}>Personal Info</Text>
            </View>

            {/* Birth Date */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Birth Date</Text>
              {editMode ? (
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {birthDate.toLocaleDateString()}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                </TouchableOpacity>
              ) : (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>
                    {birthDate.toLocaleDateString()} • {calculateAge()} years
                  </Text>
                </View>
              )}
            </View>

            {/* Phone Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              {editMode ? (
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="+1 (123) 456-7890"
                  keyboardType="phone-pad"
                  maxLength={20}
                />
              ) : (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>
                    {phoneNumber || 'No phone number added'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={20} color="#1a2d8e" />
              <Text style={styles.sectionTitle}>Preferences</Text>
            </View>
            
            <TouchableOpacity
              style={styles.preferenceItem}
              onPress={() => setNotificationEnabled(!notificationEnabled)}
              disabled={!editMode}
            >
              <View style={styles.preferenceLeft}>
                <Ionicons 
                  name={notificationEnabled ? "notifications" : "notifications-off"} 
                  size={20} 
                  color="#1a2d8e" 
                />
                <Text style={styles.preferenceText}>Notifications</Text>
              </View>
              {editMode && (
                <Ionicons 
                  name={notificationEnabled ? "toggle" : "toggle-outline"} 
                  size={24} 
                  color={notificationEnabled ? "#1a2d8e" : "#ccc"} 
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Action Buttons - Save button appears on top when in edit mode */}
          <View style={styles.actionsContainer}>
            {editMode ? (
              <>
                {/* Save Button - Appears on top */}
                <TouchableOpacity 
                  style={[styles.editButton, styles.saveButton]} 
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                      <Text style={[styles.editButtonText, styles.saveButtonText]}>
                        Save Changes
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Cancel Button - Appears below Save */}
                <TouchableOpacity 
                  style={[styles.editButton, styles.cancelButton]} 
                  onPress={handleCancelEdit}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#1a2d8e" />
                  <Text style={[styles.editButtonText, styles.cancelButtonText]}>
                    Cancel Editing
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Edit Profile Button */}
                <TouchableOpacity style={styles.editButton} onPress={() => setEditMode(true)}>
                  <Ionicons name="create-outline" size={20} color="#1a2d8e" />
                  <Text style={styles.editButtonText}>
                    Edit Profile
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Sign Out Button - Always visible */}
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color="#F44336" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Birth Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={birthDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setBirthDate(selectedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { height: 120, position: 'absolute', top: 0, left: 0, right: 0 },
  content: { flex: 1, marginTop: 60 },
  
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#1a2d8e',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  statsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  bioText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginLeft: 10,
  },
  
  actionsContainer: {
    marginTop: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#1a2d8e',
    marginBottom: 8,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#ffffff',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 12,
    padding: 16,
  },
  signOutText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});