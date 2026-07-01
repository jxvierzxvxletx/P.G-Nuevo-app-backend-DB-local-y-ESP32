CREATE TABLE pacientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE co ntactos_emergencia (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    relacion VARCHAR(50) NOT NULL,
    correo VARCHAR(100),
    creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_contacto_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE
);

CREATE TABLE dispositivos (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL UNIQUE,
    codigo_dispositivo VARCHAR(50) NOT NULL UNIQUE,
    bateria_porcentaje INTEGER,
    wifi_estado VARCHAR(30),
    ultimo_contacto TIMESTAMP,
    creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dispositivo_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE
);

CREATE TABLE lecturas (
    id SERIAL PRIMARY KEY,
    dispositivo_id INTEGER NOT NULL,
    frecuencia_cardiaca INTEGER NOT NULL,
    spo2 INTEGER,
    movimiento_estado VARCHAR(50),
    modo_uso VARCHAR(30) NOT NULL,
    creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_lectura_dispositivo
        FOREIGN KEY (dispositivo_id)
        REFERENCES dispositivos(id)
        ON DELETE CASCADE
);

CREATE TABLE alertas (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL,
    dispositivo_id INTEGER NOT NULL,
    tipo_alerta VARCHAR(30) NOT NULL,
    frecuencia_cardiaca INTEGER,
    modo_uso VARCHAR(30),
    mensaje TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'activa',
    creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revisada TIMESTAMP,

    CONSTRAINT fk_alerta_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_alerta_dispositivo
        FOREIGN KEY (dispositivo_id)
        REFERENCES dispositivos(id)
        ON DELETE CASCADE
);