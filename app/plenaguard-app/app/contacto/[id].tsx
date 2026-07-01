import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import {
  actualizarContacto,
  eliminarContacto,
  getContactoPorId,
} from "../../src/api/plenaguardApi";
import { colors } from "../../src/constants/colors";

export default function DetalleContacto() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const scrollRef = useRef<ScrollView>(null);

  const contactoId = Number(id);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [relacion, setRelacion] = useState("");
  const [correo, setCorreo] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitulo, setModalTitulo] = useState("");
  const [modalMensaje, setModalMensaje] = useState("");
  const [modalTipo, setModalTipo] = useState<"exito" | "error" | "confirmar">("exito");

  useEffect(() => {
    async function cargarContacto() {
      try {
        const data = await getContactoPorId(contactoId);

        setNombre(data.nombre || "");
        setTelefono(data.telefono || "");
        setRelacion(data.relacion || "");
        setCorreo(data.correo || "");
      } catch (error) {
        mostrarModal("Error", "No se pudo cargar el contacto.", "error");
      } finally {
        setCargando(false);
      }
    }

    cargarContacto();
  }, [contactoId]);

  function moverPantalla(y: number) {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y,
        animated: true,
      });
    }, 250);
  }

  function mostrarModal(
    titulo: string,
    mensaje: string,
    tipo: "exito" | "error" | "confirmar"
  ) {
    setModalTitulo(titulo);
    setModalMensaje(mensaje);
    setModalTipo(tipo);
    setModalVisible(true);
  }

  async function guardarCambios() {
    if (!nombre.trim() || !telefono.trim() || !relacion.trim()) {
      mostrarModal(
        "Faltan datos",
        "Nombre, teléfono y relación son obligatorios.",
        "error"
      );
      return;
    }

    try {
      setGuardando(true);

      await actualizarContacto(contactoId, {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        relacion: relacion.trim(),
        correo: correo.trim() ? correo.trim() : undefined,
      });

      mostrarModal(
        "Contacto actualizado",
        "Los datos del contacto fueron guardados correctamente.",
        "exito"
      );
    } catch (error) {
      mostrarModal(
        "Error",
        "No se pudo actualizar el contacto.",
        "error"
      );
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    mostrarModal(
      "Eliminar contacto",
      "¿Seguro que quieres eliminar este contacto de emergencia?",
      "confirmar"
    );
  }

  async function ejecutarEliminar() {
    try {
      setModalVisible(false);
      setEliminando(true);

      await eliminarContacto(contactoId);

      mostrarModal(
        "Contacto eliminado",
        "El contacto fue eliminado correctamente.",
        "exito"
      );
    } catch (error) {
      mostrarModal(
        "Error",
        "No se pudo eliminar el contacto.",
        "error"
      );
    } finally {
      setEliminando(false);
    }
  }

  if (cargando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando contacto...</Text>
      </View>
    );
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

        <Text style={styles.title}>Editar Contacto</Text>
        <Text style={styles.subtitle}>
          Modifique o elimine este contacto de emergencia
        </Text>

        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {nombre ? nombre.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>

        <Text style={styles.label}>Nombre Completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. María García"
          placeholderTextColor={colors.textMuted}
          value={nombre}
          onChangeText={setNombre}
          onFocus={() => moverPantalla(160)}
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          placeholder="+56 9 0000 0000"
          placeholderTextColor={colors.textMuted}
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
          onFocus={() => moverPantalla(240)}
        />

        <Text style={styles.label}>Relación</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Madre, Hijo, Pareja"
          placeholderTextColor={colors.textMuted}
          value={relacion}
          onChangeText={setRelacion}
          onFocus={() => moverPantalla(320)}
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
          onFocus={() => moverPantalla(400)}
        />

        <Pressable
          style={[styles.saveButton, guardando && styles.buttonDisabled]}
          onPress={guardarCambios}
          disabled={guardando || eliminando}
        >
          {guardando ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.saveButtonText}>GUARDAR CAMBIOS</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.deleteButton, eliminando && styles.buttonDisabled]}
          onPress={confirmarEliminar}
          disabled={guardando || eliminando}
        >
          {eliminando ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text style={styles.deleteButtonText}>ELIMINAR CONTACTO</Text>
          )}
        </Pressable>
      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View
              style={[
                styles.modalIcon,
                modalTipo === "exito"
                  ? styles.modalIconSuccess
                  : modalTipo === "confirmar"
                  ? styles.modalIconWarning
                  : styles.modalIconError,
              ]}
            >
              <Text style={styles.modalIconText}>
                {modalTipo === "exito" ? "✓" : modalTipo === "confirmar" ? "?" : "!"}
              </Text>
            </View>

            <Text style={styles.modalTitle}>{modalTitulo}</Text>
            <Text style={styles.modalMessage}>{modalMensaje}</Text>

            {modalTipo === "confirmar" ? (
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={styles.modalDeleteButton}
                  onPress={ejecutarEliminar}
                >
                  <Text style={styles.modalDeleteText}>Eliminar</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  setModalVisible(false);

                  if (modalTitulo === "Contacto eliminado") {
                    router.back();
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Aceptar</Text>
              </Pressable>
            )}
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
    paddingBottom: 150,
  },
  logo: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
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
    fontSize: 17,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 18,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  avatarText: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "bold",
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
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 26,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  deleteButton: {
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 14,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 17,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.6,
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
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalIconSuccess: {
    backgroundColor: "#102A17",
    borderColor: colors.success,
  },
  modalIconError: {
    backgroundColor: "#3A120B",
    borderColor: colors.danger,
  },
  modalIconWarning: {
    backgroundColor: "#3A2108",
    borderColor: colors.warning,
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
  modalDeleteButton: {
    flex: 1,
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalDeleteText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "bold",
  },
});