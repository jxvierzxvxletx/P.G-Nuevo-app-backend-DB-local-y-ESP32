import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getContactosPaciente,
  getInicioPaciente,
} from "../api/plenaguardApi";
import { colors } from "../constants/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { guardarCache, obtenerCache } from "../utils/localCache";
import { timeout } from "../utils/timeout";
import { subscribeToAppRefresh } from "../utils/appRefresh";

export default function HomeScreen() {
  const [pacienteId, setPacienteId] = useState<number | null>(null);
  const [revisandoPerfil, setRevisandoPerfil] = useState(true);
  const router = useRouter();

  const giroAnim = useRef(new Animated.Value(0)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  const [inicio, setInicio] = useState<any>(null);
  const [contactos, setContactos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

    


useEffect(() => {
  if (!inicio) return;

  const limiteBajo = inicio.modo_uso === "deportivo" ? 60 : 50;
  const limiteAlto = inicio.modo_uso === "deportivo" ? 120 : 100;

  const estaEnRiesgo =
    inicio.frecuencia_cardiaca < limiteBajo ||
    inicio.frecuencia_cardiaca > limiteAlto;

  Animated.timing(colorAnim, {
    toValue: estaEnRiesgo ? 1 : 0,
    duration: 700,
    useNativeDriver: true,
  }).start();
}, [inicio?.frecuencia_cardiaca, inicio?.modo_uso]);

useFocusEffect(
  useCallback(() => {
    const animacion = Animated.loop(
      Animated.timing(giroAnim, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animacion.start();

    return () => {
      animacion.stop();
    };
  }, [])
);

const cargarInicio = useCallback(
  async (idPaciente?: number) => {
    const id = idPaciente ?? pacienteId;

    if (!id) {
      setCargando(false);
      return;
    }

    let teniaCache = false;

    try {
      const cacheKey = `inicio_paciente_${id}`;

      const cache = await obtenerCache(cacheKey);

      if (cache?.data) {
        teniaCache = true;

        setInicio(cache.data.inicio);
        setContactos(cache.data.contactos || []);
        setCargando(false);
        setError("");
      }

      const datosBackend = await Promise.race([
        cargarInicioDesdeBackend(id),
        timeout(8000),
      ]);

      setInicio((datosBackend as any).inicio);
      setContactos((datosBackend as any).contactos || []);

      await guardarCache(cacheKey, datosBackend);

      setError("");
    } catch (error) {
      console.log("Error al cargar inicio:", error);

      if (teniaCache) {
        setError(
          "No se pudo actualizar inicio. Mostrando últimos datos guardados."
        );
      } else {
        setError("No se pudo cargar el inicio");
      }
    } finally {
      setCargando(false);
    }
  },
  [pacienteId]
);

async function cargarInicioDesdeBackend(idPaciente: number) {
  const dataInicio = await getInicioPaciente(idPaciente);
  const dataContactos = await getContactosPaciente(idPaciente);

  return {
    inicio: dataInicio,
    contactos: dataContactos,
  };
}

useFocusEffect(
  useCallback(() => {
    let activo = true;

    async function revisarPerfil() {
      try {
        setRevisandoPerfil(true);
        setCargando(true);

        const pacienteGuardado = await AsyncStorage.getItem("pacienteId");

        if (!activo) return;

        if (!pacienteGuardado) {
          setPacienteId(null);
          setInicio(null);
          setContactos([]);
          setCargando(false);
          return;
        }

        const id = Number(pacienteGuardado);

        setPacienteId(id);

        await cargarInicio(id);
      } catch (error) {
        console.log("Error revisando perfil:", error);
      } finally {
        if (activo) {
          setRevisandoPerfil(false);
        }
      }
    }

    revisarPerfil();

    return () => {
      activo = false;
    };
  }, [cargarInicio])
);

useEffect(() => {
  if (!pacienteId) return;

  const intervalo = setInterval(() => {
    cargarInicio(pacienteId);
  }, 5 * 1000);

  return () => clearInterval(intervalo);
}, [pacienteId, cargarInicio]);

useEffect(() => {
  const unsubscribe = subscribeToAppRefresh(() => {
    if (pacienteId) {
      cargarInicio(pacienteId);
    }
  });

  return unsubscribe;
}, [pacienteId, cargarInicio]);


async function llamarEmergencia() {
  try {
    await Linking.openURL("tel:131");
  } catch (error) {
    console.log("No se pudo abrir el marcador:", error);
  }
}

  const rotacionCirculo = giroAnim.interpolate({
  inputRange: [0, 1],
  outputRange: ["0deg", "360deg"],
});

const colorCirculo = colorAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [colors.success, colors.danger],
});


  if (revisandoPerfil) {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Revisando perfil...</Text>
    </View>
  );
}

if (!pacienteId) {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Cargando perfil...</Text>
    </View>
  );
}

if (cargando) {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Cargando datos...</Text>
    </View>
  );
}

