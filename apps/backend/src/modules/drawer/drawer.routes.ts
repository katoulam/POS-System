import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { requireRole } from "../../middleware/requireRole";

export const drawerRouter = Router();

async function recomputeExpectedTotal(drawerSessionId: string) {
  const lineItems = await prisma.drawerLineItem.findMany({ where: { drawerSessionId } });
  const session = await prisma.drawerSession.findUniqueOrThrow({ where: { id: drawerSessionId } });

  // Same rule as server cashout: checking a non-cash tender or a misc
  // ticket subtracts its full amount from the expected cash total.
  const checkedNonCash = lineItems
    .filter((l) => l.isChecked && l.tenderType !== "cash")
    .reduce((sum, l) => sum.plus(l.amount), new Prisma.Decimal(0));

  const expectedTotal = session.expectedTotal.minus(checkedNonCash);

  return prisma.drawerSession.update({
    where: { id: drawerSessionId },
    data: { expectedTotal },
  });
}

drawerRouter.post("/sessions", requireRole("manager", "owner"), async (req, res) => {
  const { businessDate, openingFloat, actingEmployeeId } = req.body;

  const orders = await prisma.order.findMany({
    where: { status: "paid" },
  });

  const expectedTotal = orders.reduce(
    (sum, o) => sum.plus(o.subtotal).plus(o.tax),
    new Prisma.Decimal(openingFloat ?? 0)
  );

  const session = await prisma.drawerSession.create({
    data: {
      businessDate,
      openedById: actingEmployeeId,
      openingFloat: openingFloat ?? 0,
      expectedTotal,
      lineItems: {
        create: orders.map((o) => ({
          orderId: o.id,
          amount: o.subtotal.plus(o.tax).plus(o.tip),
          tenderType: o.paymentMethod ?? "cash",
          isChecked: o.paymentMethod === "cash",
        })),
      },
    },
    include: { lineItems: true },
  });

  res.status(201).json(session);
});

// Owner/manager only — read the full details list (every order + tips).
drawerRouter.get("/sessions/:id/details", requireRole("manager", "owner"), async (req, res) => {
  const session = await prisma.drawerSession.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { lineItems: { include: { order: true, miscTicket: true } }, miscTickets: true },
  });
  res.json(session);
});

drawerRouter.post("/sessions/:id/select-all", requireRole("manager", "owner"), async (req, res) => {
  await prisma.drawerLineItem.updateMany({
    where: { drawerSessionId: req.params.id, tenderType: { not: "cash" } },
    data: { isChecked: true },
  });
  const session = await recomputeExpectedTotal(req.params.id);
  res.json(session);
});

drawerRouter.patch("/sessions/:id/line-items/:lineItemId", requireRole("manager", "owner"), async (req, res) => {
  const { isChecked } = req.body;
  await prisma.drawerLineItem.update({
    where: { id: req.params.lineItemId },
    data: { isChecked },
  });
  const session = await recomputeExpectedTotal(req.params.id);
  res.json(session);
});

// Misc tickets (comps, paid-outs, open tabs, till purchases) — manager/
// owner only, always requires a reason, permanently logged for audit.
drawerRouter.post("/sessions/:id/misc-tickets", requireRole("manager", "owner"), async (req, res) => {
  const { reason, amount, actingEmployeeId } = req.body;
  if (!reason) {
    res.status(400).json({ error: "reason is required for a misc ticket" });
    return;
  }

  const ticket = await prisma.miscTicket.create({
    data: {
      drawerSessionId: req.params.id,
      createdById: actingEmployeeId,
      reason,
      amount,
    },
  });

  await prisma.drawerLineItem.create({
    data: {
      drawerSessionId: req.params.id,
      miscTicketId: ticket.id,
      amount,
      tenderType: "misc",
      isChecked: true,
    },
  });

  const session = await recomputeExpectedTotal(req.params.id);
  res.status(201).json({ ticket, session });
});

// Closing: records what was actually counted. A nonzero variance is
// saved, not silently forced to zero.
drawerRouter.post("/sessions/:id/close", requireRole("owner"), async (req, res) => {
  const { closingCashCounted, actingEmployeeId } = req.body;
  const session = await prisma.drawerSession.findUniqueOrThrow({ where: { id: req.params.id } });

  const variance = new Prisma.Decimal(closingCashCounted).minus(session.expectedTotal);

  const closed = await prisma.drawerSession.update({
    where: { id: req.params.id },
    data: {
      closingCashCounted,
      variance,
      closedById: actingEmployeeId,
      status: "closed",
    },
  });

  res.json(closed);
});
