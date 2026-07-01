import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  actualizarEstadoAlerta,
  getAlertaActivaPaciente,
} from "../api/plenaguardApi";
import ActiveAlertScreen from "../screens/ActiveAlertScreen";

export default function GlobalAlertLayer() {
  const [alertaActiva, setAlertaActiva] = useState<any>(null);

  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval>;

    async function revisarAlerta() {
      try {
        const pacienteGuardado = await AsyncStorage.getItem("pacienteId");

        if (!pacienteGuardado) return;

        const dataAlerta = await getAlertaActivaPaciente(
          Number(pacienteGuardado)
        );

        setAlertaActiva(dataAlerta.hay_alerta ? dataAlerta.alerta : null);
      } catch (error) {
        console.log("Error al revisar alerta global:", error);
      }
    }

    revisarAlerta();

    intervalo = setInterval(() => {
      revisarAlerta();
    }, 3000);

    return () => clearInterval(intervalo);
  }, []);

  async function cancelarAlerta() {
    if (!alertaActiva) return;

    try {
      await actualizarEstadoAlerta(alertaActiva.id, "cancelada");
      setAlertaActiva(null);
    } catch (error) {
      console.log("No se pudo cancelar la alerta:", error);
    }
  }

  async function atenderAlerta() {
    if (!alertaActiva) return;

    try {
      await actualizarEstadoAlerta(alertaActiva.id, "revisada");
      setAlertaActiva(null);
    } catch (error) {
      console.log("No se pudo atender la alerta:", error);
    }
  }

  if (!alertaActiva) return null;

  return (
    <View style={styles.overlay}>
      <ActiveAlertScreen
        alerta={alertaActiva}
        onCancelar={cancelarAlerta}
        onAtendida={atenderAlerta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "#000",
  },
});