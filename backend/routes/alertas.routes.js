const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET /api/pacientes/:id/historial
router.get("/pacientes/:id/historial", async (req, res) => {
    try {
        const pacienteId = req.params.id;

        const consulta = `
            SELECT
                id,
                tipo_alerta,
                frecuencia_cardiaca,
                modo_uso,
                mensaje,
                estado,
                creacion,
                revisada
            FROM alertas
            WHERE paciente_id = $1
            ORDER BY creacion DESC;
        `;

        const resultado = await pool.query(consulta, [pacienteId]);

        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener historial:", error);
        res.status(500).json({
            mensaje: "Error al obtener historial"
        });
    }
});

// GET /api/pacientes/:id/alertas
router.get("/pacientes/:id/alertas", async (req, res) => {
    try {
        const pacienteId = req.params.id;

        const consulta = `
            SELECT
                id,
                tipo_alerta,
                frecuencia_cardiaca,
                modo_uso,
                mensaje,
                estado,
                creacion,
                revisada
            FROM alertas
            WHERE paciente_id = $1
            ORDER BY creacion DESC;
        `;

        const resultado = await pool.query(consulta, [pacienteId]);

        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener alertas:", error);
        res.status(500).json({
            mensaje: "Error al obtener alertas"
        });
    }
});

// GET /api/pacientes/:id/alerta-activa
router.get("/pacientes/:id/alerta-activa", async (req, res) => {
    try {
        const pacienteId = req.params.id;

        const consulta = `
            SELECT
                id,
                tipo_alerta,
                frecuencia_cardiaca,
                modo_uso,
                mensaje,
                estado,
                creacion,
                revisada
            FROM alertas
            WHERE paciente_id = $1
              AND estado = 'activa'
            ORDER BY creacion DESC
            LIMIT 1;
        `;

        const resultado = await pool.query(consulta, [pacienteId]);

        if (resultado.rows.length === 0) {
            return res.json({
                hay_alerta: false,
                alerta: null
            });
        }

        res.json({
            hay_alerta: true,
            alerta: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al obtener alerta activa:", error);
        res.status(500).json({
            mensaje: "Error al obtener alerta activa"
        });
    }
});

// POST /api/pacientes/:id/alertas
router.post("/pacientes/:id/alertas", async (req, res) => {
    try {
        const pacienteId = req.params.id;

        const {
            dispositivo_id,
            tipo_alerta,
            frecuencia_cardiaca,
            modo_uso,
            mensaje
        } = req.body;

        const consulta = `
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

        const valores = [
            pacienteId,
            dispositivo_id,
            tipo_alerta,
            frecuencia_cardiaca || null,
            modo_uso || null,
            mensaje
        ];

        const resultado = await pool.query(consulta, valores);

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al crear alerta:", error);
        res.status(500).json({
            mensaje: "Error al crear alerta"
        });
    }
});

// PATCH /api/alertas/:id/estado
router.patch("/alertas/:id/estado", async (req, res) => {
    try {
        const alertaId = req.params.id;
        const { estado } = req.body;

        const consulta = `
            UPDATE alertas
            SET 
                estado = $1,
                revisada = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *;
        `;

        const valores = [estado, alertaId];

        const resultado = await pool.query(consulta, valores);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontró la alerta"
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar alerta:", error);
        res.status(500).json({
            mensaje: "Error al actualizar alerta"
        });
    }
});

module.exports = router;