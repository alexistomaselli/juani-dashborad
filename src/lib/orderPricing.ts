import type { Order, Product } from '../types';

type StoredPricing = Pick<Order, 'quantity' | 'unitPrice' | 'unitCost' | 'totalAmount'>;
type PricingOrder = StoredPricing & Pick<Order, 'productId'>;
type PricingUpdate = Partial<Pick<Order, 'unitPrice' | 'unitCost' | 'totalAmount'>>;

function isAmount(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

// Never substitute today's catalog for the amount agreed on a previous order.
export function getOrderTotal(order: StoredPricing): number | null {
  if (isAmount(order.totalAmount)) return order.totalAmount;
  if (isAmount(order.unitPrice) && Number.isInteger(order.quantity) && order.quantity > 0) {
    return order.unitPrice * order.quantity;
  }
  return null;
}

export function formatOrderAmount(amount: number | null): string {
  return amount === null ? 'Sin importe registrado' : `$${amount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}

export function getOrderProfit(order: StoredPricing): number | null {
  const total = getOrderTotal(order);
  return total !== null && isAmount(order.unitCost)
    ? total - order.unitCost * order.quantity
    : null;
}

export function getOrderPricingUpdate(
  existing: PricingOrder | null | undefined,
  productId: string,
  quantity: number,
  product: Pick<Product, 'price' | 'cost'> | undefined,
): PricingUpdate {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('La cantidad debe ser un número entero mayor que cero.');
  }

  if (existing && existing.productId === productId) {
    // Omit financial fields entirely for unrelated edits, including legacy nulls.
    if (quantity === existing.quantity) return {};
    if (!isAmount(existing.unitPrice)) {
      throw new Error('Este pedido no tiene precio por pack registrado. Conservá la cantidad para editar otros datos; no se usará el precio actual del catálogo.');
    }
    return { totalAmount: quantity * existing.unitPrice };
  }

  if (!product || !isAmount(product.price) || !isAmount(product.cost)) {
    throw new Error('No se pudo obtener el precio y costo del producto seleccionado.');
  }
  return { unitPrice: product.price, unitCost: product.cost, totalAmount: quantity * product.price };
}

export function summarizeOrderAmounts(orders: (StoredPricing & Pick<Order, 'status' | 'isPaid'>)[]) {
  const active = orders.filter(order => order.status !== 'CANCELLED');
  let revenue = 0;
  let paid = 0;
  let profit = 0;
  let missingTotals = 0;
  let missingProfits = 0;
  for (const order of active) {
    const total = getOrderTotal(order);
    const margin = getOrderProfit(order);
    if (total === null) missingTotals++;
    else {
      revenue += total;
      if (order.isPaid) paid += total;
    }
    if (margin === null) missingProfits++;
    else profit += margin;
  }
  const knownTotals = active.length - missingTotals;
  return {
    revenue, paid, profit, missingTotals, missingProfits,
    pending: revenue - paid,
    average: knownTotals > 0 ? revenue / knownTotals : null,
  };
}
