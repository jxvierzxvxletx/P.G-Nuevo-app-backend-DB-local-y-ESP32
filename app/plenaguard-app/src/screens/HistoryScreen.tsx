import AsyncStorage from "@react-native-async-storage/async-storage";
import { guardarCache, obtenerCache } from "../utils/localCache";
import { timeout } from "../utils/timeout";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  getHistorialPaciente,
  getContextoAlerta,
  getLecturasPaciente,
} from "../api/plenaguardApi";
import { colors } from "../constants/colors";

import { subscribeToAppRefresh } from "../utils/appRefresh";



export default function HistoryScreen() {

  async function cargarHistorialDesdeBackend(pacienteId: number) {
  const alertas = await getHistorialPaciente(pacienteId);

  let lecturas: any[] = [];

  try {
    lecturas = await getLecturasPaciente(pacienteId);
  } catch (error) {
    console.log("No se pudieron cargar lecturas:", error);
    lecturas = [];
  }

  const alertasConContexto = await Promise.all(
    alertas.map(async (alerta: any) => {
      try {
        const contexto = await getContextoAlerta(alerta.id);

        return {
          ...alerta,
          tiene_contexto: !!contexto,
        };
      } catch (error) {
        return {
          ...alerta,
          tiene_contexto: false,
        };
      }
    })
  );

  return prepararHistorial(alertasConContexto, lecturas);
}

  const [historial, setHistorial] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

const cargarHistorial = useCallback(async () => {
  try {
    const pacienteGuardado = await AsyncStorage.getItem("pacienteId");

    if (!pacienteGuardado) {
      setError("No se encontró el perfil del paciente");
      setCargando(false);
      return;
    }

    const pacienteId = Number(pacienteGuardado);
    const cacheKey = `historial_paciente_${pacienteId}`;

    const cache = await obtenerCache(cacheKey);

    if (cache?.data) {
      setHistorial(cache.data);
      setCargando(false);
      setError("");
    }

    const historialBackend = await Promise.race([
      cargarHistorialDesdeBackend(pacienteId),
      timeout(8000),
    ]);

    setHistorial(historialBackend as any[]);
    await guardarCache(cacheKey, historialBackend);

    setError("");
  } catch (error) {
    console.log("Error al cargar historial:", error);

    if (historial.length === 0) {
      setError("No se pudo actualizar el historial");
    } else {
      setError(
        "No se pudo actualizar el historial. Mostrando últimos datos guardados."
      );
    }
  } finally {
    setCargando(false);
  }
}, [historial.length]); 
useEffect(() => {
  cargarHistorial();

  const unsubscribe = subscribeToAppRefresh(() => {
    cargarHistorial();
  });

  const intervalo = setInterval(() => {
    cargarHistorial();
  }, 5 * 1000);

  return () => {
    unsubscribe();
    clearInterval(intervalo);
  };
}, [cargarHistorial]);

  if (cargando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  if (error && historial.length === 0) {
  return (
    <View style={styles.centerContainer}>
      <Text style={styles.errorTitle}>No se pudo cargar el historial</Text>

      <Text style={styles.errorText}>
        Revisa tu conexión e intenta nuevamente.
      </Text>

      <Pressable
        style={styles.retryButton}
        onPress={() => {
  setCargando(true);
  setError("");
  cargarHistorial();
}}
      >
        <Text style={styles.retryButtonText}>REINTENTAR</Text>
      </Pressable>
    </View>
  );
}
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.logo}>
        Plena<Text style={styles.logoAccent}>Guard</Text>
      </Text>

      <Text style={styles.title}>Historial</Text>
<Text style={styles.subtitle}>Mediciones y Alertas Recientes</Text>

{historial.length > 0 && (
  <>
    <Text style={styles.helpText}>
      Las lecturas normales se registran en el historial. Presione una alerta para ver o agregar detalles del evento.
    </Text>

    <Pressable
      style={styles.pdfButton}
      onPress={() => router.push("/reportes" as any)}
    >
      <Text style={styles.pdfButtonText}>
        OBTENER REGISTRO CARDÍACO EN PDF
      </Text>
    </Pressable>
  </>
)}

      {error !== "" && historial.length > 0 && (
  <View style={styles.warningBox}>
    <Text style={styles.warningText}>
      No se pudo actualizar ahora. Se muestran los últimos datos guardados.
    </Text>
  </View>
)}

      <View style={styles.list}>
  {historial.length === 0 && (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyTitle}>Sin eventos registrados</Text>
      <Text style={styles.emptyText}>
        Las mediciones normales no generan alertas. Cuando ocurra una caída,
        bradicardia o taquicardia, aparecerá aquí.
      </Text>
    </View>
  )}

  {historial.map((evento) => (
  <Pressable
    key={evento.id}
    onPress={() => {
  if (evento.tipo_evento !== "lectura") {
    router.push({
      pathname: "/alerta/[id]",
      params: { id: String(evento.alerta_id) },
    } as any);
  }
}}
  >
    <View style={styles.historyCard}>
      <View
        style={[
          styles.historyIcon,
          { borderColor: obtenerColorEvento(evento) },
        ]}
      >
        <Text
          style={[
            styles.historyIconText,
            { color: obtenerColorEvento(evento) },
          ]}
        >
          {obtenerIconoEvento(evento)}
        </Text>
      </View>

      <View style={styles.historyContent}>
  <View style={styles.historyHeader}>
    <Text style={styles.historyTitle}>
      {formatearFecha(evento.fecha)} | {obtenerTituloEvento(evento)}
    </Text>

    {evento.tipo_evento !== "lectura" && (
  <View style={styles.infoBadge}>
    <Text style={styles.infoBadgeText}>i</Text>
  </View>
)}
  </View>

  <Text
    style={[
      styles.historyDescription,
      { color: obtenerColorEvento(evento) },
    ]}
  >
    {obtenerDetalleEvento(evento)}
  </Text>
</View>
    </View>
  </Pressable>
))}
      </View>
    </ScrollView>
  );
}

