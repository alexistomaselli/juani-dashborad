/**
 * Tipos del dominio derivados del schema de Prisma.
 * Se definen aquí para evitar problemas de resolución de módulos
 * en el IDE con la cadena de re-exports de @prisma/client.
 */

export interface Order {
  id: string;
  customerName: string;
  whatsapp: string;
  quantity: number;
  product: string;
  productId: string | null;
  unitPrice: number | null;
  unitCost: number | null;
  status: string;
  isPaid: boolean;
  totalAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
  orderNumber: number | null;
  deliveryAddress: string | null;
}

export interface Product {
  id: string;
  name: string;
  unitsPerPackage: number;
  price: number;
  cost: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderWithProduct = Order & {
  productRef?: Product | null;
};
