import { createContext, ReactNode, useContext, useState } from "react";
import type { Employee } from "@pos/shared-types";

interface Session {
  employee: Employee | null;
  shiftId: string | null;
  login: (employee: Employee, shiftId: string) => void;
  logout: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [shiftId, setShiftId] = useState<string | null>(null);

  const login = (emp: Employee, shift: string) => {
    setEmployee(emp);
    setShiftId(shift);
  };
  const logout = () => {
    setEmployee(null);
    setShiftId(null);
  };

  return (
    <SessionContext.Provider value={{ employee, shiftId, login, logout }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
