#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>

#include "MAX30105.h"
#include "spo2_algorithm.h"

#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// ==========================
// CONFIGURACIÓN WIFI
// ==========================

const char* WIFI_SSID = "VTR-7297333";
const char* WIFI_PASSWORD = "Mt3knjhgpWqr";

// ==========================
// CONFIGURACIÓN BACKEND
// ==========================

// ID del dispositivo en Supabase
const int DISPOSITIVO_ID = 5;

String URL_BASE = "https://plenaguard-backend.onrender.com";

String URL_LECTURAS =
  URL_BASE + "/api/dispositivos/" + String(DISPOSITIVO_ID) + "/lecturas";

String URL_ESTADO =
  URL_BASE + "/api/dispositivos/" + String(DISPOSITIVO_ID) + "/estado";

// ==========================
// CONFIGURACIÓN PINES I2C
// ==========================

// Cambiar si el circuito usa otros pines
const int PIN_SDA = 8;
const int PIN_SCL = 9;

// Si todavía no tienen batería real, dejar -1
const int PIN_BATERIA = -1;

// ==========================
// CONFIGURACIÓN DE ENVÍO
// ==========================

// Para prueba: cada 60 segundos
// Después cambiar a 300000 para 5 minutos
const unsigned long INTERVALO_ENVIO = 10000;

unsigned long tiempoAnterior = 0;

// Contador para saber si lleva mucho rato sin dedo
int lecturasInvalidasSeguidas = 0;

// ==========================
// SENSORES
// ==========================

MAX30105 sensorPulso;
Adafruit_MPU6050 mpu;

// OJO:
// No usar BUFFER_SIZE porque la librería spo2_algorithm.h ya usa ese nombre.
const int SAMPLE_BUFFER_SIZE = 100;

uint32_t irBuffer[SAMPLE_BUFFER_SIZE];
uint32_t redBuffer[SAMPLE_BUFFER_SIZE];

int32_t spo2Calculado;
int8_t spo2Valido;

int32_t bpmCalculado;
int8_t bpmValido;

// ==========================
// WIFI
// ==========================

void conectarWiFi() {
  Serial.println();
  Serial.print("Conectando a WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int intentos = 0;

  while (WiFi.status() != WL_CONNECTED && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi conectado correctamente");
    Serial.print("IP local: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("No se pudo conectar al WiFi");
  }
}

void verificarWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado. Reintentando...");
    conectarWiFi();
  }
}

// ==========================
// MAX30102
// ==========================

bool iniciarMAX30102() {
  Serial.println("Iniciando MAX30102...");

  if (!sensorPulso.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("ERROR: No se detectó MAX30102.");
    return false;
  }

  byte ledBrightness = 60;
  byte sampleAverage = 4;
  byte ledMode = 2;        // Red + IR
  int sampleRate = 100;
  int pulseWidth = 411;
  int adcRange = 4096;

  sensorPulso.setup(
    ledBrightness,
    sampleAverage,
    ledMode,
    sampleRate,
    pulseWidth,
    adcRange
  );

  sensorPulso.setPulseAmplitudeRed(0x3F);
  sensorPulso.setPulseAmplitudeIR(0x3F);

  Serial.println("MAX30102 iniciado correctamente");
  return true;
}

