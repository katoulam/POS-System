import { useEffect, useState } from "react";
import type { Category, MenuItem } from "@pos/shared-types";
import { api } from "../../services/api";

export default function AdminConfig() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [newItem, setNewItem] = useState({ name: "", basePrice: "" });

  const refreshCategories = () => api.get<Category[]>("/menu/categories").then(setCategories);

  useEffect(() => {
    refreshCategories();
  }, []);

  useEffect(() => {
    if (activeCategory) {
      api.get<MenuItem[]>(`/menu/categories/${activeCategory.id}/items`).then(setItems);
    }
  }, [activeCategory]);

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await api.post("/menu/categories", { name: newCategory, sortOrder: categories.length });
    setNewCategory("");
    refreshCategories();
  };

  const addItem = async () => {
    if (!activeCategory || !newItem.name.trim()) return;
    await api.post("/menu/items", {
      categoryId: activeCategory.id,
      name: newItem.name,
      basePrice: Number(newItem.basePrice),
    });
    setNewItem({ name: "", basePrice: "" });
    api.get<MenuItem[]>(`/menu/categories/${activeCategory.id}/items`).then(setItems);
  };

  return (
    <div className="flex h-full bg-gray-900 p-8 text-white">
      <div className="w-1/3 pr-8">
        <h1 className="mb-4 text-2xl font-bold">Categories</h1>
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
        <div className="mt-4 flex gap-2">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name"
            className="flex-1 rounded-lg bg-gray-800 p-3"
          />
          <button onClick={addCategory} className="rounded-lg bg-green-600 px-4">
            Add
          </button>
        </div>
      </div>

      {activeCategory && (
        <div className="flex-1">
          <h2 className="mb-4 text-2xl font-bold">{activeCategory.name} — Items</h2>
          {items.map((item) => (
            <div key={item.id} className="mb-2 rounded-lg bg-gray-800 p-4">
              {item.name} — ${item.basePrice.toFixed(2)}
            </div>
          ))}
          <div className="mt-4 flex gap-2">
            <input
              value={newItem.name}
              onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))}
              placeholder="Item name"
              className="rounded-lg bg-gray-800 p-3"
            />
            <input
              value={newItem.basePrice}
              onChange={(e) => setNewItem((s) => ({ ...s, basePrice: e.target.value }))}
              placeholder="Price"
              className="w-28 rounded-lg bg-gray-800 p-3"
            />
            <button onClick={addItem} className="rounded-lg bg-green-600 px-4">
              Add Item
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Modifier groups, modifiers, and specialty defaults (pre-highlighted toppings) are managed via the same
            pattern — see the menu API in apps/backend/src/modules/menu.
          </p>
        </div>
      )}
    </div>
  );
}
