import { useState } from "react";
import type { Cashout } from "@pos/shared-types";
import { api } from "../../services/api";
import { useSession } from "../../store/session";

export default function CashoutScreen() {
  const { employee, shiftId } = useSession();
  const [cashout, setCashout] = useState<Cashout | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [cashEntered, setCashEntered] = useState("");

  const open = async () => {
    if (!employee || !shiftId) return;
    const c = await api.post<Cashout>("/payments/cashouts", { employeeId: employee.id, shiftId });
    setCashout(c);
  };

  const toggleLine = async (lineItemId: string, isChecked: boolean) => {
    if (!cashout) return;
    const c = await api.patch<Cashout>(`/payments/cashouts/${cashout.id}/line-items/${lineItemId}`, { isChecked });
    setCashout(c);
  };

  const selectAll = async () => {
    if (!cashout) return;
    const c = await api.post<Cashout>(`/payments/cashouts/${cashout.id}/select-all`, {});
    setCashout(c);
  };

  const close = async () => {
    if (!cashout) return;
    await api.post(`/payments/cashouts/${cashout.id}/close`, { cashEntered: Number(cashEntered) });
    setCashout(null);
    setCashEntered("");
  };

  if (!cashout) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900 text-white">
        <button onClick={open} className="rounded-xl bg-blue-600 px-8 py-4 text-xl font-bold">
          Open Cashout
        </button>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 p-8 text-white">
      <h1 className="mb-2 text-2xl font-bold">Cashout</h1>
      <p className="mb-6 text-4xl font-bold">
        {cashout.netExpected < 0 ? "Drawer owes you " : "You owe "}${Math.abs(cashout.netExpected).toFixed(2)}
      </p>

      <label className="mb-4 block text-lg">
        Cash you're turning in
        <input
          value={cashEntered}
          onChange={(e) => setCashEntered(e.target.value)}
          className="ml-3 w-32 rounded-lg bg-gray-800 p-2 text-lg"
        />
      </label>

      <button onClick={() => setShowDetails((s) => !s)} className="mb-4 rounded-lg bg-gray-700 px-5 py-3 text-lg">
        Details
      </button>

      {showDetails && (
        <div className="mb-4">
          <button onClick={selectAll} className="mb-3 rounded-lg bg-blue-600 px-5 py-3 text-lg">
            Select All
          </button>
          {cashout.lineItems
            .filter((l) => l.paymentMethod !== "cash")
            .map((line) => (
              <div key={line.id} className="mb-2 flex items-center justify-between rounded-lg bg-gray-800 p-3">
                <span>
                  {line.paymentMethod} — bill ${line.billAmount.toFixed(2)}, tip ${line.tipAmount.toFixed(2)}
                </span>
                <button
                  onClick={() => toggleLine(line.id, !line.isChecked)}
                  className={`h-10 w-10 rounded-full text-xl ${line.isChecked ? "bg-green-600" : "bg-red-600"}`}
                >
                  {line.isChecked ? "✓" : "✕"}
                </button>
              </div>
            ))}
        </div>
      )}

      <button onClick={close} className="rounded-xl bg-green-600 px-8 py-4 text-xl font-bold">
        Finish Cashout
      </button>
    </div>
  );
}
