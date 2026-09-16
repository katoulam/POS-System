import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Employee } from "@pos/shared-types";
import { api } from "../../services/api";
import { useSession } from "../../store/session";

export default function Login() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useSession();
  const navigate = useNavigate();

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "enter"];

  const handleDigit = async (digit: string) => {
    if (digit === "clear") {
      setPin("");
      return;
    }
    if (digit === "enter") {
      try {
        const { employee, shiftId } = await api.post<{ employee: Employee; shiftId: string }>(
          "/employees/login",
          { pin }
        );
        login(employee, shiftId);
        navigate("/home");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Login failed");
        setPin("");
      }
      return;
    }
    setPin((p) => p + digit);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold">Enter Employee ID</h1>
      <div className="text-4xl tracking-widest h-12">{"•".repeat(pin.length)}</div>
      {error && <p className="text-red-400">{error}</p>}
      <div className="grid grid-cols-3 gap-4">
        {digits.map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="h-touch w-touch rounded-xl bg-gray-700 text-2xl font-semibold active:bg-gray-600"
          >
            {d === "clear" ? "C" : d === "enter" ? "OK" : d}
          </button>
        ))}
      </div>
    </div>
  );
}
