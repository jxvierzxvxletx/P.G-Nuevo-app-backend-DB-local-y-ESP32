const express = require("express");
const pool = require("../db");

const router = express.Router();

// POST /api/pacientes/:id/dispositivo
router.post("/pacientes/:id/dispositivo", async (req, res) => {
    try {
        const pacienteId = req.params.id;

        const {
            codigo_dispositivo,
            bateria_porcentaje,
            wifi_estado
        } = req.body;

        const consulta = `
            INSERT INTO dispositivos (
                paciente_id,
                codigo_dispositivo,
                bateria_porcentaje,
                wifi_estado,
                ultimo_contacto
            )
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            RETURNING *;
        `;

        const valores = [
            pacienteId,
            codigo_dispositivo,
            bateria_porcentaje || null,
            wifi_estado || null
        ];

        const resultado = await pool.query(consulta, valores);

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al crear dispositivo:", error);
        res.status(500).json({
            mensaje: "Error al crear dispositivo"
        });
    }
});


router.patch("/dispositivos/:id/estado", async (req, res) => {
  const { id } = req.params;
  const { bateria_porcentaje, wifi_estado } = req.body;

  try {
    const campos = [];
    const valores = [];

    if (bateria_porcentaje !== undefined) {
      valores.push(bateria_porcentaje);
      campos.push(`bateria_porcentaje = $${valores.length}`);
    }

    if (wifi_estado !== undefined) {
      valores.push(wifi_estado);
      campos.push(`wifi_estado = $${valores.length}`);
    }

    valores.push(new Date());
    campos.push(`ultimo_contacto = $${valores.length}`);

    if (campos.length === 1) {
      return res.status(400).json({
        error: "No se enviaron datos para actualizar",
      });
    }

    valores.push(id);

    const query = `
      UPDATE dispositivos
      SET ${campos.join(", ")}
      WHERE id = $${valores.length}
      RETURNING *;
    `;

    const resultado = await pool.query(query, valores);

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        error: "Dispositivo no encontrado",
      });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al actualizar estado del dispositivo:", error);

    res.status(500).json({
      error: "Error al actualizar estado del dispositivo",
    });
  }
});

router.patch("/dispositivos/:id/modo", async (req, res) => {
    try {
        const dispositivoId = req.params.id;
        const { modo_uso_actual } = req.body;

        if (!modo_uso_actual || !["normal", "deportivo"].includes(modo_uso_actual)) {
            return res.status(400).json({
                mensaje: "Modo de uso inválido"
            });
        }

        const consultaActualizarModo = `
            UPDATE dispositivos
            SET
                modo_uso_actual = $1,
                ultimo_contacto = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *;
        `;

        const resultadoModo = await pool.query(consultaActualizarModo, [
            modo_uso_actual,
            dispositivoId
        ]);

        if (resultadoModo.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontró el dispositivo"
            });
        }

        const dispositivo = resultadoModo.rows[0];

        const consultaUltimaLectura = `
            SELECT
                id,
                frecuencia_cardiaca,
                spo2,
                movimiento_estado,
                modo_uso,
                creacion
            FROM lecturas
            WHERE dispositivo_id = $1
            ORDER BY creacion DESC
            LIMIT 1;
        `;

        const resultadoLectura = await pool.query(consultaUltimaLectura, [
            dispositivoId
        ]);

        let alertaCreada = null;

        if (resultadoLectura.rows.length > 0) {
            const ultimaLectura = resultadoLectura.rows[0];

            const frecuencia = ultimaLectura.frecuencia_cardiaca;
            const movimiento = ultimaLectura.movimiento_estado;

            const limiteBajo = modo_uso_actual === "deportivo" ? 60 : 50;
            const limiteAlto = modo_uso_actual === "deportivo" ? 120 : 100;

            let tipoAlerta = null;
            let mensaje = null;

            if (movimiento === "caida") {
                tipoAlerta = "caida";
                mensaje = "Caída detectada";
            } else if (frecuencia < limiteBajo) {
                tipoAlerta = "bradicardia";
                mensaje = "Frecuencia cardíaca baja detectada";
            } else if (frecuencia > limiteAlto) {
                tipoAlerta = "taquicardia";
                mensaje = "Frecuencia cardíaca elevada detectada";
            }

            if (tipoAlerta) {
                const consultaAlertaActiva = `
                    SELECT id
                    FROM alertas
                    WHERE paciente_id = $1
                      AND tipo_alerta = $2
                      AND estado = 'activa'
                    ORDER BY creacion DESC
                    LIMIT 1;
                `;

                const resultadoAlertaActiva = await pool.query(
                    consultaAlertaActiva,
                    [dispositivo.paciente_id, tipoAlerta]
                );

                if (resultadoAlertaActiva.rows.length === 0) {
                    const consultaCrearAlerta = `
                        INSERT INTO alertas (
                            paciente_id,
                            dispositivo_id,
                            tipo_alerta,
                            frecuencia_cardiaca,
                            modo_uso,
                            mensaje,
                            estado
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, 'activa')
                        RETURNING *;
                    `;

                    const valoresAlerta = [
                        dispositivo.paciente_id,
                        dispositivoId,
                        tipoAlerta,
                        frecuencia,
                        modo_uso_actual,
                        mensaje
                    ];

                    const resultadoAlerta = await pool.query(
                        consultaCrearAlerta,
                        valoresAlerta
                    );

                    alertaCreada = resultadoAlerta.rows[0];
                }
            }
        }

        res.json({
            dispositivo,
            alerta_creada: alertaCreada
        });
    } catch (error) {
        console.error("Error al actualizar modo de uso:", error);
        res.status(500).json({
            mensaje: "Error al actualizar modo de uso"
        });
    }
});

