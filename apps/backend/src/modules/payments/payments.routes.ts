import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

export const paymentsRouter = Router();

async function recomputeNetExpected(cashoutId: string) {
  const lineItems = await prisma.cashoutLineItem.findMany({ where: { cashoutId } });
  const cashout = await prisma.cashout.findUniqueOrThrow({ where: { id: cashoutId } });

  // Checking a non-cash (card/check/gift-card) row subtracts its FULL
  // total (bill + tip) — that money never touched the server's hand.
  // See docs/DB_SCHEMA.md §Server cashout for the worked example.
  const checkedNonCashTotal = lineItems
    .filter((l) => l.isChecked && l.paymentMethod !== "cash")
    .reduce((sum, l) => sum.plus(l.billAmount).plus(l.tipAmount), new Prisma.Decimal(0));

  const netExpected = cashout.baselineTotal.minus(checkedNonCashTotal);

  return prisma.cashout.update({
    where: { id: cashoutId },
    data: { netExpected },
  });
}

// Opens a cashout for a server: pulls every paid order not yet swept
// into a cashout, and builds the baseline + line items.
paymentsRouter.post("/cashouts", async (req, res) => {
  const { employeeId, shiftId } = req.body;

  const orders = await prisma.order.findMany({
    where: { employeeId, status: "paid", cashoutId: null },
  });

  if (orders.length === 0) {
    res.status(400).json({ error: "No paid orders to cash out" });
    return;
  }

  const baselineTotal = orders.reduce(
    (sum, o) => sum.plus(o.subtotal).plus(o.tax),
    new Prisma.Decimal(0)
  );

  const cashout = await prisma.cashout.create({
    data: {
      employeeId,
      shiftId,
      baselineTotal,
      netExpected: baselineTotal,
      lineItems: {
        create: orders.map((o) => ({
          orderId: o.id,
          billAmount: o.subtotal.plus(o.tax),
          tipAmount: o.tip,
          paymentMethod: o.paymentMethod ?? "cash",
          // Cash rows are locked in as already-accounted-for; card/check/
          // gift-card rows start unchecked until the server confirms them.
          isChecked: o.paymentMethod === "cash",
        })),
      },
    },
    include: { lineItems: true },
  });

  await prisma.order.updateMany({
    where: { id: { in: orders.map((o) => o.id) } },
    data: { cashoutId: cashout.id },
  });

  res.status(201).json(cashout);
});

paymentsRouter.patch("/cashouts/:cashoutId/line-items/:lineItemId", async (req, res) => {
  const { isChecked } = req.body;
  const line = await prisma.cashoutLineItem.findUniqueOrThrow({ where: { id: req.params.lineItemId } });

  if (line.paymentMethod === "cash") {
    res.status(400).json({ error: "Cash line items cannot be unchecked" });
    return;
  }

  await prisma.cashoutLineItem.update({
    where: { id: req.params.lineItemId },
    data: { isChecked, checkedAt: isChecked ? new Date() : null },
  });

  const cashout = await recomputeNetExpected(req.params.cashoutId);
  res.json(cashout);
});

paymentsRouter.post("/cashouts/:cashoutId/select-all", async (req, res) => {
  await prisma.cashoutLineItem.updateMany({
    where: { cashoutId: req.params.cashoutId, paymentMethod: { not: "cash" } },
    data: { isChecked: true, checkedAt: new Date() },
  });
  const cashout = await recomputeNetExpected(req.params.cashoutId);
  res.json(cashout);
});

// Closes the cashout: records what the server counted, and the variance
// against net_expected. Negative net_expected means the drawer owes the
// server cash — that's still recorded here, just as a negative variance
// reference for whoever's managing the drawer that night.
paymentsRouter.post("/cashouts/:cashoutId/close", async (req, res) => {
  const { cashEntered } = req.body;
  const cashout = await prisma.cashout.findUniqueOrThrow({ where: { id: req.params.cashoutId } });

  const variance = new Prisma.Decimal(cashEntered).minus(cashout.netExpected);

  const closed = await prisma.cashout.update({
    where: { id: req.params.cashoutId },
    data: { cashEntered, variance, status: "closed", closedAt: new Date() },
  });

  res.json(closed);
});
