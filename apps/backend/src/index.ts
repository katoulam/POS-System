import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { initWebSocket } from "./websocket";
import { menuRouter } from "./modules/menu/menu.routes";
import { employeesRouter } from "./modules/employees/employees.routes";
import { tablesRouter } from "./modules/tables/tables.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { kitchenRouter } from "./modules/kitchen/kitchen.routes";
import { barRouter } from "./modules/bar/bar.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { drawerRouter } from "./modules/drawer/drawer.routes";
import { payrollRouter } from "./modules/payroll/payroll.routes";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/menu", menuRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/tables", tablesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/kitchen", kitchenRouter);
app.use("/api/bar", barRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/drawer", drawerRouter);
app.use("/api/payroll", payrollRouter);

const httpServer = createServer(app);
initWebSocket(httpServer);

const port = Number(process.env.BACKEND_PORT ?? 4000);
httpServer.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`POS backend listening on :${port}`);
});
