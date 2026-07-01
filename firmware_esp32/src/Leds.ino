#include <Wire.h>
#include <FastLED.h>
#include "MAX30105.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// --- DEFINICIÓN DE PINES ---
#define I2C_SDA 8
#define I2C_SCL 9
#define PIN_BOTON 6
#define PIN_LED 7

// --- CONFIGURACIÓN DEL LED ---
#define NUM_LEDS 1
CRGB leds[NUM_LEDS];

// --- OBJETOS DE SENSORES ---
MAX30105 particleSensor;
Adafruit_MPU6050 mpu;

// --- VARIABLES DE ESTADO ---
bool modoEmergencia = false;
unsigned long ultimoPrint = 0;

void setup() {
  Serial.begin(115200);
  Wire.begin(I2C_SDA, I2C_SCL);

  // 1. Iniciar Botón
  pinMode(PIN_BOTON, INPUT_PULLUP);

  // 2. Iniciar LED WS2812B
  FastLED.addLeds<WS2812B, PIN_LED, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(40); 
  leds[0] = CRGB::Blue;      // Azul: Iniciando...
  FastLED.show();

  // 3. Iniciar MAX30102 (Corazón)
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("Error: MAX30102 no encontrado");
  } else {
    // Configuración optimizada que vimos antes
    particleSensor.setup(0x1F, 8, 2, 100, 411, 4096); 
  }

  // 4. Iniciar MPU6050 (Acelerómetro)
  if (!mpu.begin()) {
    Serial.println("Error: MPU6050 no encontrado");
  } else {
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
  }

  Serial.println("--- PLENAGUARD HARDWARE TEST ---");
  leds[0] = CRGB::Green; // Verde: Todo listo
  FastLED.show();
}

void loop() {
  // --- 1. LECTURA DEL BOTÓN ---
  // Si el pin lee LOW, es que el botón está cerrando el circuito a GND
  if (digitalRead(PIN_BOTON) == LOW) {
    modoEmergencia = !modoEmergencia; // Cambia el estado
    Serial.print("Estado cambiado. Emergencia: ");
    Serial.println(modoEmergencia ? "ACTIVA" : "DESACTIVADA");
    
    // Un pequeño delay para evitar que un solo clic se cuente como diez
    delay(400); 
  }

  // --- 2. CONTROL VISUAL (LED) ---
  if (modoEmergencia) {
    // Rojo parpadeante suave para indicar alerta
    static bool brilloSubiendo = true;
    static uint8_t brilloEmergencia = 50;
    
    leds[0] = CRGB::Red;
    FastLED.setBrightness(brilloEmergencia);
    FastLED.show();

    // Efecto de "respiración" en rojo
    if (brilloSubiendo) brilloEmergencia += 2; else brilloEmergencia -= 2;
    if (brilloEmergencia >= 150 || brilloEmergencia <= 30) brilloSubiendo = !brilloSubiendo;
    delay(10); 
    
  } else {
    // Estado normal: Verde fijo
    leds[0] = CRGB::Green;
    FastLED.setBrightness(40);
    FastLED.show();
  }

  // --- 3. MONITOREO DE SENSORES EN EL SERIAL ---
  if (millis() - ultimoPrint > 1000) { // Imprime cada 1 segundo
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    
    long irValue = particleSensor.getIR();

    Serial.println("---------- DATOS ----------");
    Serial.print("Aceleración Z: "); Serial.print(a.acceleration.z); Serial.println(" m/s^2");
    Serial.print("Lectura IR: "); Serial.println(irValue);
    Serial.print("Estado Botón: "); Serial.println(digitalRead(PIN_BOTON));
    
    ultimoPrint = millis();
  }
}