function prepararHistorial(alertas: any[], lecturas: any[]) {
  const eventos: any[] = [];

  lecturas.forEach((lectura) => {
    eventos.push({
      id: `lectura-${lectura.id}`,
      lectura_id: lectura.id,
      tipo_evento: "lectura",
      tipo_alerta: null,
      frecuencia_cardiaca: lectura.frecuencia_cardiaca,
      spo2: lectura.spo2,
      movimiento_estado: lectura.movimiento_estado,
      modo_uso: lectura.modo_uso,
      fecha: lectura.creacion,
      tiene_contexto: false,
    });
  });

  alertas.forEach((alerta) => {
    eventos.push({
      id: `detectada-${alerta.id}`,
      alerta_id: alerta.id,
      tipo_evento: "detectada",
      tipo_alerta: alerta.tipo_alerta,
      estado: alerta.estado,
      frecuencia_cardiaca: alerta.frecuencia_cardiaca,
      mensaje: alerta.mensaje,
      fecha: alerta.creacion,
      tiene_contexto: alerta.tiene_contexto,
    });

    if (alerta.estado === "cancelada" || alerta.estado === "revisada") {
      eventos.push({
        id: `estado-${alerta.id}`,
        alerta_id: alerta.id,
        tipo_evento: alerta.estado,
        tipo_alerta: alerta.tipo_alerta,
        estado: alerta.estado,
        frecuencia_cardiaca: alerta.frecuencia_cardiaca,
        mensaje:
          alerta.estado === "cancelada"
            ? "Alerta marcada como falsa alarma"
            : "Alerta atendida por el usuario",
        fecha: alerta.revisada || alerta.creacion,
        tiene_contexto: alerta.tiene_contexto,
      });
    }
  });

  return eventos.sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
}

function obtenerTituloEvento(evento: any) {
  if (evento.tipo_evento === "lectura") {
    return "Lectura registrada";
  }

  const tipo = obtenerNombreTipoAlerta(evento.tipo_alerta);

  if (evento.tipo_evento === "revisada") {
    return `Alerta atendida de ${tipo}`;
  }

  if (evento.tipo_evento === "cancelada") {
    return `Falsa alarma de ${tipo}`;
  }

  if (evento.tipo_alerta === "taquicardia") {
    return "Taquicardia detectada";
  }

  if (evento.tipo_alerta === "bradicardia") {
    return "Bradicardia detectada";
  }

  if (evento.tipo_alerta === "caida") {
    return "Caída detectada";
  }

  return "Alerta detectada";
}

function obtenerNombreTipoAlerta(tipoAlerta: string) {
  if (tipoAlerta === "taquicardia") {
    return "taquicardia";
  }

  if (tipoAlerta === "bradicardia") {
    return "bradicardia";
  }

  if (tipoAlerta === "caida") {
    return "caída";
  }

  return "alerta";
}

