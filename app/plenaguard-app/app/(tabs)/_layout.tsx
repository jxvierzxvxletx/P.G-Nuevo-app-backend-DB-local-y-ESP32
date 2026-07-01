import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={28}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Historial",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              size={28}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Config",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={28}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}