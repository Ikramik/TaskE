// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function Layout() {
  return (
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
        <Stack.Screen name="home" />   {/* Home screen */}
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="modal" />
        
        {/* Group routes */}
        <Stack.Screen name="calendar" />
        <Stack.Screen name="chatbot" />
        <Stack.Screen name="tasks" />
        <Stack.Screen name="tracker" />
      </Stack>
    </>
  );
}