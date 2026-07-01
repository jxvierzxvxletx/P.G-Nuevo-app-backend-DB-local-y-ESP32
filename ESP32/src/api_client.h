#ifndef API_CLIENT_H
#define API_CLIENT_H

#include <Arduino.h>

void conectarWiFi();

bool enviarLectura(
int bpm,
int spo2,
String movimiento,
String modo,
int bateria
);

#endif
