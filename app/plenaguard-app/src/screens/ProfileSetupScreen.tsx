import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { guardarCache } from "../utils/localCache";
import { emitAppRefresh } from "../utils/appRefresh";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  crearDispositivoPaciente,
  crearLecturaDispositivo,
  crearPaciente,
  loginPaciente,
  recuperarIdPaciente,
} from "../api/plenaguardApi";

import { colors } from "../constants/colors";

type Props = {
  onPerfilCreado: (pacienteId: number) => void;
};

type ModoPantalla = "login" | "registro" | "recuperar";

export default function ProfileSetupScreen({ onPerfilCreado }: Props) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [modo, setModo] = useState<ModoPantalla>("login");

const [nombre, setNombre] = useState("");
const [edad, setEdad] = useState("");
const [pacienteId, setPacienteId] = useState("");

const [cargando, setCargando] = useState(false);

const [pacientePendienteId, setPacientePendienteId] = useState<number | null>(null);
const [modalVisible, setModalVisible] = useState(false);
const [modalTitulo, setModalTitulo] = useState("");
const [modalMensaje, setModalMensaje] = useState("");
const [perfilCreadoId, setPerfilCreadoId] = useState<number | null>(null);

  function moverPantalla(y: number) {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y,
        animated: true,
      });
    }, 250);
  }

  function mostrarModal(titulo: string, mensaje: string, pacienteId?: number) {
    setModalTitulo(titulo);
    setModalMensaje(mensaje);
    setPerfilCreadoId(pacienteId ?? null);
    setModalVisible(true);
  }

  function limpiarCampos() {
    setNombre("");
    setEdad("");
    setPacienteId("");
  }

  function obtenerFechaNacimientoDesdeEdad(edadNumero: number) {
    const anioActual = new Date().getFullYear();
    const anioNacimiento = anioActual - edadNumero;

    return `${anioNacimiento}-01-01`;
  }

  async function guardarSesionPaciente(id: number) {
    await AsyncStorage.setItem("pacienteId", String(id));
    onPerfilCreado(id);
  }

  async function iniciarSesion() {
    if (!nombre.trim() || !pacienteId.trim()) {
      mostrarModal("Faltan datos", "Ingrese el nombre del paciente y su ID de acceso.");
      return;
    }

    const idNumero = Number(pacienteId);

    if (Number.isNaN(idNumero) || idNumero <= 0) {
      mostrarModal("ID inválido", "Ingrese un ID válido.");
      return;
    }

    try {
      setCargando(true);
      Keyboard.dismiss();

      const respuesta = await loginPaciente(idNumero, nombre.trim());

      await guardarSesionPaciente(respuesta.paciente.id);
    } catch (error: any) {
      mostrarModal(
        "No se pudo iniciar sesión",
        error.message || "No se encontró una cuenta con esos datos."
      );
    } finally {
      setCargando(false);
    }
  }

  async function crearCuenta() {
    if (!nombre.trim() || !edad.trim()) {
      mostrarModal("Faltan datos", "Ingrese el nombre y la edad del paciente.");
      return;
    }

    const edadNumero = Number(edad);

    if (Number.isNaN(edadNumero) || edadNumero <= 0) {
      mostrarModal("Edad inválida", "Ingrese una edad válida.");
      return;
    }

    try {
      setCargando(true);
      Keyboard.dismiss();

      const fechaNacimiento = obtenerFechaNacimientoDesdeEdad(edadNumero);

      const pacienteCreado = await crearPaciente({
        nombre: nombre.trim(),
        fecha_nacimiento: fechaNacimiento,
        edad: edadNumero,
      });

      const dispositivoCreado = await crearDispositivoPaciente(pacienteCreado.id, {
        codigo_dispositivo: `ESP32-${pacienteCreado.id}`,
        bateria_porcentaje: 100,
        wifi_estado: "conectado",
      });

      await crearLecturaDispositivo(dispositivoCreado.id, {
        frecuencia_cardiaca: 80,
        spo2: 0,
        movimiento_estado: "normal",
        modo_uso: "normal",
      });

      const fechaActual = new Date().toISOString();

await guardarCache(`inicio_paciente_${pacienteCreado.id}`, {
  inicio: {
    paciente_id: pacienteCreado.id,
    paciente: pacienteCreado.nombre,
    edad: pacienteCreado.edad,
    dispositivo_id: dispositivoCreado.id,
    codigo_dispositivo: dispositivoCreado.codigo_dispositivo,
    bateria_porcentaje: dispositivoCreado.bateria_porcentaje ?? 100,
    wifi_estado: dispositivoCreado.wifi_estado ?? "conectado",
    ultimo_contacto: fechaActual,
    frecuencia_cardiaca: 80,
    spo2: 0,
    movimiento_estado: "normal",
    modo_uso: "normal",
    fecha_lectura: fechaActual,
  },
  contactos: [],
});

      setPacientePendienteId(pacienteCreado.id);

mostrarModal(
  "Cuenta creada",
  `La cuenta fue creada correctamente.\n\nID de acceso: ${pacienteCreado.id}\n\nGuarde este ID para iniciar sesión.`
);
    } catch (error: any) {
      mostrarModal(
        "No se pudo crear la cuenta",
        error.message || "Revise su conexión e intente nuevamente."
      );
    } finally {
      setCargando(false);
    }
  }

  async function recuperarCuenta() {
    if (!nombre.trim() || !edad.trim()) {
      mostrarModal("Faltan datos", "Ingrese el nombre y la edad del paciente.");
      return;
    }

    const edadNumero = Number(edad);

    if (Number.isNaN(edadNumero) || edadNumero <= 0) {
      mostrarModal("Edad inválida", "Ingrese una edad válida.");
      return;
    }

    try {
      setCargando(true);
      Keyboard.dismiss();

      const respuesta = await recuperarIdPaciente(nombre.trim(), edadNumero);

      const cuentas = respuesta.cuentas
        .map((cuenta: any) => `ID: ${cuenta.id} | ${cuenta.nombre}`)
        .join("\n");

      mostrarModal(
        "Solicitud encontrada",
        `Se encontraron estas cuentas:\n\n${cuentas}\n\nUse el ID correspondiente para iniciar sesión.`
      );
    } catch (error: any) {
      mostrarModal(
        "No se pudo recuperar",
        error.message || "No se encontró una cuenta con esos datos."
      );
    } finally {
      setCargando(false);
    }
  }

  function obtenerTitulo() {
    if (modo === "login") return "Iniciar sesión";
    if (modo === "registro") return "Crear cuenta";
    return "Recuperar ID";
  }

  function obtenerSubtitulo() {
    if (modo === "login") {
      return "Ingrese el nombre del paciente y su ID de acceso.";
    }

    if (modo === "registro") {
      return "Cree una cuenta básica para usar PlenaGuard.";
    }

    return "Ingrese los datos del paciente para solicitar su ID.";
  }

  function textoBotonPrincipal() {
    if (modo === "login") return "INICIAR SESIÓN";
    if (modo === "registro") return "CREAR CUENTA";
    return "RECUPERAR ID";
  }

  function accionPrincipal() {
    if (modo === "login") {
      iniciarSesion();
      return;
    }

    if (modo === "registro") {
      crearCuenta();
      return;
    }

    recuperarCuenta();
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>
          Plena<Text style={styles.logoAccent}>Guard</Text>
        </Text>

        <Text style={styles.title}>{obtenerTitulo()}</Text>
        <Text style={styles.subtitle}>{obtenerSubtitulo()}</Text>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, modo === "login" && styles.tabActive]}
            onPress={() => {
              setModo("login");
              limpiarCampos();
            }}
          >
            <Text style={[styles.tabText, modo === "login" && styles.tabTextActive]}>
              Iniciar
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, modo === "registro" && styles.tabActive]}
            onPress={() => {
              setModo("registro");
              limpiarCampos();
            }}
          >
            <Text style={[styles.tabText, modo === "registro" && styles.tabTextActive]}>
              Crear
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, modo === "recuperar" && styles.tabActive]}
            onPress={() => {
              setModo("recuperar");
              limpiarCampos();
            }}
          >
            <Text style={[styles.tabText, modo === "recuperar" && styles.tabTextActive]}>
              Recuperar
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>

          <Text style={styles.label}>Nombre del paciente</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Don Jorge"
            placeholderTextColor={colors.textMuted}
            value={nombre}
            onChangeText={setNombre}
            onFocus={() => moverPantalla(130)}
          />

          {modo === "login" && (
            <>
              <Text style={styles.label}>ID de acceso</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 5"
                placeholderTextColor={colors.textMuted}
                value={pacienteId}
                onChangeText={setPacienteId}
                keyboardType="numeric"
                onFocus={() => moverPantalla(210)}
              />
            </>
          )}

          {(modo === "registro" || modo === "recuperar") && (
            <>
              <Text style={styles.label}>Edad</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 72"
                placeholderTextColor={colors.textMuted}
                value={edad}
                onChangeText={setEdad}
                keyboardType="numeric"
                onFocus={() => moverPantalla(210)}
              />
            </>
          )}

          <Pressable
            style={[styles.button, cargando && styles.buttonDisabled]}
            onPress={accionPrincipal}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonText}>{textoBotonPrincipal()}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIcon}>
              <Text style={styles.modalIconText}>
  {pacientePendienteId || perfilCreadoId ? "✓" : "!"}
