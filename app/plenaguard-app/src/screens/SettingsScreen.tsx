import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Text,
  View,
} from "react-native";

import {
  actualizarModoDispositivo,
  actualizarEstadoDispositivo,
  crearLecturaDispositivo,
  getInicioPaciente,
} from "../api/plenaguardApi";

import { colors } from "../constants/colors";
import { emitAppRefresh } from "../utils/appRefresh";

export default function SettingsScreen() {

  const [mostrarSimulacion, setMostrarSimulacion] = useState(false);
const [toquesTitulo, setToquesTitulo] = useState(0); 
  
  const [pacienteId, setPacienteId] = useState<number | null>(null);
  const [inicio, setInicio] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [modalVisible, setModalVisible] = useState(false);

  const [mensajeModalVisible, setMensajeModalVisible] = useState(false);
  const [mensajeModalTitulo, setMensajeModalTitulo] = useState("");
  const [mensajeModalTexto, setMensajeModalTexto] = useState("");

  const [lpmPrueba, setLpmPrueba] = useState("");
  const [bateriaPrueba, setBateriaPrueba] = useState("");
  const [conexionPrueba, setConexionPrueba] = useState<
    "conectado" | "desconectado"
  >("conectado");

  function mostrarMensaje(titulo: string, texto: string) {
    setMensajeModalTitulo(titulo);
    setMensajeModalTexto(texto);
    setMensajeModalVisible(true);
  }

  const cargarDatos = useCallback(async () => {
    try {
      const pacienteGuardado = await AsyncStorage.getItem("pacienteId");

      if (!pacienteGuardado) {
        setCargando(false);
        return;
      }

      const id = Number(pacienteGuardado);
      setPacienteId(id);

      const dataInicio = await getInicioPaciente(id);

      setInicio(dataInicio);
      setError("");

      await AsyncStorage.setItem(
        "ultimoInicioPaciente",
        JSON.stringify(dataInicio)
      );
    } catch (error) {
      console.log("Error al cargar configuración:", error);

      const datosGuardados = await AsyncStorage.getItem("ultimoInicioPaciente");

      if (datosGuardados) {
        setInicio(JSON.parse(datosGuardados));
      }

      setError("Mostrando la última información guardada");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();

    const intervalo = setInterval(() => {
      cargarDatos();
    }, 5 * 1000);

    return () => clearInterval(intervalo);
  }, [cargarDatos]);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  async function reiniciarPerfil() {
    await AsyncStorage.multiRemove([
      "pacienteId",
      "ultimoInicioPaciente",
      "ultimoHistorialPaciente",
    ]);

    setModalVisible(false);
    setPacienteId(null);
    setInicio(null);
    setError("");
  }

  async function cambiarModoUso(nuevoModo: string) {
    if (!inicio?.dispositivo_id) {
      console.log("No existe dispositivo_id en inicio");
      return;
    }

    try {
      await actualizarModoDispositivo(inicio.dispositivo_id, nuevoModo);

      setInicio({
        ...inicio,
        modo_uso: nuevoModo,
        ultimo_contacto: new Date().toISOString(),
      });

      await cargarDatos();
      emitAppRefresh();
    } catch (error) {
      console.log("Error al cambiar modo de uso:", error);
    }
  }

  async function simularLecturaPersonalizada(frecuencia: number) {
    if (!inicio?.dispositivo_id) {
      mostrarMensaje(
        "Sin dispositivo",
        "No se encontró un dispositivo asociado al perfil."
      );
      return;
    }

    try {
      await crearLecturaDispositivo(inicio.dispositivo_id, {
        frecuencia_cardiaca: frecuencia,
        spo2: 98,
        movimiento_estado: "normal",
        modo_uso: inicio.modo_uso || "normal",
      });

      setLpmPrueba("");

      await cargarDatos();
      emitAppRefresh();

      mostrarMensaje(
        "Lectura enviada",
        `Se registró una lectura de ${frecuencia} LPM.`
      );
    } catch (error) {
      console.log("Error al enviar lectura personalizada:", error);

      mostrarMensaje("Error", "No se pudo enviar la lectura.");
    }
  }

  async function actualizarBateriaPrueba(bateria: number) {
    if (!inicio?.dispositivo_id) {
      mostrarMensaje(
        "Sin dispositivo",
        "No se encontró un dispositivo asociado al perfil."
      );
      return;
    }

    try {
      await actualizarEstadoDispositivo(inicio.dispositivo_id, {
        bateria_porcentaje: bateria,
      });

      setBateriaPrueba("");

      await cargarDatos();
      emitAppRefresh();

      mostrarMensaje(
        "Batería actualizada",
        `Se actualizó la batería a ${bateria}%.`
      );
    } catch (error) {
      console.log("Error al actualizar batería:", error);

      mostrarMensaje("Error", "No se pudo actualizar la batería.");
    }
  }

  async function actualizarConexionPrueba(
    estado: "conectado" | "desconectado"
  ) {
    if (!inicio?.dispositivo_id) {
      mostrarMensaje(
        "Sin dispositivo",
        "No se encontró un dispositivo asociado al perfil."
      );
      return;
    }

    try {
      await actualizarEstadoDispositivo(inicio.dispositivo_id, {
        wifi_estado: estado,
      });

      await cargarDatos();
      emitAppRefresh();

      mostrarMensaje(
        "Conexión actualizada",
        `El dispositivo quedó como ${estado}.`
      );
    } catch (error) {
      console.log("Error al actualizar conexión:", error);

      mostrarMensaje("Error", "No se pudo actualizar la conexión.");
    }
  }

  async function simularLectura(
    frecuencia: number,
    movimiento: string = "normal"
  ) {
    if (!inicio?.dispositivo_id) {
      mostrarMensaje(
        "Sin dispositivo",
        "No se encontró un dispositivo asociado al perfil."
      );
      return;
    }

    try {
      await crearLecturaDispositivo(inicio.dispositivo_id, {
        frecuencia_cardiaca: frecuencia,
        spo2: 98,
        movimiento_estado: movimiento,
        modo_uso: inicio.modo_uso || "normal",
      });

      await cargarDatos();
      emitAppRefresh();

      mostrarMensaje(
        "Lectura enviada",
        `Se registró una lectura de ${frecuencia} LPM.`
      );
    } catch (error) {
      console.log("Error al simular lectura:", error);

      mostrarMensaje("Error", "No se pudo enviar la lectura.");
    }
  }

  if (cargando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando configuración...</Text>
      </View>
    );
  }

function activarModoPrueba() {
  const nuevosToques = toquesTitulo + 1;

  setToquesTitulo(nuevosToques);

  if (nuevosToques >= 5) {
    setMostrarSimulacion((valorActual) => !valorActual);
    setToquesTitulo(0);
  }
}


  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>
          Plena<Text style={styles.logoAccent}>Guard</Text>
        </Text>

        <Pressable onPress={activarModoPrueba}>
  <Text style={styles.title}>Configuración</Text>
</Pressable>

        <Text style={styles.subtitle}>
          {error
            ? "Perfil y dispositivo sin conexión"
            : "Perfil y dispositivo conectado"}
        </Text>

        {error !== "" && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>{error}</Text>
          </View>
        )}

        <View style={styles.card}>
  <Text style={styles.cardTitle}>Perfil del paciente</Text>

  <View style={styles.infoRow}>
    <View>
      <Text style={styles.label}>Paciente</Text>
      <Text style={styles.value}>{inicio?.paciente || "Sin perfil"}</Text>
    </View>
  </View>

  <View style={styles.infoGrid}>
    <View style={styles.infoBox}>
      <Text style={styles.label}>ID de acceso</Text>
      <Text style={styles.value}>{pacienteId || "No configurado"}</Text>
    </View>

    <View style={styles.infoBox}>
      <Text style={styles.label}>Edad</Text>
      <Text style={styles.value}>
        {inicio?.edad ? `${inicio.edad} años` : "Sin dato"}
      </Text>
    </View>
  </View>

  <View style={styles.divider} />

  <Text style={styles.cardTitle}>Estado del dispositivo</Text>

  <View style={styles.statusBox}>
    <Text style={styles.label}>Conexión</Text>
    <Text
      style={[
        styles.statusValue,
        {
          color:
            inicio?.wifi_estado === "conectado"
              ? colors.success
              : colors.danger,
        },
      ]}
    >
      {inicio?.wifi_estado === "conectado" ? "Conectado" : "Desconectado"}
    </Text>
  </View>

  <View style={styles.infoGrid}>
    <View style={styles.infoBox}>
      <Text style={styles.label}>Batería</Text>
      <Text
        style={[
          styles.value,
          {
            color: obtenerColorBateria(inicio?.bateria_porcentaje || 0),
          },
        ]}
      >
        {inicio?.bateria_porcentaje !== undefined
          ? `${inicio.bateria_porcentaje}%`
          : "Sin dato"}
      </Text>
    </View>

    <View style={styles.infoBox}>
      <Text style={styles.label}>Estado de la batería</Text>
      <Text
        style={[
          styles.value,
          {
            color: obtenerColorBateria(inicio?.bateria_porcentaje || 0),
          },
        ]}
      >
        {inicio?.bateria_porcentaje !== undefined
          ? obtenerEstadoBateria(inicio.bateria_porcentaje)
          : "Sin dato"}
      </Text>
    </View>
  </View>

  <Text style={styles.label}>Última actualización</Text>
  <Text style={styles.value}>
    {inicio?.ultimo_contacto
      ? new Date(inicio.ultimo_contacto).toLocaleString("es-CL")
      : "Sin datos"}
  </Text>

  <View style={styles.divider} />

  <Text style={styles.cardTitle}>Modo de uso</Text>

  <Text style={styles.modeDescription}>
    Seleccione el modo según la actividad actual del paciente.
  </Text>

  <View style={styles.modeButtons}>
    <Pressable
      style={[
        styles.modeButton,
        inicio?.modo_uso === "normal" && styles.modeButtonActive,
      ]}
      onPress={() => cambiarModoUso("normal")}
    >
      <Text
        style={[
          styles.modeButtonText,
          inicio?.modo_uso === "normal" && styles.modeButtonTextActive,
        ]}
      >
        Normal
      </Text>
    </Pressable>

    <Pressable
      style={[
        styles.modeButton,
        inicio?.modo_uso === "deportivo" && styles.modeButtonActive,
      ]}
      onPress={() => cambiarModoUso("deportivo")}
    >
      <Text
        style={[
          styles.modeButtonText,
          inicio?.modo_uso === "deportivo" &&
            styles.modeButtonTextActive,
        ]}
      >
        Deportivo
      </Text>
    </Pressable>
  </View>
