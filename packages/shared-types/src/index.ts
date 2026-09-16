// Shared types between apps/backend and apps/frontend.
// Mirrors docs/DB_SCHEMA.md — keep these in sync with the Prisma schema.

export type EmployeeRole = "server" | "bartender" | "kitchen" | "manager" | "owner";

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  isActive: boolean;
}

export type TableStatus = "available" | "occupied" | "needs_cleaning";

export interface RestaurantTable {
  id: string;
  tableNumber: number;
  posX: number;
  posY: number;
  status: TableStatus;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  selectionType: "single" | "multiple";
  isRequired: boolean;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  modifierGroupId: string;
  name: string;
  priceDelta: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  isBuildYourOwn: boolean;
  sortOrder: number;
  isActive: boolean;
  modifierGroups: ModifierGroup[];
  defaultModifierIds: string[]; // pre-highlighted for specialty items
}

export type OrderStatus =
  | "open"
  | "sent_to_kitchen"
  | "in_progress"
  | "ready"
  | "completed"
  | "paid"
  | "voided";

export type PaymentMethod = "cash" | "card" | "check" | "gift_card";

export interface OrderItemModifier {
  modifierId: string;
  isAdded: boolean; // true = added beyond default, false = removed from default
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  basePrice: number;
  notes: string | null;
  modifiers: OrderItemModifier[];
}

export interface Order {
  id: string;
  tableId: string | null;
  barTabId: string | null;
  employeeId: string;
  status: OrderStatus;
  subtotal: number; // bill portion, no tip
  tax: number;
  tip: number;
  total: number;
  paymentMethod: PaymentMethod | null;
  cashoutId: string | null;
  createdAt: string;
  closedAt: string | null;
  items: OrderItem[];
}

export interface CashoutLineItem {
  id: string;
  orderId: string;
  billAmount: number;
  tipAmount: number;
  paymentMethod: PaymentMethod;
  isChecked: boolean;
}

export interface Cashout {
  id: string;
  employeeId: string;
  shiftId: string;
  baselineTotal: number;
  cashEntered: number | null;
  netExpected: number;
  variance: number | null;
  status: "open" | "closed";
  lineItems: CashoutLineItem[];
}

export interface MiscTicket {
  id: string;
  drawerSessionId: string;
  createdByEmployeeId: string;
  reason: string;
  amount: number;
  createdAt: string;
}

export interface DrawerSession {
  id: string;
  businessDate: string;
  openingFloat: number;
  closingCashCounted: number | null;
  expectedTotal: number;
  variance: number | null;
  status: "open" | "closed";
}