if (error && !inicio) {
  return (
    <View style={styles.centerContainer}>
      <Text style={styles.errorTitle}>No se pudo cargar la información</Text>

      <Text style={styles.errorText}>
        Revisa tu conexión e intenta nuevamente.
      </Text>

      <Pressable
        style={styles.retryButton}
        onPress={() => {
          setCargando(true);
          setError("");
          if (pacienteId) {
            cargarInicio(pacienteId);
          }
        }}
      >
        <Text style={styles.retryButtonText}>REINTENTAR</Text>
      </Pressable>
    </View>
  );
}

  return (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
  >
    <Text style={styles.logo}>
      Plena<Text style={styles.logoAccent}>Guard</Text>
    </Text>

    {error !== "" && inicio && (
  <View style={styles.warningBox}>
    <Text style={styles.warningText}>
      No se pudo actualizar ahora. Se muestran los últimos datos guardados.
    </Text>
  </View>
)}

    <View style={styles.topRow}>
      <View style={styles.smallCard}>
  <Text style={styles.smallLabel}>Batería del dispositivo</Text>

  <Text
    style={[
      styles.smallValue,
      { color: obtenerColorBateria(inicio.bateria_porcentaje) },
    ]}
  >
    <Text
  style={[
    styles.smallValue,
    {
      color:
        inicio?.bateria_porcentaje !== null &&
        inicio?.bateria_porcentaje !== undefined
          ? obtenerColorBateria(inicio.bateria_porcentaje)
          : colors.textMuted,
    },
  ]}
>
  {inicio?.bateria_porcentaje !== null &&
  inicio?.bateria_porcentaje !== undefined
    ? `${inicio.bateria_porcentaje}%`
    : "Sin datos"}
</Text>
  </Text>
</View>

      <View style={styles.smallCard}>
        <Text style={styles.smallLabel}>WiFi del dispositivo</Text>
        <Text
  style={[
    styles.smallValue,
    {
      color:
        inicio.wifi_estado === "conectado"
          ? colors.success
          : colors.danger,
    },
  ]}
>
  {inicio.wifi_estado === "conectado" ? "Conectado" : "Desconectado"}
</Text>
      </View>
    </View>

    <View style={styles.mainCard}>
  <Text style={styles.patientName}>{inicio.paciente}</Text>

  <View style={styles.heartCircleContainer}>
    <Animated.View
      style={[
        styles.heartRing,
        {
          borderColor: colorCirculo,
          transform: [{ rotate: rotacionCirculo }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.ringDot,
          {
            backgroundColor: colorCirculo,
          },
        ]}
      />
    </Animated.View>

    <View style={styles.heartContent}>
      <Text style={styles.heartValue}>{inicio.frecuencia_cardiaca}</Text>
      <Text style={styles.heartUnit}>LPM</Text>
    </View>
  </View>

  <Text style={styles.statusText}>
    Ritmo Cardíaco:{" "}
    <Text
      style={[
        styles.statusStrong,
        { color: obtenerColorRitmo(inicio.frecuencia_cardiaca, inicio.modo_uso) },
      ]}
    >
      {obtenerEstadoCardiaco(inicio.frecuencia_cardiaca, inicio.modo_uso)}
    </Text>
  </Text>

  <Text style={styles.modeText}>
    Modo de uso:{" "}
    <Text style={styles.modeStrong}>
      {inicio.modo_uso ? inicio.modo_uso.toUpperCase() : "NORMAL"}
    </Text>
  </Text>
</View>

    <Pressable style={styles.emergencyButton} onPress={llamarEmergencia}>
  <Text style={styles.emergencyText}>EMERGENCIA - LLAMAR 131</Text>
</Pressable>

    <Text style={styles.sectionTitle}>Equipo de cuidado</Text>

    <View style={styles.contactsGrid}>
      {contactos.map((contacto) => (
  <Pressable
    key={contacto.id}
style={styles.contactCard}
onPress={() =>
  router.push({
    pathname: "/contacto/[id]",
    params: { id: String(contacto.id) },
  })
}
  >
    <Text style={styles.contactInitial}>
      {contacto.nombre.charAt(0).toUpperCase()}
    </Text>

    <Text style={styles.contactName}>{contacto.nombre}</Text>
    <Text style={styles.contactRelation}>{contacto.relacion}</Text>
  </Pressable>
))}

      <Pressable
  style={styles.addContactCard}
  onPress={() => router.push("/contacto")}
>
  <Text style={styles.addContactText}>+</Text>
</Pressable>
    </View>
  </ScrollView>
);
}

function obtenerLimiteBajo(modoUso: string) {
  return modoUso === "deportivo" ? 60 : 50;
}

function obtenerLimiteAlto(modoUso: string) {
  return modoUso === "deportivo" ? 120 : 100;
}

function obtenerEstadoCardiaco(lpm: number, modoUso: string) {
  const limiteBajo = obtenerLimiteBajo(modoUso);
  const limiteAlto = obtenerLimiteAlto(modoUso);

  if (lpm < limiteBajo) return "Bradicardia";
  if (lpm > limiteAlto) return "Taquicardia";

  return "Normal";
}

function obtenerColorRitmo(lpm: number, modoUso: string) {
  const limiteBajo = obtenerLimiteBajo(modoUso);
  const limiteAlto = obtenerLimiteAlto(modoUso);

  if (lpm < limiteBajo) return colors.danger;
  if (lpm > limiteAlto) return colors.danger;

  return colors.success;
}

function obtenerColorBateria(bateria: number) {
  if (bateria <= 20) return colors.danger;
  if (bateria <= 50) return colors.warning;
  return colors.success;
}

function obtenerEstadoBateria(bateria: number) {
  if (bateria <= 20) return "Baja";
  if (bateria <= 50) return "Media";
  return "Buena";
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: colors.background,
},

content: {
  paddingHorizontal: 20,
  paddingTop: 55,
  paddingBottom: 130,
},

logo: {
  color: colors.text,
  fontSize: 32,
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: 22,
},

topRow: {
  flexDirection: "row",
  gap: 10,
  marginBottom: 12,
},

mainCard: {
  backgroundColor: colors.card,
  borderColor: colors.cardBorder,
  borderWidth: 1,
  borderRadius: 20,
  padding: 22,
  alignItems: "center",
  marginBottom: 14,
},

emergencyButton: {
  backgroundColor: "#3A120B",
  borderColor: colors.warning,
  borderWidth: 1,
  borderRadius: 14,
  paddingVertical: 13,
  alignItems: "center",
  marginBottom: 22,
},

sectionTitle: {
  color: colors.primary,
  textTransform: "uppercase",
  textAlign: "center",
  fontSize: 16,
  fontWeight: "bold",
  marginBottom: 12,
},
  logoAccent: {
    color: colors.primary,
  },
  smallCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  smallLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  smallValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  patientName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 18,
  },
  heartCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 8,
    borderColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heartValue: {
    color: colors.text,
    fontSize: 52,
    fontWeight: "bold",
  },
  heartUnit: {
    color: colors.textMuted,
    fontSize: 18,
    marginTop: -6,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 18,
  },
  statusStrong: {
    color: colors.text,
    fontWeight: "bold",
  },
  emergencyText: {
    color: colors.warning,
    fontSize: 16,
    fontWeight: "bold",
  },
  contactsGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 12,
  },
  contactCard: {
  width: "48%",
  backgroundColor: colors.card,
  borderRadius: 16,
  padding: 16,
  },
  contactInitial: {
  backgroundColor: colors.primaryDark,
  color: colors.text,
  width: 38,
  height: 38,
  borderRadius: 19,
  textAlign: "center",
  textAlignVertical: "center",
  fontSize: 20,
  fontWeight: "bold",
  marginBottom: 10,
},
  contactName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  contactRelation: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 3,
  },
  centerContainer: {
  flex: 1,
  backgroundColor: colors.background,
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
},
  loadingText: {
  color: colors.textMuted,
  marginTop: 12,
  fontSize: 16,
},
  errorText: {
  color: colors.textMuted,
  fontSize: 16,
  textAlign: "center",
  lineHeight: 23,
},
addContactCard: {
  width: "48%",
  minHeight: 120,
  backgroundColor: colors.card,
  borderRadius: 16,
  padding: 16,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: colors.cardBorder,
},
addContactText: {
  color: colors.primary,
  fontSize: 46,
  fontWeight: "300",
},
heartCircleContainer: {
  width: 150,
  height: 150,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
},

