const API_URL = "https://plenaguard-backend.onrender.com";

export async function getInicioPaciente(pacienteId: number) {
  const response = await fetch(`${API_URL}/api/pacientes/${pacienteId}/inicio`);

  if (!response.ok) {
    throw new Error("Error al obtener datos de inicio");
  }

  return response.json();
}

export async function getHistorialPaciente(pacienteId: number) {
  const response = await fetch(`${API_URL}/api/pacientes/${pacienteId}/historial`);

  if (!response.ok) {
    throw new Error("Error al obtener historial");
  }

  return response.json();
}

export async function getContactosPaciente(pacienteId: number) {
  const response = await fetch(`${API_URL}/api/pacientes/${pacienteId}/contactos`);

  if (!response.ok) {
    throw new Error("Error al obtener contactos");
  }

  return response.json();
}

export async function crearContactoPaciente(
  pacienteId: number,
  contacto: {
    nombre: string;
    telefono: string;
    relacion: string;
    correo?: string;
  }
) {
  const response = await fetch(`${API_URL}/api/pacientes/${pacienteId}/contactos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(contacto),
  });

  if (!response.ok) {
    throw new Error("Error al crear contacto");
  }

  return response.json();
}

export async function getAlertaActivaPaciente(pacienteId: number) {
  const response = await fetch(`${API_URL}/api/pacientes/${pacienteId}/alerta-activa`);

  if (!response.ok) {
    throw new Error("Error al obtener alerta activa");
  }

  return response.json();
}

export async function actualizarEstadoAlerta(alertaId: number, estado: string) {
  const response = await fetch(`${API_URL}/api/alertas/${alertaId}/estado`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ estado }),
  });

  if (!response.ok) {
    throw new Error("Error al actualizar alerta");
  }

  return response.json();
}

export async function crearPaciente(paciente: {
  nombre: string;
  fecha_nacimiento: string;
  edad: number;
}) {
  const response = await fetch(`${API_URL}/api/pacientes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paciente),
  });

  if (!response.ok) {
  const texto = await response.text();
  console.log("Error crearPaciente:", response.status, texto);
  throw new Error(`Error al crear paciente: ${response.status}`);
}

  return response.json();
}

export async function crearDispositivoPaciente(
  pacienteId: number,
  dispositivo: {
    codigo_dispositivo: string;
    bateria_porcentaje: number;
    wifi_estado: string;
  }
) {
  const response = await fetch(`${API_URL}/api/pacientes/${pacienteId}/dispositivo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dispositivo),
  });

  if (!response.ok) {
  const texto = await response.text();
  console.log("Error crearDispositivoPaciente:", response.status, texto);
  throw new Error(`Error al crear dispositivo: ${response.status}`);
}

  return response.json();
}

export async function crearLecturaDispositivo(
  dispositivoId: number,
  lectura: {
    frecuencia_cardiaca: number;
    spo2: number;
    movimiento_estado: string;
    modo_uso: string;
  }
) {
  const response = await fetch(`${API_URL}/api/dispositivos/${dispositivoId}/lecturas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(lectura),
  });

  if (!response.ok) {
  const texto = await response.text();
  console.log("Error crearLecturaDispositivo:", response.status, texto);
  throw new Error(`Error al crear lectura: ${response.status}`);
}

  return response.json();
}

export async function getContactoPorId(contactoId: number) {
  const response = await fetch(`${API_URL}/api/contactos/${contactoId}`);

  if (!response.ok) {
    throw new Error("Error al obtener contacto");
  }

  return response.json();
}

export async function actualizarContacto(
  contactoId: number,
  contacto: {
    nombre: string;
    telefono: string;
    relacion: string;
    correo?: string;
  }
) {
  const response = await fetch(`${API_URL}/api/contactos/${contactoId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(contacto),
  });

  if (!response.ok) {
    throw new Error("Error al actualizar contacto");
  }

  return response.json();
}

export async function eliminarContacto(contactoId: number) {
  const response = await fetch(`${API_URL}/api/contactos/${contactoId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Error al eliminar contacto");
  }

  return response.json();
}

export async function actualizarModoDispositivo(
  dispositivoId: number,
  modo_uso_actual: string
) {
  const response = await fetch(`${API_URL}/api/dispositivos/${dispositivoId}/modo`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ modo_uso_actual }),
  });

  if (!response.ok) {
    throw new Error("Error al actualizar modo de uso");
  }

  return response.json();
}
export async function actualizarEstadoDispositivo(
  dispositivoId: number,
  estado: {
    bateria_porcentaje?: number;
    wifi_estado?: string;
  }
) {
  const response = await fetch(`${API_URL}/api/dispositivos/${dispositivoId}/estado`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(estado),
  });

  if (!response.ok) {
    throw new Error("Error al actualizar estado del dispositivo");
  }

  return response.json();
}

export async function getContextoAlerta(alertaId: number) {
  const response = await fetch(`${API_URL}/api/alertas/${alertaId}/contexto`);

  if (!response.ok) {
    throw new Error("Error al obtener contexto de alerta");
  }

  return response.json();
}

export async function guardarContextoAlerta(
  alertaId: number,
  contexto: {
    actividad?: string;
    sintomas?: string;
    alerta_confirmada?: string;
    observacion?: string;
  }
) {
  const response = await fetch(`${API_URL}/api/alertas/${alertaId}/contexto`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(contexto),
  });

  if (!response.ok) {
    throw new Error("Error al guardar contexto de alerta");
  }

  return response.json();
}

export async function getLecturasPaciente(pacienteId: number) {
  const response = await fetch(`${API_URL}/api/pacientes/${pacienteId}/lecturas`);

  if (!response.ok) {
    throw new Error("Error al obtener lecturas del paciente");
  }

  return response.json();
}

export async function getReportePaciente(
  pacienteId: number,
  desde: string,
  hasta: string
) {
  const response = await fetch(
    `${API_URL}/api/pacientes/${pacienteId}/reporte?desde=${desde}&hasta=${hasta}`
  );

  if (!response.ok) {
    throw new Error("Error al obtener reporte del paciente");
  }

  return response.json();
}

export async function loginPaciente(pacienteId: number, nombre: string) {
  const response = await fetch(`${API_URL}/api/pacientes/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paciente_id: pacienteId,
      nombre,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.mensaje || "No se pudo iniciar sesión");
  }

  return data;
}

export async function recuperarIdPaciente(nombre: string, edad: number) {
  const response = await fetch(`${API_URL}/api/pacientes/recuperar-id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nombre,
      edad,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.mensaje || "No se pudo recuperar el ID");
  }

  return data;
}