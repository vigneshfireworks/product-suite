export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  createdBy: string;
}

export const SYSTEM_ROLES: Role[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access to all features and settings.",
    color: "#ef4444",
    permissions: ["*"],
    isSystem: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "partner",
    name: "Partner",
    description: "Access to assigned business portals and analytics.",
    color: "#3b82f6",
    permissions: ["businesses.read", "orders.read", "products.read", "expenses.read"],
    isSystem: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "customer",
    name: "Customer",
    description: "Can browse, order and manage their own account.",
    color: "#22c55e",
    permissions: ["products.read", "orders.own", "profile.own"],
    isSystem: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    createdBy: "system",
  },
];
