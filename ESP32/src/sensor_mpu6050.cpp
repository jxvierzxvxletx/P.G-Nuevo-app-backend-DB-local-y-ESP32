#include <Arduino.h>
#include <Wire.h>

#include "sensor_mpu6050.h"

#define MPU 0x68

bool iniciarMPU()
{
Wire.beginTransmission(MPU);

Wire.write(0x6B);

Wire.write(0);

byte estado =
Wire.endTransmission(true);

if(estado==0)
{
Serial.println("MPU OK");

return true;
}

Serial.println("MPU ERROR");

return false;
}

String leerMovimiento()
{

Wire.beginTransmission(MPU);

Wire.write(0x3B);

Wire.endTransmission(false);

Wire.requestFrom(MPU,6,true);

if(Wire.available()<6)
{
return "normal";
}

int16_t ax=
Wire.read()<<8|
Wire.read();

int16_t ay=
Wire.read()<<8|
Wire.read();

int16_t az=
Wire.read()<<8|
Wire.read();

float total=
sqrt(
(float)ax*ax+
(float)ay*ay+
(float)az*az
);

if(total>40000)
{
return "caida_detectada";
}

return "normal";

}