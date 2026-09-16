import { Router } from "express";
import { prisma } from "../../db/prisma";
import { requireRole } from "../../middleware/requireRole";

export const payrollRouter = Router();

// Weekly hours x hourly rate, per employee. Uses the pay rate that was
// effective when each shift happened, so a raise never rewrites past weeks.
payrollRouter.get("/weekly-report", requireRole("manager", "owner"), async (req, res) => {
  const { weekStart, weekEnd } = req.query as { weekStart: string; weekEnd: string };

  const shifts = await prisma.shift.findMany({
    where: {
      clockIn: { gte: new Date(weekStart), lte: new Date(weekEnd) },
      clockOut: { not: null },
    },
    include: { employee: { include: { payRates: true } } },
  });

  const byEmployee = new Map<string, { name: string; hours: number; wages: number }>();

  for (const shift of shifts) {
    const hours = (shift.clockOut!.getTime() - shift.clockIn.getTime()) / 3_600_000;
    const rate = shift.employee.payRates.find(
      (r) => r.effectiveFrom <= shift.clockIn && (!r.effectiveTo || r.effectiveTo >= shift.clockIn)
    );
    const hourlyRate = rate ? Number(rate.hourlyRate) : 0;

    const existing = byEmployee.get(shift.employeeId) ?? { name: shift.employee.name, hours: 0, wages: 0 };
    existing.hours += hours;
    existing.wages += hours * hourlyRate;
    byEmployee.set(shift.employeeId, existing);
  }

  res.json(Array.from(byEmployee.entries()).map(([employeeId, data]) => ({ employeeId, ...data })));
});
