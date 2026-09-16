import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Category, MenuItem, Modifier } from "@pos/shared-types";
import { api } from "../../services/api";
import { useSession } from "../../store/session";

export default function OrderEntry() {
  const { tableId, tabId } = useParams();
  const { employee } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  // Selected modifiers for the item currently being customized, seeded
  // from its defaults when a specialty item is opened.
  const [selectedModifierIds, setSelectedModifierIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get<Category[]>("/menu/categories").then(setCategories);
  }, []);

  useEffect(() => {
    if (activeCategory) {
      api.get<MenuItem[]>(`/menu/categories/${activeCategory.id}/items`).then(setItems);
    }
  }, [activeCategory]);

  const openItem = (item: MenuItem) => {
    setActiveItem(item);
    // Specialty items open with their preset ingredients already
    // highlighted; build-your-own opens with nothing selected.
    setSelectedModifierIds(new Set(item.defaultModifierIds));
  };

  const toggleModifier = (modifier: Modifier) => {
    setSelectedModifierIds((prev) => {
      const next = new Set(prev);
      if (next.has(modifier.id)) next.delete(modifier.id);
      else next.add(modifier.id);
      return next;
    });
  };

  const addToOrder = async () => {
    if (!activeItem || !employee) return;
    const order = await api.post<{ id: string }>("/orders", { tableId, barTabId: tabId, employeeId: employee.id });
    await api.post(`/orders/${order.id}/items`, {
      menuItemId: activeItem.id,
      basePrice: activeItem.basePrice,
      modifiers: Array.from(selectedModifierIds).map((modifierId) => ({
        modifierId,
        isAdded: !activeItem.defaultModifierIds.includes(modifierId),
      })),
    });
    setActiveItem(null);
  };

  return (
    <div className="flex h-full bg-gray-900 text-white">
      <div className="w-1/4 border-r border-gray-700 p-4">
        <h2 className="mb-4 text-xl font-bold">Categories</h2>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c)}
            className={`mb-2 block w-full rounded-lg p-4 text-left text-lg ${
              activeCategory?.id === c.id ? "bg-blue-600" : "bg-gray-800"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {!activeItem ? (
        <div className="grid flex-1 grid-cols-3 gap-4 p-4 content-start">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => openItem(item)}
              className="rounded-xl bg-gray-800 p-6 text-left text-lg font-semibold"
            >
              {item.name}
              <div className="text-sm text-gray-400">${item.basePrice.toFixed(2)}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="mb-4 text-2xl font-bold">{activeItem.name}</h2>
          {activeItem.modifierGroups.map((group) => (
            <div key={group.id} className="mb-6">
              <h3 className="mb-2 text-lg text-gray-300">{group.name}</h3>
              <div className="flex flex-wrap gap-3">
                {group.modifiers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleModifier(m)}
                    className={`rounded-lg px-5 py-3 text-lg ${
                      selectedModifierIds.has(m.id) ? "bg-green-600" : "bg-gray-800"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={addToOrder} className="mt-4 rounded-xl bg-blue-600 px-8 py-4 text-xl font-bold">
            Add to order
          </button>
        </div>
      )}
    </div>
  );
}