bool leerSignosVitales(int &frecuenciaCardiaca, int &spo2) {
  Serial.println("Leyendo MAX30102...");
  Serial.println("Mantener dedo sobre el sensor.");

  for (int i = 0; i < SAMPLE_BUFFER_SIZE; i++) {
    while (!sensorPulso.available()) {
      sensorPulso.check();
    }

    redBuffer[i] = sensorPulso.getRed();
    irBuffer[i] = sensorPulso.getIR();

    sensorPulso.nextSample();
  }

  long promedioIR = 0;

  for (int i = 0; i < SAMPLE_BUFFER_SIZE; i++) {
    promedioIR += irBuffer[i];
  }

  promedioIR = promedioIR / SAMPLE_BUFFER_SIZE;

  Serial.print("Promedio IR: ");
  Serial.println(promedioIR);

  // ==========================
  // VALIDACIÓN IMPORTANTE
  // ==========================
  // Si no hay dedo o la señal es muy baja, NO se envía lectura.
  // Esto evita falsas bradicardias como 0, 10, 20 LPM.
  if (promedioIR < 70000) {
    Serial.println("No se detecta dedo en el sensor.");
    Serial.println("No se enviará lectura para evitar falsa alerta.");
    return false;
  }

  maxim_heart_rate_and_oxygen_saturation(
    irBuffer,
    SAMPLE_BUFFER_SIZE,
    redBuffer,
    &spo2Calculado,
    &spo2Valido,
    &bpmCalculado,
    &bpmValido
  );

  Serial.print("BPM calculado: ");
  Serial.println(bpmCalculado);

  Serial.print("BPM válido: ");
  Serial.println(bpmValido);

  Serial.print("SpO2 calculado: ");
  Serial.println(spo2Calculado);

  Serial.print("SpO2 válido: ");
  Serial.println(spo2Valido);

  // Validación de BPM realista.
  // Si da valores basura, no se envía.
  if (bpmValido == 1 && bpmCalculado >= 40 && bpmCalculado <= 200) {
    frecuenciaCardiaca = bpmCalculado;
  } else {
    Serial.println("BPM no válido o fuera de rango realista.");
    Serial.println("No se enviará lectura para evitar falsa alerta.");
    return false;
  }

  // SpO2 no es crítico para la app actual.
  // Si no es válido, se manda 0, pero la lectura cardíaca sí puede enviarse.
  if (spo2Valido == 1 && spo2Calculado >= 70 && spo2Calculado <= 100) {
    spo2 = spo2Calculado;
  } else {
    Serial.println("SpO2 no válido. Se enviará 0.");
    spo2 = 0;
  }

  Serial.print("BPM real enviado: ");
  Serial.println(frecuenciaCardiaca);

  Serial.print("SpO2 enviado: ");
  Serial.println(spo2);

  return true;
}

// ==========================
// MPU6050
// ==========================

