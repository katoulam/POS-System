import { NextFunction, Request, Response } from "express";
import { EmployeeRole } from "@prisma/client";
import { prisma } from "../db/prisma";

// Role gate enforced server-side (not just hidden in the UI) — see
// docs/DB_SCHEMA.md §Role gates. Expects the acting employee's id on
// the request body as `actingEmployeeId`.
export function requireRole(...roles: EmployeeRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const actingEmployeeId = req.body?.actingEmployeeId ?? req.query?.actingEmployeeId;
    if (!actingEmployeeId) {
      res.status(401).json({ error: "actingEmployeeId is required" });
      return;
    }

    const employee = await prisma.employee.findUnique({ where: { id: String(actingEmployeeId) } });
    if (!employee || !employee.isActive || !roles.includes(employee.role)) {
      res.status(403).json({ error: "Not authorized for this action" });
      return;
    }

    next();
  };
}
