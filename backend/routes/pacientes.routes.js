const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query("SELECT * FROM pacientes ORDER BY id ASC");

        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener pacientes:", error);
        res.status(500).json({
            mensaje: "Error al obtener pacientes"
        });
    }
});

router.post("/", async (req, res) => {
    try {
        const { nombre, fecha_nacimiento, edad } = req.body;

        const consulta = `
            INSERT INTO pacientes (
    nombre,
    fecha_nacimiento,
    edad
)
VALUES ($1, $2, $3)
RETURNING *;
        `;

        const valores = [
    nombre,
    fecha_nacimiento,
    edad
];

        const resultado = await pool.query(consulta, valores);

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al crear paciente:", error);
        res.status(500).json({
            mensaje: "Error al crear paciente"
        });
    }
});


router.post("/login", async (req, res) => {
  try {
    const { paciente_id, nombre } = req.body;

    if (!paciente_id || !nombre) {
      return res.status(400).json({
        mensaje: "Debe ingresar ID y nombre del paciente",
      });
    }

    const resultado = await pool.query(
      `
      SELECT 
        id,
        nombre,
        fecha_nacimiento,
        edad,
        creacion
      FROM pacientes
      WHERE id = $1
        AND LOWER(TRIM(nombre)) = LOWER(TRIM($2))
      LIMIT 1;
      `,
      [paciente_id, nombre]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        mensaje: "No se encontró una cuenta con esos datos",
      });
    }

    res.json({
      mensaje: "Inicio de sesión correcto",
      paciente: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    res.status(500).json({
      mensaje: "Error al iniciar sesión",
    });
  }
});



router.post("/recuperar-id", async (req, res) => {
  try {
    const { nombre, edad } = req.body;

    if (!nombre || !edad) {
      return res.status(400).json({
        mensaje: "Debe ingresar nombre y edad",
      });
    }

    const resultado = await pool.query(
      `
      SELECT 
        id,
        nombre,
        edad,
        fecha_nacimiento
      FROM pacientes
      WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
        AND edad = $2
      ORDER BY id DESC
      LIMIT 5;
      `,
      [nombre, edad]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "No se encontró una cuenta con esos datos",
      });
    }

    res.json({
      mensaje: "Solicitud de recuperación encontrada",
      cuentas: resultado.rows,
    });
  } catch (error) {
    console.error("Error al recuperar ID:", error);
    res.status(500).json({
      mensaje: "Error al recuperar ID",
    });
  }
});


router.get("/:id/inicio", async (req, res) => {
    try {
        const pacienteId = req.params.id;

        const consulta = `
            SELECT 
                p.id AS paciente_id,
                p.nombre AS paciente,
                p.edad,
                d.id AS dispositivo_id,
                d.codigo_dispositivo,
                d.bateria_porcentaje,
                d.wifi_estado,
                d.ultimo_contacto,
                l.frecuencia_cardiaca,
                l.spo2,
                l.movimiento_estado,
                COALESCE(d.modo_uso_actual, l.modo_uso) AS modo_uso,
                l.creacion AS fecha_lectura
            FROM pacientes p
            JOIN dispositivos d ON d.paciente_id = p.id
            JOIN lecturas l ON l.dispositivo_id = d.id
            WHERE p.id = $1
            ORDER BY l.creacion DESC
            LIMIT 1;
        `;

        const resultado = await pool.query(consulta, [pacienteId]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontró información de inicio para este paciente"
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al obtener inicio:", error);
        res.status(500).json({
            mensaje: "Error al obtener datos de inicio"
        });
    }
});


router.get("/:id/lecturas", async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query(
      `
      SELECT 
        l.id,
        l.dispositivo_id,
        l.frecuencia_cardiaca,
        l.spo2,
        l.movimiento_estado,
        l.modo_uso,
        l.creacion
      FROM lecturas l
      INNER JOIN dispositivos d ON d.id = l.dispositivo_id
      WHERE d.paciente_id = $1
      ORDER BY l.creacion DESC
      LIMIT 50;
      `,
      [id]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al obtener lecturas del paciente:", error);
    res.status(500).json({
      error: "Error al obtener lecturas del paciente",
    });
  }
});


