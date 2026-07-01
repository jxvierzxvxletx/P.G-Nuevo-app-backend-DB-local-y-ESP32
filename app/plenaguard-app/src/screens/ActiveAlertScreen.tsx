import { Audio } from "expo-av";
import { useEffect, useRef } from "react";
import { Linking, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { colors } from "../constants/colors";

type Props = {
  alerta: any;
  onCancelar: () => void;
  onAtendida: () => void;
};

export default function ActiveAlertScreen({ alerta, onCancelar, onAtendida }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);

  async function detenerAlarmaLocal() {
  try {
    Vibration.cancel();

    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  } catch (error) {
    console.log("Error al detener alarma:", error);
  }
}

  async function llamarAmbulancia() {
  try {
    await detenerAlarmaLocal();
    await Linking.openURL("tel:131");
  } catch (error) {
    console.log("No se pudo abrir el marcador:", error);
  }
}

  useEffect(() => {
    let vibrationInterval: ReturnType<typeof setInterval>;

    async function iniciarAlarma() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          staysActiveInBackground: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/alert.mp3"),
          {
            shouldPlay: true,
            isLooping: true,
            volume: 1.0,
          }
        );

        soundRef.current = sound;

        vibrationInterval = setInterval(() => {
          Vibration.vibrate(800);
        }, 1200);
      } catch (error) {
        console.log("Error al iniciar sonido de alerta:", error);
      }
    }

    iniciarAlarma();

    return () => {
      clearInterval(vibrationInterval);
      Vibration.cancel();

      if (soundRef.current) {
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  async function detenerYCancelar() {
  await detenerAlarmaLocal();
  onCancelar();
}

async function detenerYAtender() {
  await detenerAlarmaLocal();
  onAtendida();
}

  const titulo = obtenerTitulo(alerta.tipo_alerta);
  const icono = obtenerIcono(alerta.tipo_alerta);

  return (
  <View style={styles.container}>
    <Text style={styles.header}>ALERTA</Text>

    <Text style={styles.label}>TIPO DE ALERTA:</Text>
    <Text style={styles.title}>{titulo}</Text>

    <View style={styles.iconCircle}>
      <Text style={styles.icon}>{icono}</Text>
    </View>

    <View style={styles.infoRow}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>MODO DE USO:</Text>
        <Text style={styles.infoValue}>
          {alerta.modo_uso ? alerta.modo_uso.toUpperCase() : "NORMAL"}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>ESTADO:</Text>
        <Text style={styles.infoValue}>ACTIVA</Text>
      </View>
    </View>

    <View style={styles.heartCard}>
      <Text style={styles.heartValue}>{alerta.frecuencia_cardiaca ?? "--"}</Text>
      <Text style={styles.heartUnit}>LPM</Text>
      <Text style={styles.heartLabel}>ESTADO{"\n"}ÚLTIMA PULSACIÓN</Text>
    </View>

    <Pressable style={styles.callButton} onPress={llamarAmbulancia}>
      <Text style={styles.callText}>LLAMAR A AMBULANCIA</Text>
      <Text style={styles.callNumber}>131</Text>
    </Pressable>

    <View style={styles.actionRow}>
      <Pressable style={styles.attendedButton} onPress={detenerYAtender}>
        <Text style={styles.attendedText}>ATENDIDA</Text>
      </Pressable>

      <Pressable style={styles.cancelButton} onPress={detenerYCancelar}>
        <Text style={styles.cancelText}>FALSA ALARMA</Text>
      </Pressable>
    </View>
  </View>
);
}

function obtenerTitulo(tipo: string) {
  if (tipo === "caida") return "CAÍDA DETECTADA";
  if (tipo === "bradicardia") return "BRADICARDIA";
  if (tipo === "taquicardia") return "TAQUICARDIA";

  return "ALERTA DETECTADA";
}

function obtenerIcono(tipo: string) {
  if (tipo === "caida") return "⚠";
  return "♥";
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: "#070707",
  paddingHorizontal: 22,
  paddingTop: 62,
  alignItems: "center",
  borderColor: "#FF1E3C",
  borderWidth: 4,
},

header: {
  color: colors.text,
  fontSize: 24,
  letterSpacing: 2,
  marginBottom: 28,
},

label: {
  color: colors.textMuted,
  fontSize: 18,
  letterSpacing: 1,
},

title: {
  color: colors.danger,
  fontSize: 32,
  fontWeight: "bold",
  textAlign: "center",
  letterSpacing: 2,
  marginTop: 8,
  marginBottom: 24,
},

iconCircle: {
  width: 155,
  height: 155,
  borderRadius: 78,
  backgroundColor: "rgba(239, 68, 68, 0.18)",
  borderColor: colors.danger,
  borderWidth: 2,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 26,
  shadowColor: colors.danger,
  shadowOpacity: 0.8,
  shadowRadius: 20,
},

icon: {
  fontSize: 72,
  color: colors.danger,
},

infoRow: {
  width: "100%",
  flexDirection: "row",
  gap: 10,
  marginBottom: 12,
},

infoCard: {
  flex: 1,
  backgroundColor: "rgba(255,255,255,0.06)",
  borderColor: "rgba(255,255,255,0.18)",
  borderWidth: 1,
  borderRadius: 10,
  padding: 12,
},

heartCard: {
  width: "100%",
  backgroundColor: "rgba(255,255,255,0.06)",
  borderColor: "rgba(255,255,255,0.18)",
  borderWidth: 1,
  borderRadius: 12,
  paddingVertical: 18,
  paddingHorizontal: 20,
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 18,
},

heartValue: {
  color: colors.text,
  fontSize: 48,
  fontWeight: "bold",
  marginRight: 8,
},

heartUnit: {
  color: colors.text,
  fontSize: 20,
  marginRight: 20,
},

heartLabel: {
  color: colors.textMuted,
  fontSize: 15,
  flex: 1,
},

callButton: {
  width: "100%",
  backgroundColor: colors.danger,
  borderRadius: 16,
  paddingVertical: 14,
  alignItems: "center",
  shadowColor: colors.danger,
  shadowOpacity: 0.8,
  shadowRadius: 14,
  marginBottom: 14,
},

callText: {
  color: colors.text,
  fontSize: 20,
  fontWeight: "bold",
  letterSpacing: 1,
},

callNumber: {
  color: colors.text,
  fontSize: 30,
  fontWeight: "bold",
},

actionRow: {
  width: "100%",
  flexDirection: "row",
  gap: 10,
},

attendedButton: {
  flex: 1,
  backgroundColor: "rgba(34, 197, 94, 0.22)",
  borderColor: colors.success,
  borderWidth: 1,
  borderRadius: 10,
  paddingVertical: 13,
  alignItems: "center",
},

attendedText: {
  color: colors.success,
  fontSize: 14,
  fontWeight: "bold",
},

cancelButton: {
  flex: 1,
  backgroundColor: "rgba(255,255,255,0.16)",
  borderColor: "rgba(255,255,255,0.25)",
  borderWidth: 1,
  borderRadius: 10,
  paddingVertical: 13,
  alignItems: "center",
},

cancelText: {
  color: colors.textMuted,
  fontSize: 14,
  fontWeight: "bold",
},
infoLabel: {
  color: colors.textMuted,
  fontSize: 12,
},

infoValue: {
  color: colors.text,
  fontSize: 14,
  fontWeight: "bold",
  marginTop: 3,
},
});