</View>

        <View style={styles.actionsBox}>
  <Pressable
    style={styles.refreshButton}
    onPress={() => {
      emitAppRefresh();
      cargarDatos();
    }}
  >
    <Text style={styles.refreshButtonText}>ACTUALIZAR DATOS</Text>
  </Pressable>

  <Pressable
    style={styles.resetButton}
    onPress={() => setModalVisible(true)}
  >
    <Text style={styles.resetText}>REINICIAR PERFIL</Text>
  </Pressable>
</View>

        {mostrarSimulacion && (
  <View style={styles.simulationBox}>
    <Text style={styles.simulationTitle}>Simulación para pruebas</Text>

    <Text style={styles.simulationSubtitle}>
      Use esta sección para enviar datos de prueba a la app sin tener
      conectado el ESP32 físico.
    </Text>

    <View style={styles.testBlock}>
      <Text style={styles.testTitle}>Latidos por minuto</Text>

      <Text style={styles.testDescription}>
        Ingresa un valor de LPM para probar Inicio, Historial y Alertas.
      </Text>

      <TextInput
        style={styles.manualInput}
        placeholder="Ej. 80 LPM"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={lpmPrueba}
        onChangeText={setLpmPrueba}
      />

      <Pressable
        style={styles.simulationButton}
        onPress={() => {
          const frecuencia = Number(lpmPrueba);

          if (!frecuencia || frecuencia <= 0) {
            mostrarMensaje(
              "Dato inválido",
              "Ingrese un valor válido de latidos por minuto."
            );
            return;
          }

          simularLecturaPersonalizada(frecuencia);
        }}
      >
        <Text style={styles.simulationButtonText}>
          Enviar lectura de prueba
        </Text>
      </Pressable>
    </View>

    <View style={styles.testBlock}>
      <Text style={styles.testTitle}>Batería del dispositivo</Text>

      <Text style={styles.testDescription}>
        Ingresa un porcentaje para probar el color de la batería.
      </Text>

      <TextInput
        style={styles.manualInput}
        placeholder="Ej. 75%"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={bateriaPrueba}
        onChangeText={setBateriaPrueba}
      />

      <Pressable
        style={styles.simulationButton}
        onPress={() => {
          const bateria = Number(bateriaPrueba);

          if (
            bateriaPrueba.trim() === "" ||
            bateria < 0 ||
            bateria > 100
          ) {
            mostrarMensaje(
              "Dato inválido",
              "Ingrese una batería entre 0 y 100."
            );
            return;
          }

          actualizarBateriaPrueba(bateria);
        }}
      >
        <Text style={styles.simulationButtonText}>
          Actualizar batería
        </Text>
      </Pressable>
    </View>

    <View style={styles.testBlock}>
      <Text style={styles.testTitle}>Conexión del dispositivo</Text>

      <Text style={styles.testDescription}>
        Cambia el estado de conexión para probar cómo se muestra en Inicio
        y Configuración.
      </Text>

      <View style={styles.connectionButtons}>
        <Pressable
          style={[
            styles.connectionButton,
            conexionPrueba === "conectado" &&
              styles.connectionButtonActive,
          ]}
          onPress={() => setConexionPrueba("conectado")}
        >
          <Text
            style={[
              styles.connectionButtonText,
              conexionPrueba === "conectado" &&
                styles.connectionButtonTextActive,
            ]}
          >
            Conectado
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.connectionButton,
            conexionPrueba === "desconectado" &&
              styles.connectionButtonDanger,
          ]}
          onPress={() => setConexionPrueba("desconectado")}
        >
          <Text
            style={[
              styles.connectionButtonText,
              conexionPrueba === "desconectado" &&
                styles.connectionButtonTextActive,
            ]}
          >
            Desconectado
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.simulationButton}
        onPress={() => actualizarConexionPrueba(conexionPrueba)}
      >
        <Text style={styles.simulationButtonText}>
          Actualizar conexión
        </Text>
      </Pressable>
    </View>

    <Pressable
      style={styles.simulationButton}
      onPress={() => simularLectura(49, "normal")}
    >
      <Text style={styles.simulationButtonText}>
        Simular bradicardia
      </Text>
    </Pressable>

    <Pressable
      style={styles.simulationButton}
      onPress={() => simularLectura(121, "normal")}
    >
      <Text style={styles.simulationButtonText}>
        Simular taquicardia
      </Text>
    </Pressable>

    <Pressable
      style={[styles.simulationButton, styles.fallButton]}
      onPress={() => simularLectura(88, "caida")}
    >
      <Text style={styles.fallButtonText}>Simular caída</Text>
    </Pressable>
  </View>
)}

      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIcon}>
              <Text style={styles.modalIconText}>!</Text>
            </View>

            <Text style={styles.modalTitle}>Reiniciar perfil</Text>

            <Text style={styles.modalMessage}>
              Esto no borra la base de datos. Solo borra el paciente guardado en
              este celular para volver a configurar la app.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={styles.modalResetButton}
                onPress={reiniciarPerfil}
              >
                <Text style={styles.modalResetText}>Reiniciar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={mensajeModalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.appMessageBox}>
            <View style={styles.appMessageIcon}>
              <Text style={styles.appMessageIconText}>✓</Text>
            </View>

            <Text style={styles.appMessageTitle}>{mensajeModalTitulo}</Text>

            <Text style={styles.appMessageText}>{mensajeModalTexto}</Text>

            <Pressable
              style={styles.appMessageButton}
              onPress={() => setMensajeModalVisible(false)}
            >
              <Text style={styles.appMessageButtonText}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
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
    paddingHorizontal: 24,
    paddingTop: 58,
    paddingBottom: 140,
  },

  logo: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },

  logoAccent: {
    color: colors.primary,
  },

  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: 18,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
  },

  card: {
  backgroundColor: colors.card,
  borderColor: colors.cardBorder,
  borderWidth: 1,
  borderRadius: 22,
  padding: 20,
  marginBottom: 18,
},

  label: {
  color: colors.textMuted,
  fontSize: 14,
  marginBottom: 4,
},

  value: {
  color: colors.text,
  fontSize: 19,
  fontWeight: "bold",
  marginTop: 2,
},

  modeButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  modeButton: {
    flex: 1,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },

  modeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  modeButtonText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "bold",
  },

  modeButtonTextActive: {
    color: colors.text,
  },

  refreshButton: {
  backgroundColor: colors.card,
  borderColor: colors.primary,
  borderWidth: 1,
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: "center",
},
  refreshButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  simulationBox: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
  },

  simulationTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },

  simulationSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 14,
    lineHeight: 20,
  },

  testBlock: {
    backgroundColor: "rgba(255,255,255,0.035)",
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },

  testTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },

  testDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },

  manualInput: {
    backgroundColor: colors.background,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    marginBottom: 12,
  },

  simulationButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 10,
  },

  simulationButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "bold",
  },

  fallButton: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: colors.danger,
  },

  fallButtonText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "bold",
  },

  connectionButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  connectionButton: {
    flex: 1,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  connectionButtonActive: {
    backgroundColor: "rgba(34, 197, 94, 0.16)",
    borderColor: colors.success,
  },

  connectionButtonDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    borderColor: colors.danger,
  },

  connectionButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "bold",
  },

  connectionButtonTextActive: {
    color: colors.text,
  },

  resetButton: {
  borderColor: colors.danger,
  borderWidth: 1,
  borderRadius: 14,
  paddingVertical: 15,
  alignItems: "center",
  backgroundColor: "rgba(239, 68, 68, 0.08)",
},

  resetText: {
    color: colors.danger,
    fontSize: 17,
    fontWeight: "bold",
  },

  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: colors.textMuted,
    marginTop: 12,
    fontSize: 16,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  modalBox: {
    width: "100%",
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
  },

  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#3A2108",
    borderColor: colors.warning,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  modalIconText: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "bold",
  },

  modalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },

  modalMessage: {
    color: colors.textMuted,
    fontSize: 17,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 22,
  },

  modalActions: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },

  modalCancelButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },

  modalCancelText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: "bold",
  },

  modalResetButton: {
    flex: 1,
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },

  modalResetText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "bold",
  },

  appMessageBox: {
    width: "100%",
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
  },

  appMessageIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(139, 92, 246, 0.18)",
    borderColor: colors.primary,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  appMessageIconText: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: "bold",
  },

  appMessageTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },

  appMessageText: {
    color: colors.textMuted,
    fontSize: 17,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 22,
  },

  appMessageButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 42,
    alignItems: "center",
  },

  appMessageButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  actionsBox: {
  gap: 14,
  marginTop: 18,
  marginBottom: 22,
},
cardTitle: {
  color: colors.text,
  fontSize: 20,
  fontWeight: "bold",
  marginBottom: 14,
},

infoRow: {
  marginBottom: 12,
},

infoGrid: {
  flexDirection: "row",
  gap: 12,
  marginTop: 8,
  marginBottom: 8,
},

infoBox: {
  flex: 1,
  backgroundColor: "rgba(255,255,255,0.035)",
  borderColor: colors.cardBorder,
  borderWidth: 1,
  borderRadius: 14,
  padding: 14,
},

divider: {
  height: 1,
  backgroundColor: colors.cardBorder,
  marginVertical: 18,
},

statusBox: {
  backgroundColor: "rgba(255,255,255,0.035)",
  borderColor: colors.cardBorder,
  borderWidth: 1,
  borderRadius: 14,
  padding: 14,
  marginBottom: 10,
},

statusValue: {
  fontSize: 22,
  fontWeight: "bold",
  marginTop: 4,
},

modeDescription: {
  color: colors.textMuted,
  fontSize: 14,
  lineHeight: 20,
  marginBottom: 12,
},
});