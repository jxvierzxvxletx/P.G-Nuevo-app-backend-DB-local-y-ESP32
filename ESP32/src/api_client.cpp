#include "api_client.h"

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

const char* WIFI="WiFi_Mesh-903613";
const char* PASS="AT3d2STQ";

const int ID=10;

String URL=
"https://plenaguard-backend.onrender.com/api/dispositivos/"
+
String(ID)
+
"/lecturas";

void conectarWiFi()
{
WiFi.begin(WIFI,PASS);

Serial.print("Conectando");

while(WiFi.status()!=WL_CONNECTED)
{
delay(500);

Serial.print(".");
}

Serial.println("");

Serial.println("WiFi OK");
}

bool enviarLectura(
int bpm,
int spo2,
String movimiento,
String modo,
int bateria
)
{
if(WiFi.status()!=WL_CONNECTED)
return false;

WiFiClientSecure client;

client.setInsecure();

HTTPClient http;

http.begin(client,URL);

http.addHeader(
"Content-Type",
"application/json"
);

String body="{";

body+="\"frecuencia_cardiaca\":";
body+=String(bpm);

body+=",\"spo2\":";
body+=String(spo2);

body+=",\"bateria\":";
body+=String(bateria);

body+=",\"movimiento_estado\":\"";
body+=movimiento;

body+="\"";

body+=",\"modo_uso\":\"";
body+=modo;

body+="\"";

body+="}";

Serial.println(body);

int code=http.POST(body);

Serial.print("HTTP:");

Serial.println(code);

http.end();

return code>=200&&code<300;
}