import { useEffect, useState } from "react";
import type { Order, PaymentMethod, RestaurantTable } from "@pos/shared-types";
import { api } from "../../services/api";

export default function Payment() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [tip, setTip] = useState("0");
  const [method, setMethod] = useState<PaymentMethod>("card");

  useEffect(() => {
    api.get<RestaurantTable[]>("/tables").then((all) => setTables(all.filter((t) => t.status === "occupied")));
  }, []);

  const printBill = async (table: RestaurantTable) => {
    setSelectedTable(table);
    const tableOrder = await api.get<Order | null>(`/orders/by-table/${table.id}`);
    setOrder(tableOrder);
    // Actual bill printing is triggered server-side (printing.service.ts)
    // once a dedicated /print-bill endpoint is wired to a real printer.
  };

  const pay = async () => {
    if (!order) return;
    await api.post(`/orders/${order.id}/pay`, { paymentMethod: method, tip: Number(tip) });
    setSelectedTable(null);
    setOrder(null);
    setTip("0");
  };

  return (
    <div className="flex h-full bg-gray-900 p-8 text-white">
      <div className="w-1/3">
        <h1 className="mb-4 text-2xl font-bold">Occupied Tables</h1>
        {tables.map((t) => (
          <button
            key={t.id}
            onClick={() => printBill(t)}
            className="mb-2 block w-full rounded-lg bg-gray-800 p-4 text-left text-lg"
          >
            Table {t.tableNumber}
          </button>
        ))}
      </div>

      {selectedTable && (
        <div className="flex-1 pl-8">
          <h2 className="mb-4 text-2xl font-bold">Table {selectedTable.tableNumber}</h2>
          <p className="mb-4 text-gray-400">Bill printed. Collect payment, then charge and record the tip.</p>

          <div className="mb-4 flex gap-3">
            {(["cash", "card", "check", "gift_card"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`rounded-lg px-5 py-3 text-lg ${method === m ? "bg-blue-600" : "bg-gray-800"}`}
              >
                {m}
              </button>
            ))}
          </div>

          <label className="mb-4 block text-lg">
            Tip
            <input
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              className="ml-3 w-32 rounded-lg bg-gray-800 p-2 text-lg"
            />
          </label>

          <button onClick={pay} className="rounded-xl bg-green-600 px-8 py-4 text-xl font-bold">
            Charge & Print Receipt
          </button>
        </div>
      )}
    </div>
  );
}
