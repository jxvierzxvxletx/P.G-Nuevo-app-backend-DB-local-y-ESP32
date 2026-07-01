const express = require("express");
const router = express.Router();
const pool = require("../db");

// Obtener contexto de una alerta específica
router.get("/alertas/:id/contexto", async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query(
      `
      SELECT *
      FROM contexto_alertas
      WHERE alerta_id = $1
      ORDER BY creacion DESC
      LIMIT 1;
      `,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.json(null);
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al obtener contexto de alerta:", error);
    res.status(500).json({
      error: "Error al obtener contexto de alerta",
    });
  }
});

// Crear contexto para una alerta
router.post("/alertas/:id/contexto", async (req, res) => {
  const { id } = req.params;
  const { actividad, sintomas, alerta_confirmada, observacion } = req.body;

  try {
    const resultado = await pool.query(
      `
      INSERT INTO contexto_alertas
      (alerta_id, actividad, sintomas, alerta_confirmada, observacion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
      `,
      [
        id,
        actividad || null,
        sintomas || null,
        alerta_confirmada || null,
        observacion || null,
      ]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al crear contexto de alerta:", error);
    res.status(500).json({
      error: "Error al crear contexto de alerta",
    });
  }
});

// Actualizar contexto de una alerta
router.patch("/alertas/:id/contexto", async (req, res) => {
  const { id } = req.params;
  const { actividad, sintomas, alerta_confirmada, observacion } = req.body;

  try {
    const contextoExistente = await pool.query(
      `
      SELECT id
      FROM contexto_alertas
      WHERE alerta_id = $1
      ORDER BY creacion DESC
      LIMIT 1;
      `,
      [id]
    );

    if (contextoExistente.rows.length === 0) {
      const creado = await pool.query(
        `
        INSERT INTO contexto_alertas
        (alerta_id, actividad, sintomas, alerta_confirmada, observacion)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
        `,
        [
          id,
          actividad || null,
          sintomas || null,
          alerta_confirmada || null,
          observacion || null,
        ]
      );

      return res.status(201).json(creado.rows[0]);
    }

    const contextoId = contextoExistente.rows[0].id;

    const resultado = await pool.query(
      `
      UPDATE contexto_alertas
      SET
        actividad = COALESCE($1, actividad),
        sintomas = COALESCE($2, sintomas),
        alerta_confirmada = COALESCE($3, alerta_confirmada),
        observacion = COALESCE($4, observacion)
      WHERE id = $5
      RETURNING *;
      `,
      [
        actividad || null,
        sintomas || null,
        alerta_confirmada || null,
        observacion || null,
        contextoId,
      ]
    );

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al actualizar contexto de alerta:", error);
    res.status(500).json({
      error: "Error al actualizar contexto de alerta",
    });
  }
});

module.exports = router;