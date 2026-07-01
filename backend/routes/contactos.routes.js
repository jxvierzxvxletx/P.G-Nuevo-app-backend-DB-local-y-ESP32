const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET /api/pacientes/:id/contactos
router.get("/pacientes/:id/contactos", async (req, res) => {
    try {
        const pacienteId = req.params.id;

        const consulta = `
            SELECT
                id,
                nombre,
                telefono,
                relacion,
                correo,
                creacion
            FROM contactos_emergencia
            WHERE paciente_id = $1
            ORDER BY creacion ASC;
        `;

        const resultado = await pool.query(consulta, [pacienteId]);

        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener contactos:", error);
        res.status(500).json({
            mensaje: "Error al obtener contactos"
        });
    }
});

// POST /api/pacientes/:id/contactos
router.post("/pacientes/:id/contactos", async (req, res) => {
    try {
        const pacienteId = req.params.id;

        const { nombre, telefono, relacion, correo } = req.body;

        const consulta = `
            INSERT INTO contactos_emergencia (
                paciente_id,
                nombre,
                telefono,
                relacion,
                correo
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const valores = [
            pacienteId,
            nombre,
            telefono,
            relacion,
            correo || null
        ];

        const resultado = await pool.query(consulta, valores);

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al crear contacto:", error);
        res.status(500).json({
            mensaje: "Error al crear contacto"
        });
    }
});

router.get("/contactos/:id", async (req, res) => {
  try {
    const contactoId = req.params.id;

    const consulta = `
      SELECT
        id,
        paciente_id,
        nombre,
        telefono,
        relacion,
        correo,
        creacion
      FROM contactos_emergencia
      WHERE id = $1;
    `;

    const resultado = await pool.query(consulta, [contactoId]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "No se encontró el contacto",
      });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al obtener contacto:", error);
    res.status(500).json({
      mensaje: "Error al obtener contacto",
    });
  }
});

router.patch("/contactos/:id", async (req, res) => {
  try {
    const contactoId = req.params.id;

    const { nombre, telefono, relacion, correo } = req.body;

    const consulta = `
      UPDATE contactos_emergencia
      SET
        nombre = $1,
        telefono = $2,
        relacion = $3,
        correo = $4
      WHERE id = $5
      RETURNING *;
    `;

    const valores = [
      nombre,
      telefono,
      relacion,
      correo || null,
      contactoId,
    ];

    const resultado = await pool.query(consulta, valores);

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "No se encontró el contacto",
      });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al actualizar contacto:", error);
    res.status(500).json({
      mensaje: "Error al actualizar contacto",
    });
  }
});

router.delete("/contactos/:id", async (req, res) => {
  try {
    const contactoId = req.params.id;

    const consulta = `
      DELETE FROM contactos_emergencia
      WHERE id = $1
      RETURNING *;
    `;

    const resultado = await pool.query(consulta, [contactoId]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "No se encontró el contacto",
      });
    }

    res.json({
      mensaje: "Contacto eliminado correctamente",
      contacto: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error al eliminar contacto:", error);
    res.status(500).json({
      mensaje: "Error al eliminar contacto",
    });
  }
});

module.exports = router;
