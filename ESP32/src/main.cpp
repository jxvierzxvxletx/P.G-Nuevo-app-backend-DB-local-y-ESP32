#include <Arduino.h>
#include <Wire.h>

#include "api_client.h"
#include "simulador_pulso.h"
#include "sensor_mpu6050.h"

#define SDA_PIN 7
#define SCL_PIN 8
#define BAT 4
#define MPU_ADDR 0x68
#define PIN_BOTON 0 

unsigned long ultimo = 0;
bool enviarDatos = false; 
const long INTERVALO = 5000; 

int estadoCaida = 0;
unsigned long tiempoEstadoCaida = 0;
const float UMBRAL_CAIDA_LIBRE = 6000.0;
const float UMBRAL_IMPACTO = 35000.0;

int leerBateria() { return 100; }

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    pinMode(PIN_BOTON, INPUT_PULLUP);
    
    Wire.begin(SDA_PIN, SCL_PIN);
    Wire.setClock(100000); 
    
    randomSeed(millis());
    conectarWiFi();

    if(iniciarMPU()) {
        Serial.println("MPU OK. PlenaGuard Listo.");
    } else {
        Serial.println("MPU ERROR");
    }
}

void loop() {
    unsigned long tiempoActual = millis();

    // ==========================================
    // 0. BOTÓN DE CANCELACIÓN (Para apagar App)
    // ==========================================
    if (digitalRead(PIN_BOTON) == LOW) {
        int bpm = obtenerPulso();
        
        Serial.println("\n-----------------------------------------");
        Serial.println("🛑 BOTÓN PRESIONADO: Cancelando alerta");
        Serial.println("-> DATOS A ENVIAR:");
        Serial.println("   BPM: " + String(bpm));
        Serial.println("   Movimiento: normal");
        Serial.println("   Modo: cancelar_alerta");
        Serial.println("-----------------------------------------");
        
        if (enviarDatos) {
            bool ok = enviarLectura(bpm, 98, "normal", "cancelar_alerta", leerBateria());
            if (ok) Serial.println("✓ Recibido correctamente por el servidor");
            else Serial.println("❌ Error al enviar");
            delay(150); 
        }
        
        estadoCaida = 0;
        ultimo = millis(); 
        delay(1000); 
    }

    // ==========================================
    // 1. LÓGICA DE DETECCIÓN DE CAÍDAS (MPU6050)
    // ==========================================
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x3B); 
    
    if (Wire.endTransmission(false) == 0) {
        Wire.requestFrom((uint8_t)MPU_ADDR, (size_t)6, true); 
        
        if (Wire.available() >= 6) {
            int16_t AcX = Wire.read() << 8 | Wire.read(); 
            int16_t AcY = Wire.read() << 8 | Wire.read(); 
            int16_t AcZ = Wire.read() << 8 | Wire.read(); 
            float aTotal = sqrt(pow((float)AcX, 2) + pow((float)AcY, 2) + pow((float)AcZ, 2));

            switch(estadoCaida) {
                case 0:
                    if (aTotal < UMBRAL_CAIDA_LIBRE) { 
                        estadoCaida = 1; 
                        tiempoEstadoCaida = tiempoActual; 
                        Serial.println("\n[Caída] Fase 1: Caída libre detectada.");
                    }
                    break;
                case 1:
                    if (aTotal > UMBRAL_IMPACTO) { 
                        estadoCaida = 2; 
                        tiempoEstadoCaida = tiempoActual; 
                        Serial.println("[Caída] Fase 2: Impacto detectado!");
                    } 
                    else if (tiempoActual - tiempoEstadoCaida > 1000) { 
                        estadoCaida = 0; 
                    }
                    break;
                case 2:
                    if (tiempoActual - tiempoEstadoCaida > 500) { 
                        estadoCaida = 3; 
                        tiempoEstadoCaida = tiempoActual; 
                        Serial.println("[Caída] Fase 3: Esperando 5 seg (Evaluando si te levantas)...");
                    }
                    break;
                case 3:
                    if (aTotal < 12000 || aTotal > 20000) { 
                        estadoCaida = 0; // Falsa alarma (se movió dentro de los 5 segundos)
                        Serial.println("[Caída] Falsa alarma: Te moviste. Abortando.");
                    } 
                    else if (tiempoActual - tiempoEstadoCaida > 5000) { 
                        
                        // ========================================================================
                        // ---> ¡AQUÍ SE ACTIVA EL PROCESO PARA ENVIAR LA ALERTA DE CAÍDA! <---
                        // ========================================================================
                        int bpm = obtenerPulso();
                        
                        Serial.println("\n-----------------------------------------");
                        Serial.println("🚨 CAÍDA CONFIRMADA 🚨");
                        Serial.println("-> DATOS A ENVIAR:");
                        Serial.println("   BPM: " + String(bpm));
                        Serial.println("   Movimiento: caida");
                        Serial.println("   Modo: normal");
                        Serial.println("-----------------------------------------");
                        
                        if (enviarDatos) {
                            // Mantenemos la palabra "caida" exacta para tu backend
                            bool ok = enviarLectura(bpm, 98, "caida", "normal", leerBateria());
                            if (ok) Serial.println("✓ Recibido correctamente por el servidor");
                            else Serial.println("❌ Error al enviar");
                            delay(150); // Protección del sensor I2C
                        }
                        estadoCaida = 4; 
                        tiempoEstadoCaida = tiempoActual;
                        ultimo = tiempoActual; 
                    }
                    break;
                case 4:
                    if (tiempoActual - tiempoEstadoCaida > 10000) { 
                        estadoCaida = 0; 
                        Serial.println("\n[Sistema] Radar de caídas reiniciado y listo.");
                    } 
                    break;
            }
        }
    } else {
        Wire.endTransmission(true);
    }

    // ==========================================
    // 2. RUTINA CADA 5 SEGUNDOS
    // ==========================================
    if (tiempoActual - ultimo >= INTERVALO && estadoCaida == 0) {
        ultimo = tiempoActual;
        int bpm = obtenerPulso();
        
        Serial.println("\n-----------------------------------------");
        Serial.println("⏱️ RUTINA");
        Serial.println("-> DATOS A ENVIAR:");
        Serial.print("   BPM: " + String(bpm));
        
        if (bpm < 50) Serial.println(" [Bradicardia]");
        else if (bpm > 100) Serial.println(" [Taquicardia]");
        else Serial.println("");
        
        Serial.println("   Movimiento: normal");
        Serial.println("   Modo: normal");
        Serial.println("-----------------------------------------");
        
        if (enviarDatos) {
            bool ok = enviarLectura(bpm, 98, "normal", "normal", leerBateria());
            
            if (ok) Serial.println("✓ Recibido correctamente por el servidor");
            else Serial.println("❌ Error al enviar");
            
            delay(150);
        }
    }

    delay(20); 
}