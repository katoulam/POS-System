import { Router } from "express";
import { prisma } from "../../db/prisma";

export const barRouter = Router();

barRouter.post("/tabs", async (req, res) => {
  const { customerName } = req.body;
  const tab = await prisma.barTab.create({ data: { customerName } });
  res.status(201).json(tab);
});

barRouter.get("/tabs", async (_req, res) => {
  const tabs = await prisma.barTab.findMany({ where: { status: "open" } });
  res.json(tabs);
});

barRouter.post("/tabs/:id/close", async (req, res) => {
  const tab = await prisma.barTab.update({
    where: { id: req.params.id },
    data: { status: "closed" },
  });
  res.json(tab);
});
