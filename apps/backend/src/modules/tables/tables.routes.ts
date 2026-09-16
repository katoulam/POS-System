import { Router } from "express";
import { prisma } from "../../db/prisma";

export const tablesRouter = Router();

tablesRouter.get("/", async (_req, res) => {
  const tables = await prisma.restaurantTable.findMany({ orderBy: { tableNumber: "asc" } });
  res.json(tables);
});

// Locking happens automatically: an order is created against a table on
// check-in, and the table isn't freed until that order is marked "paid".
tablesRouter.post("/:id/lock", async (req, res) => {
  const table = await prisma.restaurantTable.update({
    where: { id: req.params.id },
    data: { status: "occupied" },
  });
  res.json(table);
});

tablesRouter.post("/:id/free", async (req, res) => {
  const table = await prisma.restaurantTable.update({
    where: { id: req.params.id },
    data: { status: "available" },
  });
  res.json(table);
});
