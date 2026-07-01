INSERT INTO pacientes (nombre, fecha_nacimiento)
VALUES ('Don Jorge', '1948-05-20');

INSERT INTO contactos_emergencia (
    paciente_id,
    nombre,
    telefono,
    relacion,
    correo
)
VALUES 
(1, 'Jorge Jr.', '+56912345678', 'Hijo', 'jorgejr@email.com'),
(1, 'Sra. Elena', '+56987654321', 'Familia', NULL);

INSERT INTO dispositivos (
    paciente_id,
    codigo_dispositivo,
    bateria_porcentaje,
    wifi_estado,
    ultimo_contacto
)
VALUES (
    1,
    'ESP32-001',
    78,
    'conectado',
    CURRENT_TIMESTAMP
);

INSERT INTO lecturas (
    dispositivo_id,
    frecuencia_cardiaca,
    spo2,
    movimiento_estado,
    modo_uso
)
VALUES 
(1, 84, 97, 'normal', 'normal'),
(1, 42, 96, 'reposo', 'normal'),
(1, 132, 95, 'movimiento alto', 'deportivo');

INSERT INTO alertas (
    paciente_id,
    dispositivo_id,
    tipo_alerta,
    frecuencia_cardiaca,
    modo_uso,
    mensaje,
    estado
)
VALUES 
(1, 1, 'caida', 84, 'normal', 'Caída detectada', 'activa'),
(1, 1, 'bradicardia', 42, 'normal', 'Frecuencia cardíaca baja detectada', 'activa'),
(1, 1, 'taquicardia', 132, 'deportivo', 'Frecuencia cardíaca elevada detectada', 'revisada');