</Text>
            </View>

            <Text style={styles.modalTitle}>{modalTitulo}</Text>
            <Text style={styles.modalMessage}>{modalMensaje}</Text>

            <Pressable
  style={styles.modalButton}
  onPress={async () => {
    setModalVisible(false);

    if (pacientePendienteId) {
      await AsyncStorage.setItem("pacienteId", String(pacientePendienteId));

      emitAppRefresh();
      onPerfilCreado(pacientePendienteId);
      setPacientePendienteId(null);

      router.replace("/" as any);
      return;
    }

    if (perfilCreadoId) {
      emitAppRefresh();
      onPerfilCreado(perfilCreadoId);
      router.replace("/" as any);
    }
  }}
>
  <Text style={styles.modalButtonText}>Aceptar</Text>
</Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: 26,
    paddingTop: 70,
    paddingBottom: 170,
  },

  logo: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 34,
  },

  logoAccent: {
    color: colors.primary,
  },

  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "bold",
    textAlign: "center",
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: 18,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 25,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 5,
    marginBottom: 20,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },

  tabActive: {
    backgroundColor: colors.primary,
  },

  tabText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "800",
  },

  tabTextActive: {
    color: colors.text,
  },

  card: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
  },

  avatar: {
    alignSelf: "center",
    marginBottom: 14,
  },

  avatarText: {
    fontSize: 56,
  },

  label: {
    color: colors.text,
    fontSize: 17,
    marginBottom: 7,
    marginTop: 14,
  },

  input: {
    backgroundColor: "#0F0F14",
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "bold",
    letterSpacing: 1,
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
    backgroundColor: "#241436",
    borderColor: colors.primary,
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

  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 38,
  },

  modalButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "bold",
  },
});