import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword
} from 'firebase/auth';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert, Platform, ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, FirebaseService } from '../services/firebase';

// Initialize Google sign-in (important for web)
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await FirebaseService.createUserProfile(user.uid, user.email);

        Alert.alert('Success', 'Account created successfully!');
        router.replace('/profile');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        Alert.alert('Success', 'Signed in successfully!');
        router.replace('/profile');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let errorMessage = 'Authentication failed';

      if (error.code === 'auth/email-already-in-use') errorMessage = 'This email is already registered';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address';
      else if (error.code === 'auth/weak-password') errorMessage = 'Password is too weak';
      else if (error.code === 'auth/user-not-found') errorMessage = 'No account found with this email';
      else if (error.code === 'auth/wrong-password') errorMessage = 'Incorrect password';
      else if (error.code === 'auth/network-request-failed') errorMessage = 'Network error. Please check your connection';
      else if (error.code === 'auth/too-many-requests') errorMessage = 'Too many attempts. Please try again later';
      else if (error.code === 'auth/user-disabled') errorMessage = 'This account has been disabled';

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === 'web') {
        await FirebaseService.signInWithGoogleWeb();
        Alert.alert('Success', 'Signed in with Google successfully!');
        router.replace('/home');
      } else {
        // For mobile, show informative message
        Alert.alert(
          'Development Build Required',
          'Google Sign-In requires a development build in Expo. ' +
          'Please build the app using `expo run:android` or use email/password sign-in.',
          [
            { 
              text: 'Learn More', 
              onPress: () => {
                if (Platform.OS === 'web') {
                  window.open('https://docs.expo.dev/develop/development-builds/introduction/', '_blank');
                }
              }
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      let errorMessage = 'Google sign-in failed';
      
      if (error.message.includes('cancelled')) {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.message.includes('popup-blocked')) {
        errorMessage = 'Popup was blocked. Please allow popups for this site';
      } else if (error.message.includes('Play Services')) {
        errorMessage = 'Google Play Services not available';
      } else if (error.message.includes('Development Build')) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      Alert.alert(
        'Password Reset',
        'A password reset link has been sent to your email. Please check your inbox.',
        [
          {
            text: 'OK',
            onPress: () => setShowForgotPassword(false)
          }
        ]
      );
      setResetEmail('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send reset email';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if Google is available (web only)
  const isGoogleAvailable = Platform.OS === 'web';

  // If showing forgot password modal
  if (showForgotPassword) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#1a2d8e", "#142269"]}
          style={styles.headerGradient}
        />

        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowForgotPassword(false)}>
              <Ionicons name="chevron-back" size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reset Password</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.forgotPasswordContainer}
          >
            <View style={styles.formContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed-outline" size={64} color="#1a2d8e" />
              </View>

              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your registered email"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.authButton, isLoading && styles.buttonDisabled]}
                onPress={handleForgotPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.authButtonText}>
                    Send Reset Link
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleAuth}
                onPress={() => setShowForgotPassword(false)}
                disabled={isLoading}
              >
                <Ionicons name="arrow-back" size={16} color="#1a2d8e" />
                <Text style={[styles.toggleAuthText, { marginLeft: 8 }]}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a2d8e", "#142269"]}
        style={styles.headerGradient}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Sign up to sync your tasks across devices'
                : 'Sign in to access your tasks'
              }
            </Text>

            {/* Email & Password Inputs */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            {/* Forgot Password Link (only in sign-in mode) */}
            {!isSignUp && (
              <TouchableOpacity
                style={styles.forgotPasswordLink}
                onPress={() => setShowForgotPassword(true)}
                disabled={isLoading}
              >
                <Text style={styles.forgotPasswordText}>
                  Forgot your password?
                </Text>
              </TouchableOpacity>
            )}

            {/* Primary Auth Button */}
            <TouchableOpacity
              style={[styles.authButton, isLoading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.authButtonText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In Button */}
            <TouchableOpacity
              style={[
                styles.googleButton, 
                isLoading && styles.buttonDisabled,
                !isGoogleAvailable && styles.buttonDisabled
              ]}
              onPress={handleGoogleSignIn}
              disabled={isLoading || !isGoogleAvailable}
            >
              <View style={styles.googleButtonContent}>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.googleButtonText}>
                  {isGoogleAvailable ? 'Sign in with Google' : 'Google '}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Toggle between Sign In and Sign Up */}
            <TouchableOpacity
              style={styles.toggleAuth}
              onPress={() => setIsSignUp(!isSignUp)}
              disabled={isLoading}
            >
              <Text style={styles.toggleAuthText}>
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Sign Up"
                }
              </Text>
            </TouchableOpacity>

            {/* Terms & Privacy (for sign up) */}
            {isSignUp && (
              <Text style={styles.termsText}>
                By signing up, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>{' '}
                and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            )}
          </View>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  placeholder: {
    width: 28,
  },
  scrollContent: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
    paddingTop: 40,
  },
  forgotPasswordContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#1a2d8e",
    fontWeight: "500",
  },
  authButton: {
    backgroundColor: "#1a2d8e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#666',
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
  },
  toggleAuth: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 16,
  },
  toggleAuthText: {
    fontSize: 14,
    color: "#1a2d8e",
    fontWeight: "500",
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
  termsLink: {
    color: '#1a2d8e',
    fontWeight: '500',
  },
});