import AsyncStorage from "@react-native-async-storage/async-storage";

export async function guardarCache(clave: string, data: any) {
  try {
    const payload = {
      data,
      fecha_guardado: new Date().toISOString(),
    };

    await AsyncStorage.setItem(clave, JSON.stringify(payload));
  } catch (error) {
    console.log("Error al guardar cache:", error);
  }
}

export async function obtenerCache(clave: string) {
  try {
    const guardado = await AsyncStorage.getItem(clave);

    if (!guardado) {
      return null;
    }

    return JSON.parse(guardado);
  } catch (error) {
    console.log("Error al obtener cache:", error);
    return null;
  }
}