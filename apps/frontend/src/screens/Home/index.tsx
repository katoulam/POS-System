import { useNavigate } from "react-router-dom";
import { useSession } from "../../store/session";

const BUTTONS: { label: string; path: string }[] = [
  { label: "Tables", path: "/floor-plan" },
  { label: "Bar", path: "/bar" },
  { label: "Queue", path: "/kitchen-queue" },
  { label: "Pay", path: "/payment" },
  { label: "Cashout", path: "/cashout" },
];

export default function Home() {
  const navigate = useNavigate();
  const { employee, logout } = useSession();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-gray-900 text-white">
      <h1 className="text-2xl">Welcome, {employee?.name}</h1>
      <div className="grid grid-cols-3 gap-6">
        {BUTTONS.map((b) => (
          <button
            key={b.path}
            onClick={() => navigate(b.path)}
            className="h-40 w-40 rounded-2xl bg-blue-600 text-xl font-bold active:bg-blue-500"
          >
            {b.label}
          </button>
        ))}
        {employee?.role === "manager" || employee?.role === "owner" ? (
          <>
            <button
              onClick={() => navigate("/admin")}
              className="h-40 w-40 rounded-2xl bg-purple-700 text-xl font-bold active:bg-purple-600"
            >
              Admin
            </button>
            <button
              onClick={() => navigate("/drawer-balance")}
              className="h-40 w-40 rounded-2xl bg-purple-700 text-xl font-bold active:bg-purple-600"
            >
              Drawer
            </button>
          </>
        ) : null}
      </div>
      <button
        onClick={() => {
          logout();
          navigate("/");
        }}
        className="rounded-xl bg-gray-700 px-6 py-3 text-lg"
      >
        Sign out
      </button>
    </div>
  );
}
