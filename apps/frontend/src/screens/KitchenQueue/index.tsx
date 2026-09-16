import { useEffect, useState } from "react";
import { api } from "../../services/api";

interface QueueEntry {
  id: string;
  queuePosition: number;
  waitMinutes: number;
  table?: { tableNumber: number } | null;
  barTab?: { customerName: string } | null;
}

export default function KitchenQueue() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);

  const refresh = () => api.get<QueueEntry[]>("/kitchen/queue").then(setQueue);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  const markDone = async (orderId: string) => {
    await api.post(`/orders/${orderId}/mark-done`, {});
    refresh();
  };

  return (
    <div className="h-full bg-gray-900 p-8 text-white">
      <h1 className="mb-6 text-2xl font-bold">Kitchen Queue</h1>
      <div className="flex flex-col gap-3">
        {queue.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between rounded-xl bg-gray-800 p-4">
            <span className="text-xl font-semibold">
              #{entry.queuePosition} — {entry.table ? `Table ${entry.table.tableNumber}` : entry.barTab?.customerName}
            </span>
            <span className="text-lg text-gray-300">{entry.waitMinutes} min</span>
            <button onClick={() => markDone(entry.id)} className="rounded-lg bg-green-600 px-6 py-3 font-bold">
              Done
            </button>
          </div>
        ))}
        {queue.length === 0 && <p className="text-gray-400">No orders in the queue.</p>}
      </div>
    </div>
  );
}
