const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db");
const { seedDatabase } = require("./seed/seed");
const errorHandler = require("./middleware/errorHandler");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mongo: true });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/menus", require("./routes/menus"));
app.use("/api/users", require("./routes/users"));
app.use("/api/roles", require("./routes/roles"));
app.use("/api/permissions", require("./routes/permissions"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/medicines", require("./routes/medicines"));
app.use("/api/suppliers", require("./routes/suppliers"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/purchases", require("./routes/purchases"));
app.use("/api/inventory", require("./routes/inventory"));
app.use("/api/expiry", require("./routes/expiry"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/audit", require("./routes/audit"));

app.use(errorHandler);

async function start() {
  await connectDB();
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
