import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/colors";
import ProfileSetupScreen from "../screens/ProfileSetupScreen";

export default function GlobalProfileGate() {
  const [revisandoPerfil, setRevisandoPerfil] = useState(true);
  const [tienePerfil, setTienePerfil] = useState(false);

  async function revisarPerfil() {
    try {
      const pacienteGuardado = await AsyncStorage.getItem("pacienteId");
      setTienePerfil(!!pacienteGuardado);
    } catch (error) {
      console.log("Error al revisar perfil global:", error);
      setTienePerfil(false);
    } finally {
      setRevisandoPerfil(false);
    }
  }

  useEffect(() => {
    revisarPerfil();

    const intervalo = setInterval(() => {
      revisarPerfil();
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  if (revisandoPerfil) {
    return (
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Revisando perfil...</Text>
      </View>
    );
  }

  if (tienePerfil) return null;

  return (
    <View style={styles.overlay}>
      <ProfileSetupScreen
        onPerfilCreado={() => {
          setTienePerfil(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textMuted,
    marginTop: 12,
    fontSize: 16,
    textAlign: "center",
  },
});