function obtenerDetalleEvento(evento: any) {
  if (evento.tipo_evento === "lectura") {
  const modoUso =
    evento.modo_uso === "deportivo" ? "Deportivo" : "Normal";

  return `Pulso registrado: ${evento.frecuencia_cardiaca} LPM · Modo ${modoUso}`;
}

  const tipo = obtenerNombreTipoAlerta(evento.tipo_alerta);

  if (evento.tipo_evento === "revisada") {
    return `Alerta de ${tipo} atendida (${evento.frecuencia_cardiaca} LPM)`;
  }

  if (evento.tipo_evento === "cancelada") {
    return `Falsa alarma de ${tipo} registrada (${evento.frecuencia_cardiaca} LPM)`;
  }

  if (evento.tipo_alerta === "taquicardia") {
    return `Frecuencia cardíaca elevada detectada (${evento.frecuencia_cardiaca} LPM)`;
  }

  if (evento.tipo_alerta === "bradicardia") {
    return `Frecuencia cardíaca baja detectada (${evento.frecuencia_cardiaca} LPM)`;
  }

  if (evento.tipo_alerta === "caida") {
    return `Posible caída detectada (${evento.frecuencia_cardiaca} LPM)`;
  }

  return evento.mensaje || "Evento registrado";
}

function obtenerIconoEvento(evento: any) {
  if (evento.tipo_evento === "lectura") return "♡";
  if (evento.tipo_evento === "revisada") return "✓";
  if (evento.tipo_evento === "cancelada") return "×";
  if (evento.tipo_alerta === "caida") return "!";
  return "♥";
}

function obtenerColorEvento(evento: any) {
  if (evento.tipo_evento === "lectura") return colors.success;
  if (evento.tipo_evento === "revisada") return colors.success;
  if (evento.tipo_evento === "cancelada") return colors.warning;
  if (evento.tipo_alerta === "caida") return colors.warning;
  return colors.danger;
}

function formatearFecha(fecha: string) {
  const date = new Date(fecha);
  const hoy = new Date();

  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  const esMismoDia = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  const hora = date.toLocaleTimeString("es-CL", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (esMismoDia(date, hoy)) {
    return `Hoy ${hora}`;
  }

  if (esMismoDia(date, ayer)) {
    return `Ayer ${hora}`;
  }

  return date.toLocaleString("es-CL", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 30,
  },
  logo: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 28,
  },
  logoAccent: {
    color: colors.primary,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 19,
    textAlign: "center",
    marginBottom: 24,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "bold",
  },
  textBox: {
    flex: 1,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "bold",
  },
  itemDescription: {
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
historyCard: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.card,
  borderColor: colors.cardBorder,
  borderWidth: 1,
  borderRadius: 16,
  padding: 14,
  marginBottom: 12,
},

historyIcon: {
  width: 62,
  height: 62,
  borderRadius: 31,
  borderWidth: 3,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 14,
},

historyIconText: {
  fontSize: 28,
  fontWeight: "bold",
},

historyContent: {
  flex: 1,
},

historyTitle: {
  color: colors.text,
  fontSize: 16,
  fontWeight: "bold",
  marginBottom: 5,
  flex: 1,
},

historyDescription: {
  fontSize: 15,
  lineHeight: 20,
},

emptyBox: {
  backgroundColor: colors.card,
  borderColor: colors.cardBorder,
  borderWidth: 1,
  borderRadius: 18,
  padding: 20,
  alignItems: "center",
  marginTop: 10,
},

emptyTitle: {
  color: colors.text,
  fontSize: 20,
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: 8,
},

emptyText: {
  color: colors.textMuted,
  fontSize: 16,
  textAlign: "center",
  lineHeight: 23,
},
errorTitle: {
  color: colors.text,
  fontSize: 24,
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: 10,
},

errorText: {
  color: colors.textMuted,
  fontSize: 16,
  textAlign: "center",
  lineHeight: 23,
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
  marginBottom: 16,
},

warningText: {
  color: colors.warning,
  fontSize: 14,
  textAlign: "center",
  fontWeight: "bold",
},
helpText: {
  color: colors.textMuted,
  fontSize: 15,
  textAlign: "center",
  lineHeight: 21,
  marginTop: -10,
  marginBottom: 20,
},
historyHeader: {
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
},

infoBadge: {
  width: 24,
  height: 24,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.primary,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 2,
},

infoBadgeText: {
  color: colors.primary,
  fontSize: 14,
  fontWeight: "bold",
},
pdfButton: {
  borderWidth: 1,
  borderColor: colors.primary,
  borderRadius: 16,
  paddingVertical: 16,
  paddingHorizontal: 14,
  alignItems: "center",
  marginBottom: 22,
  backgroundColor: "rgba(139, 92, 246, 0.10)",
},

pdfButtonText: {
  color: colors.primary,
  fontSize: 15,
  fontWeight: "800",
  letterSpacing: 0.8,
  textAlign: "center",
},
});