// POST /api/dispositivos/:id/lecturas
router.post("/dispositivos/:id/lecturas", async (req, res) => {
    try {
        const dispositivoId = req.params.id;

        const {
            frecuencia_cardiaca,
            spo2,
            movimiento_estado,
            modo_uso
        } = req.body;

        const consultaLectura = `
            INSERT INTO lecturas (
                dispositivo_id,
                frecuencia_cardiaca,
                spo2,
                movimiento_estado,
                modo_uso
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const valoresLectura = [
            dispositivoId,
            frecuencia_cardiaca,
            spo2 || null,
            movimiento_estado || null,
            modo_uso || null
        ];

        const resultadoLectura = await pool.query(consultaLectura, valoresLectura);
        const lecturaCreada = resultadoLectura.rows[0];

        const consultaDispositivo = `
            SELECT
                id,
                paciente_id,
                modo_uso_actual
            FROM dispositivos
            WHERE id = $1;
        `;

        const resultadoDispositivo = await pool.query(consultaDispositivo, [dispositivoId]);

        if (resultadoDispositivo.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontró el dispositivo"
            });
        }

        const dispositivo = resultadoDispositivo.rows[0];

        // --- CÓDIGO PARA EL BOTÓN DEL ESP32 ---
        if (modo_uso === "cancelar_alerta") {
            const consultaApagar = `
                UPDATE alertas
                SET estado = 'resuelta', revisada = CURRENT_TIMESTAMP
                WHERE paciente_id = $1 AND estado = 'activa'
            `;
            await pool.query(consultaApagar, [dispositivo.paciente_id]);
            
            return res.status(201).json({
                lectura: lecturaCreada,
                alerta_creada: null,
                mensaje: "Alertas canceladas remotamente por el dispositivo"
            });
        }
        // ---------------------------------------

        let alertaCreada = null;
        let tipoAlerta = null;
        let mensaje = null;

        const modoActual = dispositivo.modo_uso_actual || modo_uso || "normal";
        const limiteBajo = modoActual === "deportivo" ? 60 : 50;
        const limiteAlto = modoActual === "deportivo" ? 120 : 100;

        if (movimiento_estado === "caida") {
            tipoAlerta = "caida";
            mensaje = "Caída detectada";
        } else if (frecuencia_cardiaca < limiteBajo) {
            tipoAlerta = "bradicardia";
            mensaje = "Frecuencia cardíaca baja detectada";
        } else if (frecuencia_cardiaca > limiteAlto) {
            tipoAlerta = "taquicardia";
            mensaje = "Frecuencia cardíaca elevada detectada";
        }

        if (tipoAlerta) {
            const consultaAlertaActiva = `
                SELECT id
                FROM alertas
                WHERE paciente_id = $1
                  AND tipo_alerta = $2
                  AND estado = 'activa'
                ORDER BY creacion DESC
                LIMIT 1;
            `;

            const resultadoAlertaActiva = await pool.query(consultaAlertaActiva, [
                dispositivo.paciente_id,
                tipoAlerta
            ]);

            if (resultadoAlertaActiva.rows.length === 0) {
                const consultaAlerta = `
                    INSERT INTO alertas (
                        paciente_id,
                        dispositivo_id,
                        tipo_alerta,
                        frecuencia_cardiaca,
                        modo_uso,
                        mensaje,
                        estado
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, 'activa')
                    RETURNING *;
                `;

                const valoresAlerta = [
                    dispositivo.paciente_id,
                    dispositivoId,
                    tipoAlerta,
                    frecuencia_cardiaca,
                    modoActual,
                    mensaje
                ];

                const resultadoAlerta = await pool.query(consultaAlerta, valoresAlerta);
                alertaCreada = resultadoAlerta.rows[0];
            }
        }

        res.status(201).json({
            lectura: lecturaCreada,
            alerta_creada: alertaCreada
        });
    } catch (error) {
        console.error("Error al crear lectura:", error);
        res.status(500).json({
            mensaje: "Error al crear lectura"
        });
    }
});

module.exports = router;



module.exports = router;