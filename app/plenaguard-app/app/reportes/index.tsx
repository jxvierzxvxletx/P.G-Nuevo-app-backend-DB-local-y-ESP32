import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";

import { getReportePaciente } from "../../src/api/plenaguardApi";
import { colors } from "../../src/constants/colors";

export default function ReportesScreen() {
  const [fechaInicio, setFechaInicio] = useState(new Date());
const [fechaFin, setFechaFin] = useState(new Date());

const [mostrarPicker, setMostrarPicker] = useState(false);
const [pickerCampo, setPickerCampo] = useState<
  "fechaInicio" | "horaInicio" | "fechaFin" | "horaFin"
>("fechaInicio");
const [pickerModo, setPickerModo] = useState<"date" | "time">("date");
  const [cargando, setCargando] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitulo, setModalTitulo] = useState("");
  const [modalMensaje, setModalMensaje] = useState("");

  function mostrarMensaje(titulo: string, mensaje: string) {
    setModalTitulo(titulo);
    setModalMensaje(mensaje);
    setModalVisible(true);
  }

  function formatearFecha(fecha: string) {
    if (!fecha) return "Sin fecha";

    return new Date(fecha).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function crearHtmlReporte(reporte: any) {
    const paciente = reporte.paciente;
    const dispositivo = reporte.dispositivo;
    const resumen = reporte.resumen;
    const lecturas = reporte.lecturas || [];
    const alertas = reporte.alertas || [];

    const eventosClinicos = [
  ...lecturas.map((lectura: any) => ({
    fecha: lectura.creacion,
    tipo_registro: "Lectura",
    tipo_alerta: "-",
    frecuencia_cardiaca: lectura.frecuencia_cardiaca,
    modo_uso: lectura.modo_uso || "normal",
    movimiento_estado: lectura.movimiento_estado || "normal",
    estado: "-",
    actividad: "-",
    sintomas: "-",
    alerta_confirmada: "-",
    observacion: "-",
  })),

  ...alertas.map((alerta: any) => ({
    fecha: alerta.creacion,
    tipo_registro: "Alerta",
    tipo_alerta: alerta.tipo_alerta || "alerta",
    frecuencia_cardiaca: alerta.frecuencia_cardiaca,
    modo_uso: alerta.modo_uso || "normal",
    movimiento_estado: "-",
    estado: alerta.estado || "pendiente",
    actividad: alerta.actividad || "Sin registro",
    sintomas: alerta.sintomas || "Sin registro",
    alerta_confirmada: alerta.alerta_confirmada || "Sin registro",
    observacion: alerta.observacion || "Sin registro",
  })),
].sort(
  (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
);

const filasEventosClinicos = eventosClinicos
  .map(
    (evento: any) => `
    <tr class="${evento.tipo_registro === "Alerta" ? "alert-row" : ""}">
      <td>${formatearFecha(evento.fecha)}</td>
      <td>${evento.tipo_registro}</td>
      <td>${evento.tipo_alerta}</td>
      <td>${evento.frecuencia_cardiaca ?? "Sin dato"} LPM</td>
      <td>${evento.modo_uso}</td>
      <td>${evento.movimiento_estado}</td>
      <td>${evento.estado}</td>
      <td>${evento.actividad}</td>
      <td>${evento.sintomas}</td>
      <td>${evento.alerta_confirmada}</td>
      <td>${evento.observacion}</td>
    </tr>
  `
  )
  .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
  @page {
    margin: 32px 28px;
  }

  body {
    font-family: Arial, sans-serif;
    padding: 28px;
    color: #111827;
  }

  h1 {
    color: #6D28D9;
    font-size: 28px;
    margin-bottom: 4px;
  }

  h2 {
    font-size: 20px;
    margin-top: 28px;
    border-bottom: 2px solid #6D28D9;
    padding-bottom: 6px;
  }

  p {
    font-size: 14px;
    line-height: 1.5;
  }

  .box {
    background: #F3F4F6;
    border: 1px solid #E5E7EB;
    border-radius: 10px;
    padding: 14px;
    margin-top: 12px;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .item {
    background: #FFFFFF;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 10px;
  }

  .label {
    font-size: 12px;
    color: #6B7280;
  }

  .value {
    font-size: 16px;
    font-weight: bold;
    margin-top: 4px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 18px;
    font-size: 11px;
    page-break-inside: auto;
  }

  thead {
    display: table-header-group;
  }

  tbody {
    display: table-row-group;
  }

  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  th {
    background: #6D28D9;
    color: white;
    padding: 8px;
    text-align: left;
  }

  td {
    border: 1px solid #E5E7EB;
    padding: 7px;
    vertical-align: top;
  }

  tr:nth-child(even) {
    background: #F9FAFB;
  }

  tr.alert-row {
  background: #FEF2F2 !important;
}

tr.alert-row td {
  background: #FEF2F2 !important;
  border-color: #FECACA;
}

  .footer {
    margin-top: 28px;
    font-size: 11px;
    color: #6B7280;
  }
</style>
        </head>

        <body>
          <h1>PlenaGuard</h1>
          <p>Registro cardíaco generado desde la aplicación.</p>

          <h2>Datos del paciente</h2>
          <div class="box">
            <p><strong>Paciente:</strong> ${paciente?.nombre || "Sin dato"}</p>
            <p><strong>Edad:</strong> ${paciente?.edad ?? "Sin dato"} años</p>
            <p><strong>Periodo:</strong> ${formatearFecha(fechaInicio.toISOString())} hasta ${formatearFecha(fechaFin.toISOString())}</p>
          </div>

          

          <h2>Resumen del periodo</h2>
          <div class="grid">
            <div class="item">
              <div class="label">Total de lecturas</div>
              <div class="value">${resumen?.total_lecturas ?? 0}</div>
            </div>
            <div class="item">
              <div class="label">Promedio LPM</div>
              <div class="value">${resumen?.promedio_lpm ?? "Sin dato"}</div>
            </div>
            <div class="item">
              <div class="label">Mínimo LPM</div>
              <div class="value">${resumen?.min_lpm ?? "Sin dato"}</div>
            </div>
            <div class="item">
              <div class="label">Máximo LPM</div>
              <div class="value">${resumen?.max_lpm ?? "Sin dato"}</div>
            </div>
            <div class="item">
              <div class="label">Total de alertas</div>
              <div class="value">${resumen?.total_alertas ?? 0}</div>
            </div>
            <div class="item">
              <div class="label">Caídas</div>
              <div class="value">${resumen?.total_caidas ?? 0}</div>
            </div>
            <div class="item">
  <div class="label">Bradicardias</div>
  <div class="value">${resumen?.total_bradicardia ?? 0}</div>
</div>
<div class="item">
  <div class="label">Taquicardias</div>
  <div class="value">${resumen?.total_taquicardia ?? 0}</div>
</div>
          </div>

          <h2>Registro cronológico cardíaco</h2>
<p>
  Esta tabla muestra las lecturas cardíacas y las alertas en orden de fecha.
  Esto permite revisar qué pulsaciones fueron registradas antes, durante y después de una alerta.
</p>

<table>
  <thead>
    <tr>
      <th>Fecha</th>
      <th>Registro</th>
      <th>Tipo alerta</th>
      <th>LPM</th>
      <th>Modo</th>
      <th>Movimiento</th>
      <th>Estado</th>
      <th>Actividad</th>
      <th>Síntomas</th>
      <th>Confirmada</th>
      <th>Observación</th>
    </tr>
  </thead>
  <tbody>
    ${
      filasEventosClinicos ||
      `<tr><td colspan="11">No hay registros en este periodo.</td></tr>`
    }
  </tbody>
</table>

          <p class="footer">
            Este documento corresponde a un registro generado por PlenaGuard. 
            La información debe ser revisada por un profesional de salud cuando corresponda.
          </p>
        </body>
      </html>
    `;
  }

  function abrirPicker(
  campo: "fechaInicio" | "horaInicio" | "fechaFin" | "horaFin",
  modo: "date" | "time"
) {
  setPickerCampo(campo);
  setPickerModo(modo);
  setMostrarPicker(true);
}

function aplicarCambioPicker(event: any, selectedDate?: Date) {
  setMostrarPicker(false);

  if (!selectedDate) return;

  if (pickerCampo === "fechaInicio") {
    const nuevaFecha = new Date(fechaInicio);
    nuevaFecha.setFullYear(selectedDate.getFullYear());
    nuevaFecha.setMonth(selectedDate.getMonth());
    nuevaFecha.setDate(selectedDate.getDate());
    setFechaInicio(nuevaFecha);
  }

  if (pickerCampo === "horaInicio") {
    const nuevaFecha = new Date(fechaInicio);
    nuevaFecha.setHours(selectedDate.getHours());
    nuevaFecha.setMinutes(selectedDate.getMinutes());
    nuevaFecha.setSeconds(0);
    nuevaFecha.setMilliseconds(0);
    setFechaInicio(nuevaFecha);
  }

  if (pickerCampo === "fechaFin") {
    const nuevaFecha = new Date(fechaFin);
    nuevaFecha.setFullYear(selectedDate.getFullYear());
    nuevaFecha.setMonth(selectedDate.getMonth());
    nuevaFecha.setDate(selectedDate.getDate());
    setFechaFin(nuevaFecha);
  }

  if (pickerCampo === "horaFin") {
    const nuevaFecha = new Date(fechaFin);
    nuevaFecha.setHours(selectedDate.getHours());
    nuevaFecha.setMinutes(selectedDate.getMinutes());
    nuevaFecha.setSeconds(59);
    nuevaFecha.setMilliseconds(999);
    setFechaFin(nuevaFecha);
  }
}

function formatearFechaArchivo(fecha: Date) {
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();

  return `${dia}-${mes}-${anio}`;
}

async function abrirPdf(uriPdf: string) {
  try {
    if (Platform.OS === "android") {
      const contentUri = await FileSystem.getContentUriAsync(uriPdf);

      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        type: "application/pdf",
        flags: 1,
      });

      return;
    }

    const disponible = await Sharing.isAvailableAsync();

    if (disponible) {
      await Sharing.shareAsync(uriPdf, {
        mimeType: "application/pdf",
        dialogTitle: "Abrir registro cardíaco",
        UTI: "com.adobe.pdf",
      });
    }
  } catch (error) {
    console.log("Error al abrir PDF:", error);

    const disponible = await Sharing.isAvailableAsync();

    if (disponible) {
      await Sharing.shareAsync(uriPdf, {
        mimeType: "application/pdf",
        dialogTitle: "Abrir registro cardíaco",
        UTI: "com.adobe.pdf",
      });
    } else {
      mostrarMensaje(
        "PDF generado",
        "El PDF fue generado, pero no se pudo abrir automáticamente."
      );
    }
  }
}

function obtenerNombrePdf() {
  const inicio = formatearFechaArchivo(fechaInicio);
  const fin = formatearFechaArchivo(fechaFin);

  if (inicio === fin) {
    return `registro-cardiaco-${inicio}.pdf`;
  }

  return `registro-cardiaco-${inicio}-al-${fin}.pdf`;
}

function seleccionarDiaCompleto() {
  const inicio = new Date(fechaInicio);
  inicio.setHours(0, 0, 0, 0);

  const fin = new Date(fechaInicio);
  fin.setHours(23, 59, 59, 999);

  setFechaInicio(inicio);
  setFechaFin(fin);
}

function formatearFechaCorta(fecha: Date) {
  return fecha.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatearHora(fecha: Date) {
  return fecha.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fechaParaApi(fecha: Date) {
  return fecha.toISOString();
}

  async function generarPdf() {
  try {
    setCargando(true);
    Keyboard.dismiss();

    const pacienteGuardado = await AsyncStorage.getItem("pacienteId");

    if (!pacienteGuardado) {
      mostrarMensaje("Sin paciente", "No se encontró el perfil del paciente.");
      return;
    }

    if (fechaFin < fechaInicio) {
      mostrarMensaje(
        "Rango inválido",
        "La fecha de término no puede ser anterior a la fecha de inicio."
      );
      return;
    }

    const reporte = await getReportePaciente(
      Number(pacienteGuardado),
      fechaParaApi(fechaInicio),
      fechaParaApi(fechaFin)
    );

    const html = crearHtmlReporte(reporte);

    const archivo = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const nombrePdf = obtenerNombrePdf();

    const carpetaTemporal =
      FileSystem.cacheDirectory || FileSystem.documentDirectory;

    if (!carpetaTemporal) {
      await abrirPdf(archivo.uri);
      return;
    }

    const nuevoArchivo = `${carpetaTemporal}${nombrePdf}`;

    await FileSystem.copyAsync({
      from: archivo.uri,
      to: nuevoArchivo,
    });

    await abrirPdf(nuevoArchivo);
  } catch (error) {
    console.log("Error al generar PDF:", error);
    mostrarMensaje("Error", "No se pudo generar el registro cardíaco en PDF.");
  } finally {
    setCargando(false);
  }
}

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>
          Plena<Text style={styles.logoAccent}>Guard</Text>
        </Text>

        <Text style={styles.title}>Registro cardíaco</Text>
        <Text style={styles.subtitle}>
          Genere un PDF con lecturas, alertas y observaciones del paciente.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Periodo del registro</Text>

          <Text style={styles.label}>Fecha y hora de inicio</Text>

<View style={styles.row}>
  <TouchableOpacity
    style={styles.dateButton}
    onPress={() => abrirPicker("fechaInicio", "date")}
  >
    <Text style={styles.dateButtonLabel}>Fecha</Text>
    <Text style={styles.dateButtonValue}>{formatearFechaCorta(fechaInicio)}</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.dateButton}
    onPress={() => abrirPicker("horaInicio", "time")}
  >
    <Text style={styles.dateButtonLabel}>Hora</Text>
    <Text style={styles.dateButtonValue}>{formatearHora(fechaInicio)}</Text>
  </TouchableOpacity>
</View>

<Text style={styles.label}>Fecha y hora de término</Text>

<View style={styles.row}>
  <TouchableOpacity
    style={styles.dateButton}
    onPress={() => abrirPicker("fechaFin", "date")}
  >
    <Text style={styles.dateButtonLabel}>Fecha</Text>
    <Text style={styles.dateButtonValue}>{formatearFechaCorta(fechaFin)}</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.dateButton}
    onPress={() => abrirPicker("horaFin", "time")}
  >
    <Text style={styles.dateButtonLabel}>Hora</Text>
    <Text style={styles.dateButtonValue}>{formatearHora(fechaFin)}</Text>
  </TouchableOpacity>
</View>

<TouchableOpacity style={styles.fullDayButton} onPress={seleccionarDiaCompleto}>
  <Text style={styles.fullDayButtonText}>USAR DÍA COMPLETO</Text>
</TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={generarPdf}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.primaryButtonText}>
                OBTENER REGISTRO CARDÍACO EN PDF
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>El PDF incluirá</Text>
          <Text style={styles.infoText}>• Datos del paciente y dispositivo.</Text>
          <Text style={styles.infoText}>• Lecturas de frecuencia cardíaca.</Text>
          <Text style={styles.infoText}>• Alertas de bradicardia, taquicardia o caída.</Text>
          <Text style={styles.infoText}>• Observaciones ingresadas por el cuidador.</Text>
          <Text style={styles.infoText}>• Resumen del periodo seleccionado.</Text>
        </View>
      </ScrollView>

      {mostrarPicker && (
  <DateTimePicker
    value={
      pickerCampo === "fechaInicio" || pickerCampo === "horaInicio"
        ? fechaInicio
        : fechaFin
    }
    mode={pickerModo}
    display="default"
    is24Hour
    onChange={aplicarCambioPicker}
  />
)}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modalTitulo}</Text>
            <Text style={styles.modalMessage}>{modalMensaje}</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
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
    paddingTop: 55,
    paddingBottom: 70,
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
    fontSize: 35,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 17,
    textAlign: "center",
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 28,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 18,
  },
  label: {
    color: colors.textMuted,
    fontSize: 16,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#0F0F14",
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 24,
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  secondaryButton: {
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 14,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  infoCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    marginTop: 22,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 12,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  modalMessage: {
    color: colors.textMuted,
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
  },
  row: {
  flexDirection: "row",
  gap: 12,
},

dateButton: {
  flex: 1,
  backgroundColor: "#0F0F14",
  borderColor: colors.cardBorder,
  borderWidth: 1,
  borderRadius: 14,
  paddingVertical: 14,
  paddingHorizontal: 14,
},

dateButtonLabel: {
  color: colors.textMuted,
  fontSize: 13,
  marginBottom: 6,
},

dateButtonValue: {
  color: colors.text,
  fontSize: 17,
  fontWeight: "800",
},

fullDayButton: {
  borderWidth: 1,
  borderColor: colors.primary,
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: "center",
  marginTop: 16,
  backgroundColor: "rgba(139, 92, 246, 0.10)",
},

fullDayButtonText: {
  color: colors.primary,
  fontSize: 14,
  fontWeight: "800",
  letterSpacing: 0.7,
},
});