import { Navigate, Route, Routes } from "react-router-dom";
import { SessionProvider, useSession } from "./store/session";
import Login from "./screens/Login";
import Home from "./screens/Home";
import FloorPlan from "./screens/FloorPlan";
import OrderEntry from "./screens/OrderEntry";
import KitchenQueue from "./screens/KitchenQueue";
import Bar from "./screens/Bar";
import Payment from "./screens/Payment";
import CashoutScreen from "./screens/Cashout";
import DrawerBalance from "./screens/DrawerBalance";
import AdminConfig from "./screens/AdminConfig";

function RequireEmployee({ children }: { children: JSX.Element }) {
  const { employee } = useSession();
  return employee ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<RequireEmployee><Home /></RequireEmployee>} />
      <Route path="/floor-plan" element={<RequireEmployee><FloorPlan /></RequireEmployee>} />
      <Route path="/order-entry/table/:tableId" element={<RequireEmployee><OrderEntry /></RequireEmployee>} />
      <Route path="/order-entry/bar/:tabId" element={<RequireEmployee><OrderEntry /></RequireEmployee>} />
      <Route path="/kitchen-queue" element={<RequireEmployee><KitchenQueue /></RequireEmployee>} />
      <Route path="/bar" element={<RequireEmployee><Bar /></RequireEmployee>} />
      <Route path="/payment" element={<RequireEmployee><Payment /></RequireEmployee>} />
      <Route path="/cashout" element={<RequireEmployee><CashoutScreen /></RequireEmployee>} />
      <Route path="/drawer-balance" element={<RequireEmployee><DrawerBalance /></RequireEmployee>} />
      <Route path="/admin" element={<RequireEmployee><AdminConfig /></RequireEmployee>} />
    </Routes>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AppRoutes />
    </SessionProvider>
  );
}
