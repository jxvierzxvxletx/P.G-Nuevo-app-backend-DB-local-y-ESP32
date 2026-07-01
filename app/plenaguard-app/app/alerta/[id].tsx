import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  getContextoAlerta,
  guardarContextoAlerta,
} from "../../src/api/plenaguardApi";

const colors = {
  background: "#0B0B0F",
  card: "#17171C",
  card2: "#202027",
  text: "#FFFFFF",
  muted: "#B8B8C0",
  primary: "#8B5CF6",
  success: "#22C55E",
  danger: "#EF4444",
  border: "#2A2A33",
};

export default function DetalleAlertaScreen() {
  const scrollRef = useRef<ScrollView>(null);

  const { id } = useLocalSearchParams();

  const alertaId = Number(id);

  const [actividad, setActividad] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [alertaConfirmada, setAlertaConfirmada] = useState("");
  const [observacion, setObservacion] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
const [modalTitulo, setModalTitulo] = useState("");
const [modalMensaje, setModalMensaje] = useState("");
const [guardadoCorrecto, setGuardadoCorrecto] = useState(false);

  useEffect(() => {
    cargarContexto();
  }, [alertaId]);

  async function cargarContexto() {
    try {
      setCargando(true);

      const contexto = await getContextoAlerta(alertaId);

      if (contexto) {
        setActividad(contexto.actividad || "");
        setSintomas(contexto.sintomas || "");
        setAlertaConfirmada(contexto.alerta_confirmada || "");
        setObservacion(contexto.observacion || "");
      }
    } catch (error) {
      console.log("Error al cargar contexto:", error);
    } finally {
      setCargando(false);
    }
  }

  async function guardarContexto() {
  try {
    setGuardando(true);
    Keyboard.dismiss();

    await guardarContextoAlerta(alertaId, {
      actividad,
      sintomas,
      alerta_confirmada: alertaConfirmada,
      observacion,
    });

    setModalTitulo("Contexto guardado");
    setModalMensaje("La información de la alerta fue guardada correctamente.");
    setGuardadoCorrecto(true);
    setModalVisible(true);
  } catch (error) {
    console.log("Error al guardar contexto:", error);

    setModalTitulo("No se pudo guardar");
    setModalMensaje("Revisa tu conexión e intenta nuevamente.");
    setGuardadoCorrecto(false);
    setModalVisible(true);
  } finally {
    setGuardando(false);
  }
}

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando alerta...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
  style={styles.keyboard}
  behavior={Platform.OS === "ios" ? "padding" : undefined}
>
  <ScrollView
  ref={scrollRef}
  style={styles.container}
  contentContainerStyle={styles.content}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
>
        <Text style={styles.title}>Detalle de alerta</Text>
<Text style={styles.subtitle}>
  Registre información útil sobre lo ocurrido durante la alerta.
</Text>

<View style={styles.card}>
          <Text style={styles.label}>¿Qué esta(ba) haciendo el paciente?</Text>
          <TextInput
  style={styles.input}
  placeholder="Ej. Reposando, caminando, durmiendo"
  placeholderTextColor={colors.muted}
  value={actividad}
  onChangeText={setActividad}
  returnKeyType="done"
  onSubmitEditing={Keyboard.dismiss}
  onFocus={() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: 120,
        animated: true,
      });
    }, 250);
  }}
/>

          <Text style={styles.label}>¿Presentó síntomas?</Text>
          <TextInput
  style={styles.input}
  placeholder="Ej. Mareo, dolor, falta de aire"
  placeholderTextColor={colors.muted}
  value={sintomas}
  onChangeText={setSintomas}
  returnKeyType="done"
  onSubmitEditing={Keyboard.dismiss}
  onFocus={() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: 260,
        animated: true,
      });
    }, 250);
  }}
/>

          <Text style={styles.label}>¿La alerta fue confirmada?</Text>

          <View style={styles.optionRow}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                alertaConfirmada === "Sí" && styles.optionSelected,
              ]}
              onPress={() => setAlertaConfirmada("Sí")}
            >
              <Text style={styles.optionText}>Sí</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                alertaConfirmada === "No" && styles.optionSelected,
              ]}
              onPress={() => setAlertaConfirmada("No")}
            >
              <Text style={styles.optionText}>No</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                alertaConfirmada === "No se sabe" && styles.optionSelected,
              ]}
              onPress={() => setAlertaConfirmada("No se sabe")}
            >
              <Text style={styles.optionText}>No se sabe</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Observación del cuidador o paciente</Text>
          <TextInput
  style={[styles.input, styles.textArea]}
  placeholder="Escriba una observación breve"
  placeholderTextColor={colors.muted}
  value={observacion}
  onChangeText={setObservacion}
  multiline
  textAlignVertical="top"
  onFocus={() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: 430,
        animated: true,
      });
    }, 250);
  }}
/>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={guardarContexto}
            disabled={guardando}
          >
            <Text style={styles.saveButtonText}>
              {guardando ? "Guardando..." : "Guardar contexto"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal
  visible={modalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalCard}>
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

      <TouchableOpacity
        style={styles.modalButton}
        onPress={() => {
          setModalVisible(false);

          if (guardadoCorrecto) {
            router.back();
          }
        }}
      >
        <Text style={styles.modalButtonText}>Aceptar</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
  paddingHorizontal: 24,
  paddingTop: 8,
  paddingBottom: 220,
},
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: colors.muted,
    marginTop: 12,
    fontSize: 18,
  },
  logo: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 35,
  },
  logoAccent: {
    color: colors.primary,
  },
  title: {
  color: colors.text,
  fontSize: 32,
  fontWeight: "800",
  textAlign: "center",
  marginTop: 0,
},
  subtitle: {
  color: "#B8B8C0",
  fontSize: 17,
  textAlign: "center",
  marginTop: 8,
  lineHeight: 25,
  paddingHorizontal: 10,
},
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 22,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.muted,
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  value: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#0F0F14",
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  optionButton: {
    flex: 1,
    backgroundColor: colors.card2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: "#2B1B52",
  },
  optionText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 28,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  backButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.72)",
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 28,
},

modalCard: {
  width: "100%",
  backgroundColor: colors.card,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 24,
  alignItems: "center",
},

modalIcon: {
  width: 64,
  height: 64,
  borderRadius: 32,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 2,
  marginBottom: 16,
},

modalIconSuccess: {
  borderColor: colors.success,
  backgroundColor: "rgba(34, 197, 94, 0.12)",
},

modalIconError: {
  borderColor: colors.danger,
  backgroundColor: "rgba(239, 68, 68, 0.12)",
},

modalIconText: {
  color: colors.text,
  fontSize: 30,
  fontWeight: "900",
},

modalTitle: {
  color: colors.text,
  fontSize: 24,
  fontWeight: "800",
  textAlign: "center",
  marginBottom: 10,
},

modalMessage: {
  color: colors.muted,
  fontSize: 17,
  textAlign: "center",
  lineHeight: 24,
  marginBottom: 24,
},

modalButton: {
  width: "100%",
  backgroundColor: colors.primary,
  paddingVertical: 16,
  borderRadius: 16,
  alignItems: "center",
},

modalButtonText: {
  color: colors.text,
  fontSize: 17,
  fontWeight: "800",
  letterSpacing: 1,
},
});