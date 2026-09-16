import { Router } from "express";
import { prisma } from "../../db/prisma";

export const employeesRouter = Router();

// Employee ID login. PIN hashing/verification is a placeholder — swap in
// bcrypt (or similar) before this touches real PINs.
employeesRouter.post("/login", async (req, res) => {
  const { pin } = req.body;
  const employee = await prisma.employee.findFirst({
    where: { pinHash: pin, isActive: true },
  });
  if (!employee) {
    res.status(401).json({ error: "Invalid employee ID" });
    return;
  }

  const shift = await prisma.shift.create({
    data: { employeeId: employee.id, clockIn: new Date() },
  });

  res.json({ employee, shiftId: shift.id });
});

employeesRouter.post("/:id/clock-out", async (req, res) => {
  const openShift = await prisma.shift.findFirst({
    where: { employeeId: req.params.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  });
  if (!openShift) {
    res.status(404).json({ error: "No open shift for this employee" });
    return;
  }
  const shift = await prisma.shift.update({
    where: { id: openShift.id },
    data: { clockOut: new Date() },
  });
  res.json(shift);
});