bool iniciarMPU6050() {
  Serial.println("Iniciando MPU6050...");

  if (!mpu.begin()) {
    Serial.println("ERROR: No se detectó MPU6050.");
    return false;
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  Serial.println("MPU6050 iniciado correctamente");
  return true;
}

String leerMovimiento() {
  sensors_event_t aceleracion;
  sensors_event_t giro;
  sensors_event_t temperatura;

  mpu.getEvent(&aceleracion, &giro, &temperatura);

  float ax = aceleracion.acceleration.x;
  float ay = aceleracion.acceleration.y;
  float az = aceleracion.acceleration.z;

  float magnitud = sqrt((ax * ax) + (ay * ay) + (az * az));
  float magnitudG = magnitud / 9.81;

  Serial.print("Magnitud movimiento G: ");
  Serial.println(magnitudG);

  if (magnitudG > 2.5) {
    return "caida";
  }

  return "normal";
}

// ==========================
// BATERÍA
// ==========================

int leerBateria() {
  if (PIN_BATERIA == -1) {
    return 100;
  }

  int lecturaADC = analogRead(PIN_BATERIA);

  float voltajeADC = lecturaADC * (3.3 / 4095.0);
  float factorDivisor = 2.0;
  float voltajeBateria = voltajeADC * factorDivisor;

  int porcentaje = map(voltajeBateria * 100, 330, 420, 0, 100);

  if (porcentaje < 0) porcentaje = 0;
  if (porcentaje > 100) porcentaje = 100;

  Serial.print("Voltaje batería: ");
  Serial.println(voltajeBateria);

  Serial.print("Batería estimada: ");
  Serial.print(porcentaje);
  Serial.println("%");

  return porcentaje;
}

// ==========================
// HTTP
// ==========================

bool enviarLectura(
  int frecuenciaCardiaca,
  int spo2,
  String movimientoEstado,
  String modoUso
) {
  verificarWiFi();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No hay WiFi. No se envió lectura.");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;

  http.begin(client, URL_LECTURAS);
  http.addHeader("Content-Type", "application/json");

  String body = "{";
  body += "\"frecuencia_cardiaca\":" + String(frecuenciaCardiaca) + ",";
  body += "\"spo2\":" + String(spo2) + ",";
  body += "\"movimiento_estado\":\"" + movimientoEstado + "\",";
  body += "\"modo_uso\":\"" + modoUso + "\"";
  body += "}";

  int codigoRespuesta = http.POST(body);

  Serial.println("========== ENVÍO LECTURA ==========");
  Serial.print("URL: ");
  Serial.println(URL_LECTURAS);
  Serial.print("JSON enviado: ");
  Serial.println(body);
  Serial.print("Código respuesta backend: ");
  Serial.println(codigoRespuesta);

  String respuesta = http.getString();
  Serial.print("Respuesta backend: ");
  Serial.println(respuesta);
  Serial.println("===================================");

  http.end();

  return codigoRespuesta >= 200 && codigoRespuesta < 300;
}

bool enviarEstado(int bateriaPorcentaje, String wifiEstado) {
  verificarWiFi();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No hay WiFi. No se envió estado.");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;

  http.begin(client, URL_ESTADO);
  http.addHeader("Content-Type", "application/json");

  String body = "{";
  body += "\"bateria_porcentaje\":" + String(bateriaPorcentaje) + ",";
  body += "\"wifi_estado\":\"" + wifiEstado + "\"";
  body += "}";

  int codigoRespuesta = http.PATCH(body);

  Serial.println("========== ENVÍO ESTADO ==========");
  Serial.print("URL: ");
  Serial.println(URL_ESTADO);
  Serial.print("JSON enviado: ");
  Serial.println(body);
  Serial.print("Código respuesta backend: ");
  Serial.println(codigoRespuesta);

  String respuesta = http.getString();
  Serial.print("Respuesta backend: ");
  Serial.println(respuesta);
  Serial.println("==================================");

  http.end();

  return codigoRespuesta >= 200 && codigoRespuesta < 300;
}

// ==========================
// SETUP
// ==========================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("==================================");
  Serial.println("Iniciando PlenaGuard ESP32");
  Serial.print("Dispositivo ID: ");
  Serial.println(DISPOSITIVO_ID);
  Serial.println("==================================");

  Wire.begin(PIN_SDA, PIN_SCL);

  conectarWiFi();

  bool maxOk = iniciarMAX30102();
  bool mpuOk = iniciarMPU6050();

  if (!maxOk) {
    Serial.println("Advertencia: MAX30102 no está funcionando.");
  }

  if (!mpuOk) {
    Serial.println("Advertencia: MPU6050 no está funcionando.");
  }

  enviarEstado(leerBateria(), "conectado");

  Serial.println("Primera prueba de lectura...");

  int frecuenciaCardiaca = 0;
  int spo2 = 0;

  String movimientoEstado = leerMovimiento();

  bool lecturaOk = leerSignosVitales(frecuenciaCardiaca, spo2);

  if (lecturaOk) {
    lecturasInvalidasSeguidas = 0;

    enviarLectura(
      frecuenciaCardiaca,
      spo2,
      movimientoEstado,
      "normal"
    );
  } else {
    lecturasInvalidasSeguidas++;

    Serial.println("Lectura inicial inválida.");
    Serial.println("No se envió al backend para evitar falsa alerta.");
  }

  tiempoAnterior = millis();
}

// ==========================
// LOOP
// ==========================

void loop() {
  unsigned long tiempoActual = millis();

  if (tiempoActual - tiempoAnterior >= INTERVALO_ENVIO) {
    tiempoAnterior = tiempoActual;

    Serial.println();
    Serial.println("==================================");
    Serial.println("Nueva lectura programada");
    Serial.println("==================================");

    int frecuenciaCardiaca = 0;
    int spo2 = 0;
    int bateria = leerBateria();

    String movimientoEstado = leerMovimiento();
    String modoUso = "normal";

    enviarEstado(bateria, "conectado");

    bool lecturaOk = leerSignosVitales(frecuenciaCardiaca, spo2);

    if (lecturaOk) {
      lecturasInvalidasSeguidas = 0;

      enviarLectura(
        frecuenciaCardiaca,
        spo2,
        movimientoEstado,
        modoUso
      );
    } else {
      lecturasInvalidasSeguidas++;

      Serial.print("Lectura inválida número: ");
      Serial.println(lecturasInvalidasSeguidas);

      Serial.println("No se envió lectura al backend para evitar falsa alerta.");

      if (lecturasInvalidasSeguidas >= 3) {
        Serial.println("Sensor sin dedo durante varias lecturas.");
        Serial.println("Revisar que el dedo esté bien puesto sobre el MAX30102.");
      }
    }

    Serial.println("Lectura finalizada. Esperando próximo minuto...");
  }
}