router.get("/:id/reporte", async (req, res) => {
  const { id } = req.params;
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({
      error: "Debe ingresar fecha desde y fecha hasta",
    });
  }

  try {
    const pacienteResultado = await pool.query(
      `
      SELECT 
        id,
        nombre,
        fecha_nacimiento,
        edad,
        creacion
      FROM pacientes
      WHERE id = $1;
      `,
      [id]
    );

    if (pacienteResultado.rows.length === 0) {
      return res.status(404).json({
        error: "Paciente no encontrado",
      });
    }

    const dispositivoResultado = await pool.query(
      `
      SELECT 
        id,
        paciente_id,
        codigo_dispositivo,
        bateria_porcentaje,
        wifi_estado,
        modo_uso_actual,
        ultimo_contacto,
        creacion
      FROM dispositivos
      WHERE paciente_id = $1
      LIMIT 1;
      `,
      [id]
    );

    const lecturasResultado = await pool.query(
      `
      SELECT 
        l.id,
        l.dispositivo_id,
        l.frecuencia_cardiaca,
        l.spo2,
        l.movimiento_estado,
        l.modo_uso,
        l.creacion
      FROM lecturas l
      INNER JOIN dispositivos d ON d.id = l.dispositivo_id
      WHERE d.paciente_id = $1
        AND l.creacion >= $2
        AND l.creacion <= $3
      ORDER BY l.creacion ASC;
      `,
      [id, desde, hasta]
    );

    const alertasResultado = await pool.query(
      `
      SELECT 
        a.id,
        a.paciente_id,
        a.dispositivo_id,
        a.tipo_alerta,
        a.frecuencia_cardiaca,
        a.modo_uso,
        a.mensaje,
        a.estado,
        a.creacion,
        a.revisada,
        ca.actividad,
        ca.sintomas,
        ca.alerta_confirmada,
        ca.observacion,
        ca.creacion AS contexto_creacion
      FROM alertas a
      LEFT JOIN contexto_alertas ca ON ca.alerta_id = a.id
      WHERE a.paciente_id = $1
        AND a.creacion >= $2
        AND a.creacion <= $3
      ORDER BY a.creacion ASC;
      `,
      [id, desde, hasta]
    );

    const lecturas = lecturasResultado.rows;
    const alertas = alertasResultado.rows;

    const frecuencias = lecturas
      .map((lectura) => lectura.frecuencia_cardiaca)
      .filter((valor) => valor !== null && valor !== undefined);

    let promedioLpm = null;
    let minLpm = null;
    let maxLpm = null;

    if (frecuencias.length > 0) {
      const suma = frecuencias.reduce((total, valor) => total + Number(valor), 0);
      promedioLpm = Math.round(suma / frecuencias.length);
      minLpm = Math.min(...frecuencias);
      maxLpm = Math.max(...frecuencias);
    }

    const totalBradicardia = alertas.filter(
      (alerta) => alerta.tipo_alerta === "bradicardia"
    ).length;

    const totalTaquicardia = alertas.filter(
      (alerta) => alerta.tipo_alerta === "taquicardia"
    ).length;

    const totalCaidas = alertas.filter(
      (alerta) => alerta.tipo_alerta === "caida"
    ).length;

    res.json({
      paciente: pacienteResultado.rows[0],
      dispositivo: dispositivoResultado.rows[0] || null,
      rango: {
        desde,
        hasta,
      },
      resumen: {
        total_lecturas: lecturas.length,
        promedio_lpm: promedioLpm,
        min_lpm: minLpm,
        max_lpm: maxLpm,
        total_alertas: alertas.length,
        total_bradicardia: totalBradicardia,
        total_taquicardia: totalTaquicardia,
        total_caidas: totalCaidas,
      },
      lecturas,
      alertas,
    });
  } catch (error) {
    console.error("Error al generar reporte:", error);
    res.status(500).json({
      error: "Error al generar reporte del paciente",
    });
  }
});

module.exports = router;