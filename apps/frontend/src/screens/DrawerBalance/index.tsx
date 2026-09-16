import { useState } from "react";
import type { DrawerSession } from "@pos/shared-types";
import { api } from "../../services/api";
import { useSession } from "../../store/session";

interface DrawerLineItem {
  id: string;
  amount: number;
  tenderType: string;
  isChecked: boolean;
}

interface DrawerDetails extends DrawerSession {
  lineItems: DrawerLineItem[];
}

export default function DrawerBalance() {
  const { employee } = useSession();
  const [session, setSession] = useState<DrawerDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [miscReason, setMiscReason] = useState("");
  const [miscAmount, setMiscAmount] = useState("");

  const isOwnerOrManager = employee?.role === "owner" || employee?.role === "manager";

  const open = async () => {
    if (!employee) return;
    const s = await api.post<DrawerDetails>("/drawer/sessions", {
      actingEmployeeId: employee.id,
      businessDate: new Date().toISOString().slice(0, 10),
      openingFloat: 0,
    });
    setSession(s);
  };

  const openDetails = async () => {
    if (!session || !employee) return;
    const s = await api.get<DrawerDetails>(`/drawer/sessions/${session.id}/details?actingEmployeeId=${employee.id}`);
    setSession(s);
    setShowDetails(true);
  };

  const selectAll = async () => {
    if (!session || !employee) return;
    const s = await api.post<DrawerDetails>(`/drawer/sessions/${session.id}/select-all`, {
      actingEmployeeId: employee.id,
    });
    setSession(s);
  };

  const addMiscTicket = async () => {
    if (!session || !employee || !miscReason) return;
    await api.post(`/drawer/sessions/${session.id}/misc-tickets`, {
      actingEmployeeId: employee.id,
      reason: miscReason,
      amount: Number(miscAmount),
    });
    setMiscReason("");
    setMiscAmount("");
    openDetails();
  };

  const close = async () => {
    if (!session || !employee) return;
    await api.post(`/drawer/sessions/${session.id}/close`, {
      actingEmployeeId: employee.id,
      closingCashCounted: Number(closingCash),
    });
    setSession(null);
  };

  if (!isOwnerOrManager) {
    return <div className="p-8 text-white">Manager/owner access only.</div>;
  }

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900 text-white">
        <button onClick={open} className="rounded-xl bg-blue-600 px-8 py-4 text-xl font-bold">
          Open Drawer Session
        </button>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 p-8 text-white">
      <h1 className="mb-2 text-2xl font-bold">Drawer Balance — {session.businessDate}</h1>
      <p className="mb-6 text-4xl font-bold">Expected: ${session.expectedTotal.toFixed(2)}</p>

      <div className="fixed bottom-8 left-8">
        <button onClick={openDetails} className="rounded-lg bg-gray-700 px-5 py-3 text-lg">
          Details
        </button>
      </div>

      {showDetails && (
        <div className="mb-6 max-w-2xl">
          <button onClick={selectAll} className="mb-3 rounded-lg bg-blue-600 px-5 py-3 text-lg">
            Select All
          </button>
          {session.lineItems.map((line) => (
            <div key={line.id} className="mb-2 flex items-center justify-between rounded-lg bg-gray-800 p-3">
              <span>
                {line.tenderType} — ${line.amount.toFixed(2)}
              </span>
              <span className={`h-8 w-8 rounded-full text-center ${line.isChecked ? "bg-green-600" : "bg-red-600"}`}>
                {line.isChecked ? "✓" : "✕"}
              </span>
            </div>
          ))}

          <div className="mt-6 rounded-lg bg-gray-800 p-4">
            <h3 className="mb-2 text-lg font-semibold">New Misc Ticket</h3>
            <input
              value={miscReason}
              onChange={(e) => setMiscReason(e.target.value)}
              placeholder="Reason (comp, paid-out, open tab...)"
              className="mb-2 block w-full rounded-lg bg-gray-700 p-3"
            />
            <input
              value={miscAmount}
              onChange={(e) => setMiscAmount(e.target.value)}
              placeholder="Amount"
              className="mb-2 block w-40 rounded-lg bg-gray-700 p-3"
            />
            <button onClick={addMiscTicket} className="rounded-lg bg-purple-600 px-5 py-3">
              Add Ticket
            </button>
          </div>
        </div>
      )}

      <label className="mb-4 block text-lg">
        Cash counted
        <input
          value={closingCash}
          onChange={(e) => setClosingCash(e.target.value)}
          className="ml-3 w-32 rounded-lg bg-gray-800 p-2 text-lg"
        />
      </label>

      <button onClick={close} className="rounded-xl bg-green-600 px-8 py-4 text-xl font-bold">
        Close Drawer
      </button>
    </div>
  );
}
