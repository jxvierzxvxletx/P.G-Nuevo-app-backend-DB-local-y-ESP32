import { View } from "react-native";
import GlobalAlertLayer from "../src/components/GlobalAlertLayer";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import GlobalProfileGate from "../src/components/GlobalProfileGate";

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
  <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
    <View style={{ flex: 1 }}>
  <Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

  <Stack.Screen
    name="contacto/index"
    options={{
      title: "Crear contacto",
      headerStyle: {
        backgroundColor: "#0B0B0F",
      },
      headerTintColor: "#FFFFFF",
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 20,
      },
      headerShadowVisible: false,
    }}
  />

  <Stack.Screen
    name="contacto/[id]"
    options={{
      title: "Editar contacto",
      headerStyle: {
        backgroundColor: "#0B0B0F",
      },
      headerTintColor: "#FFFFFF",
      headerTitleStyle: {
        fontWeight: "bold",
        fontSize: 20,
      },
      headerShadowVisible: false,
    }}
  />

  <Stack.Screen
  name="alerta/[id]"
  options={{
    title: "Detalle de alerta",
    headerStyle: {
      backgroundColor: "#0B0B0F",
    },
    headerTintColor: "#FFFFFF",
    headerTitleStyle: {
      fontWeight: "bold",
      fontSize: 20,
    },
    headerShadowVisible: false,
  }}
/>

  <Stack.Screen
    name="modal"
    options={{
      presentation: "modal",
      title: "Modal",
    }}
  />

<Stack.Screen
  name="reportes/index"
  options={{
    title: "Registro cardíaco",
    headerStyle: {
      backgroundColor: "#0B0B0F",
    },
    headerTintColor: "#FFFFFF",
    headerTitleStyle: {
      fontWeight: "bold",
      fontSize: 20,
    },
    headerShadowVisible: false,
  }}
/>

</Stack>

  <GlobalAlertLayer />
  <GlobalProfileGate />
</View>

    <StatusBar style="auto" />
  </ThemeProvider>
);
}
