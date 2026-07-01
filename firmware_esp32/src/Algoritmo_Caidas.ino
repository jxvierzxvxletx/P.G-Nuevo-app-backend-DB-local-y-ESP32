#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h" 

// --- CONFIGURACIÓN API & WIFI ---
const char* WIFI_SSID = "VTR-7297333";
const char* WIFI_PASSWORD = "Mt3knjhgpWqr";
const int DISPOSITIVO_ID = 5;
String URL_BASE = "https://plenaguard-backend.onrender.com";
String URL_LECTURAS = URL_BASE + "/api/dispositivos/" + String(DISPOSITIVO_ID) + "/lecturas";

// --- PINES I2C ---
#define I2C_SDA 8
#define I2C_SCL 9

// --- CONFIGURACIÓN MPU6050 (CAÍDAS) ---
const int MPU_ADDR = 0x68; 
const float UMBRAL_CAIDA_LIBRE = 8000.0;  
const float UMBRAL_IMPACTO = 40000.0;     
int estadoCaida = 0; 
unsigned long tiempoEstadoCaida = 0;

// --- CONFIGURACIÓN MAX30102 (PULSO) ---
MAX30105 sensorPulso;
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE]; 
byte rateSpot = 0;
long lastBeat = 0; 
float beatsPerMinute = 0;
int beatAvg = 0;
String estadoPulso = "sin_dedo";

// --- TIMERS ---
const unsigned long INTERVALO_PRUEBA = 10000; 
unsigned long ultimoEnvioRutina = 0;

// --- FUNCIÓN PARA ENVIAR DATOS A LA API ---
void enviarDato(int bpm, String mov, String modo) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Error: WiFi desconectado.");
    return;
  }
  
  WiFiClientSecure client; 
  client.setInsecure(); 
  HTTPClient http;
  
  http.begin(client, URL_LECTURAS);
  http.addHeader("Content-Type", "application/json");
  
  String body = "{\"frecuencia_cardiaca\":" + String(bpm) + ",\"spo2\":0,\"movimiento_estado\":\"" + mov + "\",\"modo_uso\":\"" + modo + "\"}";
  
  Serial.println("\n>>> [API POST]: " + body);
  int code = http.POST(body);
  Serial.println("Status API: " + String(code));
  http.end();
}

void setup() {
  Serial.begin(115200);
  Wire.begin(I2C_SDA, I2C_SCL); 
  
  // 1. Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n✅ WiFi Conectado.");

  // 2. MPU6050 (Acelerómetro)
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); 
  Wire.write(0);    
  Wire.endTransmission(true);
  Serial.println("✅ MPU6050 Listo.");

  // 3. MAX30102 (Pulso)
  if (!sensorPulso.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("❌ ERROR: MAX30102 no encontrado.");
    while(1); 
  }
  sensorPulso.setup(); 
  sensorPulso.setPulseAmplitudeRed(0x0A); 
  sensorPulso.setPulseAmplitudeIR(0x1F);  
  Serial.println("✅ MAX30102 Listo.");
}

void loop() {
  unsigned long tiempoActual = millis();

  // ==========================================
  // 1. LÓGICA DE DETECCIÓN DE CAÍDAS (MPU6050)
  // ==========================================
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); 
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 6, true); 
  int16_t AcX = Wire.read() << 8 | Wire.read(); 
  int16_t AcY = Wire.read() << 8 | Wire.read(); 
  int16_t AcZ = Wire.read() << 8 | Wire.read(); 
  float aTotal = sqrt(pow((float)AcX, 2) + pow((float)AcY, 2) + pow((float)AcZ, 2));

  switch(estadoCaida) {
    case 0:
      if (aTotal < UMBRAL_CAIDA_LIBRE) { estadoCaida = 1; tiempoEstadoCaida = tiempoActual; }
      break;
    case 1:
      if (aTotal > UMBRAL_IMPACTO) { estadoCaida = 2; tiempoEstadoCaida = tiempoActual; } 
      else if (tiempoActual - tiempoEstadoCaida > 1000) { estadoCaida = 0; }
      break;
    case 2:
      if (tiempoActual - tiempoEstadoCaida > 500) { estadoCaida = 3; tiempoEstadoCaida = tiempoActual; }
      break;
    case 3:
      if (aTotal < 12000 || aTotal > 20000) { estadoCaida = 0; } // Falsa alarma (se movió)
      else if (tiempoActual - tiempoEstadoCaida > 5000) {
        Serial.println("🚨 CAÍDA CONFIRMADA 🚨");
        enviarDato(beatAvg, "caida_detectada", "emergencia_medica"); // Prioridad 1
        estadoCaida = 4; 
        tiempoEstadoCaida = tiempoActual;
        ultimoEnvioRutina = tiempoActual; // Reinicia el timer de rutina
      }
      break;
    case 4:
      if (tiempoActual - tiempoEstadoCaida > 10000) { estadoCaida = 0; } // 10s de bloqueo post-caída
      break;
  }

  // ==========================================
  // 2. LÓGICA DE PULSO CON BLOQUEO (MAX30102)
  // ==========================================
  long irValue = sensorPulso.getIR(); 

  if (irValue < 50000) {
    // BLOQUEO: NO HAY DEDO / DEDO MAL PUESTO
    beatsPerMinute = 0;
    beatAvg = 0; // Se resetea a cero
    estadoPulso = "sin_dedo";
    // Limpiamos el historial de promedios para que no quede guardado un pulso viejo
    for(byte i=0; i<RATE_SIZE; i++) rates[i] = 0; 
  } 
  else {
    // HABILITADO: HAY DEDO DETECTADO
    if (checkForBeat(irValue) == true) {
      long delta = tiempoActual - lastBeat;
      lastBeat = tiempoActual;
      beatsPerMinute = 60 / (delta / 1000.0);

      if (beatsPerMinute < 255 && beatsPerMinute > 20) {
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= RATE_SIZE;

        beatAvg = 0;
        for (byte x = 0 ; x < RATE_SIZE ; x++) beatAvg += rates[x];
        beatAvg /= RATE_SIZE;

        // Evaluación médica SOLO si ya tenemos un promedio real (>0)
        // Y asegurándonos de que no haya una caída en proceso
        if (beatAvg > 0 && estadoCaida == 0) {
          if (beatAvg < 40) estadoPulso = "bradicardia_critica";
          else if (beatAvg > 150) estadoPulso = "taquicardia_critica";
          else estadoPulso = "normal";

          // Disparador de emergencia por pulso
          if (estadoPulso == "bradicardia_critica" || estadoPulso == "taquicardia_critica") {
             Serial.println("⚠️ ALERTA MÉDICA: " + estadoPulso);
             enviarDato(beatAvg, "normal", "emergencia_medica");
             ultimoEnvioRutina = tiempoActual; 
          }
        }
      }
    }
  }

  // ==========================================
  // 3. ENVÍO DE RUTINA (CADA 10 SEGUNDOS)
  // ==========================================
  if (tiempoActual - ultimoEnvioRutina >= INTERVALO_PRUEBA && estadoCaida == 0) {
    ultimoEnvioRutina = tiempoActual;
    String modoAEnviar = (estadoPulso == "sin_dedo") ? "inactivo" : "rutina";
    enviarDato(beatAvg, "normal", modoAEnviar);
  }

  delay(20); 
}