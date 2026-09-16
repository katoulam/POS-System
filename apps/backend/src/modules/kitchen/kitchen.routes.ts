import { Router } from "express";
import { prisma } from "../../db/prisma";

export const kitchenRouter = Router();

// Every employee's kitchen-queue view: all tables/bar tabs currently
// in the queue, in order, with elapsed wait time.
kitchenRouter.get("/queue", async (_req, res) => {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["sent_to_kitchen", "in_progress"] } },
    orderBy: { createdAt: "asc" },
    include: { table: true, barTab: true, items: { include: { menuItem: true } } },
  });

  const now = Date.now();
  const queue = orders.map((order, index) => ({
    ...order,
    queuePosition: index + 1,
    waitMinutes: Math.floor((now - order.createdAt.getTime()) / 60000),
  }));

  res.json(queue);
});
