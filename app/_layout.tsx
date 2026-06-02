// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../context/authContext";
import { migrateTaskData } from '../utils/storage';

migrateTaskData();

export default function Layout() {
  return (
    <AuthProvider>
      <>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "white" },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" /> {/* Splash screen */}
          <Stack.Screen name="auth" />
          <Stack.Screen name="home" />   {/* Home screen */}
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="modal" />
          <Stack.Screen name="calendar" />
          <Stack.Screen name="chatbot" />
          <Stack.Screen name="tasks" />
          <Stack.Screen name="tracker" />
        </Stack>
      </>
    </AuthProvider>
  );
}