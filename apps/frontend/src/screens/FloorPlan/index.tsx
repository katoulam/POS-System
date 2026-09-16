import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RestaurantTable } from "@pos/shared-types";
import { api } from "../../services/api";

const STATUS_COLOR: Record<RestaurantTable["status"], string> = {
  available: "bg-green-600",
  occupied: "bg-red-600",
  needs_cleaning: "bg-yellow-600",
};

export default function FloorPlan() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<RestaurantTable[]>("/tables").then(setTables);
  }, []);

  return (
    <div className="h-full bg-gray-900 p-8 text-white">
      <h1 className="mb-6 text-2xl font-bold">Tables</h1>
      <div className="relative h-[600px] w-full">
        {tables.map((t) => (
          <button
            key={t.id}
            disabled={t.status !== "available"}
            onClick={() => navigate(`/order-entry/table/${t.id}`)}
            style={{ left: t.posX, top: t.posY }}
            className={`absolute h-24 w-24 rounded-xl text-lg font-bold ${STATUS_COLOR[t.status]} disabled:opacity-70`}
          >
            {t.tableNumber}
          </button>
        ))}
      </div>
    </div>
  );
}
