const express = require("express");
const cors = require("cors");

const pacientesRoutes = require("./routes/pacientes.routes");
const contactosRoutes = require("./routes/contactos.routes");
const alertasRoutes = require("./routes/alertas.routes");
const dispositivosRoutes = require("./routes/dispositivos.routes");
const contextoAlertasRoutes = require("./routes/contextoAlertas.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.get("/", (req, res) => {
  res.send("PlenaGuard API funcionando");
});

app.use("/api/pacientes", pacientesRoutes);
app.use("/api", contactosRoutes);
app.use("/api", alertasRoutes);
app.use("/api", dispositivosRoutes);
app.use("/api", contextoAlertasRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});