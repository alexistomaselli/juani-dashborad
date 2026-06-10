/**
 * Tipos del dominio derivados del schema de Prisma.
 * Se definen aquí para evitar problemas de resolución de módulos
 * en el IDE con la cadena de re-exports de @prisma/client.
 */

export interface Customer {
  id: string;
  name: string;
  whatsapp: string | null;
  address: string | null;
  chat_mode: 'NORMAL' | 'COORDINATING' | 'DELIVERING' | null;
  chat_mode_updated_at: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  customerName: string; // Mantener por compatibilidad con UI actual
  whatsapp: string;     // Mantener por compatibilidad con UI actual
  customerId: string | null;
  customer?: Customer | null;
  quantity: number;
  product: string;
  productId: string | null;
  unitPrice: number | null;
  unitCost: number | null;
  status: string;
  isPaid: boolean;
  totalAmount: number | null;
  createdAt: string;
  updatedAt: string;
  orderNumber: number | null;
  deliveryAddress: string | null;
  deliveryId: string | null;
  deliverySequence: number | null;
}

export interface Delivery {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  orders?: Order[];
}

export interface Product {
  id: string;
  name: string;
  unitsPerPackage: number;
  price: number;
  cost: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderWithProduct = Order & {
  productRef?: Product | null;
};

