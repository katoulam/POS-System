import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";

export default function Bar() {
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const startTab = async () => {
    if (!name.trim()) return;
    const tab = await api.post<{ id: string }>("/bar/tabs", { customerName: name });
    navigate(`/order-entry/bar/${tab.id}`);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">New Bar Tab</h1>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Customer name"
        className="w-80 rounded-xl bg-gray-800 p-4 text-xl"
      />
      <button onClick={startTab} className="rounded-xl bg-blue-600 px-8 py-4 text-xl font-bold">
        Start Order
      </button>
    </div>
  );
}
