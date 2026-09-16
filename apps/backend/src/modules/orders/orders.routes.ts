import { Router } from "express";
import { prisma } from "../../db/prisma";
import { broadcast } from "../../websocket";

export const ordersRouter = Router();

ordersRouter.post("/", async (req, res) => {
  const { tableId, barTabId, employeeId } = req.body;
  const order = await prisma.order.create({
    data: { tableId, barTabId, employeeId, status: "open" },
  });
  if (tableId) {
    await prisma.restaurantTable.update({ where: { id: tableId }, data: { status: "occupied" } });
  }
  res.status(201).json(order);
});

ordersRouter.post("/:id/items", async (req, res) => {
  const { menuItemId, quantity, basePrice, notes, modifiers } = req.body;
  const item = await prisma.orderItem.create({
    data: {
      orderId: req.params.id,
      menuItemId,
      quantity: quantity ?? 1,
      basePrice,
      notes,
      modifiers: modifiers?.length
        ? { create: modifiers.map((m: { modifierId: string; isAdded: boolean }) => m) }
        : undefined,
    },
    include: { modifiers: true },
  });
  res.status(201).json(item);
});

// Sends to kitchen: flips status, timestamps a kitchen_queue_event, and
// broadcasts to every connected screen so the queue view updates live.
ordersRouter.post("/:id/send-to-kitchen", async (req, res) => {
  const { employeeId } = req.body;
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: "sent_to_kitchen" },
  });
  await prisma.kitchenQueueEvent.create({
    data: { orderId: order.id, status: "queued", changedById: employeeId },
  });
  broadcast("kitchen:queue-updated", { orderId: order.id });
  res.json(order);
});

ordersRouter.post("/:id/mark-done", async (req, res) => {
  const { employeeId } = req.body;
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: "ready" },
  });
  await prisma.kitchenQueueEvent.create({
    data: { orderId: order.id, status: "done", changedById: employeeId },
  });
  broadcast("kitchen:queue-updated", { orderId: order.id });
  res.json(order);
});

// Pay: sets payment method + tip, marks the order paid, and frees the
// table (a table is unusable while any of its orders are unpaid).
ordersRouter.post("/:id/pay", async (req, res) => {
  const { paymentMethod, tip } = req.body;
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      paymentMethod,
      tip,
      total: { increment: tip ?? 0 },
      status: "paid",
      closedAt: new Date(),
    },
  });

  if (order.tableId) {
    const stillOpen = await prisma.order.count({
      where: { tableId: order.tableId, status: { notIn: ["paid", "voided"] } },
    });
    if (stillOpen === 0) {
      await prisma.restaurantTable.update({ where: { id: order.tableId }, data: { status: "available" } });
    }
  }

  broadcast("table:updated", { tableId: order.tableId });
  res.json(order);
});

ordersRouter.get("/by-table/:tableId", async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { tableId: req.params.tableId, status: { notIn: ["paid", "voided"] } },
    orderBy: { createdAt: "desc" },
  });
  res.json(order);
});

ordersRouter.get("/queue", async (_req, res) => {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["sent_to_kitchen", "in_progress"] } },
    orderBy: { createdAt: "asc" },
    include: { table: true, barTab: true, items: true },
  });
  res.json(orders);
});
