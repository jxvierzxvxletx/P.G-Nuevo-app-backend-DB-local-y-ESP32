import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { crearContactoPaciente } from "../../src/api/plenaguardApi";
import { colors } from "../../src/constants/colors";

export default function Contacto() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [relacion, setRelacion] = useState("");
  const [correo, setCorreo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitulo, setModalTitulo] = useState("");
  const [modalMensaje, setModalMensaje] = useState("");
  const [guardadoCorrecto, setGuardadoCorrecto] = useState(false);

  function moverPantalla(y: number) {
  setTimeout(() => {
    scrollRef.current?.scrollTo({
      y,
      animated: true,
    });
  }, 250);
}

  function mostrarModal(titulo: string, mensaje: string, correcto: boolean) {
  setModalTitulo(titulo);
  setModalMensaje(mensaje);
  setGuardadoCorrecto(correcto);
  setModalVisible(true);
}

  async function guardarContacto() {
  if (!nombre.trim() || !telefono.trim() || !relacion.trim()) {
    mostrarModal(
      "Faltan datos",
      "Nombre, teléfono y relación son obligatorios.",
      false
    );
    return;
  }

  try {
    setGuardando(true);

    const pacienteGuardado = await AsyncStorage.getItem("pacienteId");

if (!pacienteGuardado) {
  mostrarModal(
    "Error",
    "No se encontró el perfil del paciente.",
    false
  );
  return;
}

await crearContactoPaciente(Number(pacienteGuardado), {
  nombre: nombre.trim(),
  telefono: telefono.trim(),
  relacion: relacion.trim(),
  correo: correo.trim() ? correo.trim() : undefined,
});

    mostrarModal(
      "Contacto guardado",
      "El contacto fue agregado correctamente.",
      true
    );
  } catch (error) {
    mostrarModal(
      "Error",
      "No se pudo guardar el contacto. Revisa la conexión con la API.",
      false
    );
  } finally {
    setGuardando(false);
  }
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

      <Text style={styles.title}>Nuevo Contacto</Text>
      <Text style={styles.subtitle}>
        Ingrese los detalles de su contacto de emergencia
      </Text>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>👤</Text>
      </View>

      <Text style={styles.label}>Nombre Completo</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. María García"
        placeholderTextColor={colors.textMuted}
        value={nombre}
        onChangeText={setNombre}
        onFocus={() => moverPantalla(180)}
      />

      <Text style={styles.label}>Teléfono</Text>
      <TextInput
        style={styles.input}
        placeholder="+56 9 0000 0000"
        placeholderTextColor={colors.textMuted}
        value={telefono}
        onChangeText={setTelefono}
        keyboardType="phone-pad"
        onFocus={() => moverPantalla(260)}
      />

      <Text style={styles.label}>Relación</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. Madre, Hijo, Pareja"
        placeholderTextColor={colors.textMuted}
        value={relacion}
        onChangeText={setRelacion}
      />

      <Text style={styles.label}>Correo electrónico (Opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="maria@email.com"
        placeholderTextColor={colors.textMuted}
        value={correo}
        onChangeText={setCorreo}
        keyboardType="email-address"
        autoCapitalize="none"
        onFocus={() => moverPantalla(420)}
      />

      <Pressable
        style={[styles.button, guardando && styles.buttonDisabled]}
        onPress={guardarContacto}
        disabled={guardando}
      >
        {guardando ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>GUARDAR CONTACTO</Text>
        )}
      </Pressable>
    </ScrollView>

    <Modal transparent visible={modalVisible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View
            style={[
              styles.modalIcon,
              guardadoCorrecto ? styles.modalIconSuccess : styles.modalIconError,
            ]}
          >
            <Text style={styles.modalIconText}>
              {guardadoCorrecto ? "✓" : "!"}
            </Text>
          </View>

          <Text style={styles.modalTitle}>{modalTitulo}</Text>
          <Text style={styles.modalMessage}>{modalMensaje}</Text>

          <Pressable
            style={styles.modalButton}
            onPress={() => {
              setModalVisible(false);

              if (guardadoCorrecto) {
                router.back();
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
  paddingHorizontal: 24,
  paddingTop: 45,
  paddingBottom: 160,
  },
  logo: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 22,
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
    marginTop: 4,
    marginBottom: 14,
  },
  avatar: {
    alignSelf: "center",
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 58,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 26,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.text,
    fontSize: 18,
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalIconSuccess: {
    backgroundColor: "#102A17",
    borderColor: colors.success,
    borderWidth: 2,
  },
  modalIconError: {
    backgroundColor: "#3A120B",
    borderColor: colors.danger,
    borderWidth: 2,
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