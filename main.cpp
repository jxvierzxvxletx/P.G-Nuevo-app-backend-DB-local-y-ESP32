#include <Arduino.h>
#include <Wire.h>

#include "api_client.h"
#include "simulador_pulso.h"
#include "sensor_mpu6050.h"

#define SDA_PIN 7
#define SCL_PIN 8
#define BAT 4

unsigned long ultimo = 0;

const long INTERVALO = 10000;

int leerBateria()
{
    return 100;
}

void setup()
{
    Serial.begin(115200);

    delay(1000);

    Wire.begin(
        SDA_PIN,
        SCL_PIN
    );

    randomSeed(
        millis()
    );

    conectarWiFi();

    if(iniciarMPU())
{
Serial.println("MPU OK");
}
else
{
Serial.println("MPU ERROR");
}
}

void loop()
{
    if (
        millis() - ultimo
        >=
        INTERVALO
    )
    {
        ultimo =
            millis();

        int bpm =
            obtenerPulso();

        String mov =
            leerMovimiento();

        String modo =
            "normal";

        if (
            mov == "caida"
        )
        {
            modo =
                "emergencia";
        }

        bool ok =
            enviarLectura(
                bpm,
                98,
                mov,
                modo,
                leerBateria()
            );

        Serial.print(
            "LPM:"
        );

        Serial.println(
            bpm
        );

        if (ok)
        {
            Serial.println(
                "ENVIADO"
            );
        }
        else
        {
            Serial.println(
                "ERROR"
            );
        }
    }

    delay(100);
}