heartRing: {
  position: "absolute",
  width: 150,
  height: 150,
  borderRadius: 75,
  borderWidth: 8,
  alignItems: "center",
},

ringDot: {
  position: "absolute",
  top: -9,
  width: 18,
  height: 18,
  borderRadius: 9,
},

heartContent: {
  width: 130,
  height: 130,
  borderRadius: 65,
  alignItems: "center",
  justifyContent: "center",
},

modeText: {
  color: colors.textMuted,
  fontSize: 15,
  marginTop: 8,
},

modeStrong: {
  color: colors.primary,
  fontWeight: "bold",
},
errorTitle: {
  color: colors.text,
  fontSize: 24,
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: 10,
},

retryButton: {
  backgroundColor: colors.primary,
  borderRadius: 12,
  paddingVertical: 13,
  paddingHorizontal: 28,
  marginTop: 22,
},

retryButtonText: {
  color: colors.text,
  fontSize: 16,
  fontWeight: "bold",
},
warningBox: {
  backgroundColor: "rgba(245, 158, 11, 0.12)",
  borderColor: colors.warning,
  borderWidth: 1,
  borderRadius: 12,
  padding: 12,
  marginBottom: 14,
},

warningText: {
  color: colors.warning,
  fontSize: 14,
  textAlign: "center",
  fontWeight: "bold",
},
});