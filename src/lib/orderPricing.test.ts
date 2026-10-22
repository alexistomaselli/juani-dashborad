import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getOrderTotal, getOrderProfit, getOrderPricingUpdate, summarizeOrderAmounts, formatOrderAmount } from './orderPricing';

const original = { productId: 'original', quantity: 2, unitPrice: 5000, unitCost: 2000, totalAmount: 10000 };
const catalog = { price: 6000, cost: 3000 };

test('catalog changes do not change the agreed total or historical margin', () => {
  const order = { ...original, productRef: catalog };
  assert.equal(getOrderTotal(order), 10000);
  assert.equal(getOrderProfit(order), 6000);
  order.productRef = { price: 9000, cost: 4000 };
  assert.equal(getOrderTotal(order), 10000);
  assert.equal(getOrderProfit(order), 6000);
});

test('the saved total takes precedence, including zero and discounted amounts', () => {
  assert.equal(getOrderTotal({ ...original, totalAmount: 9000 }), 9000);
  assert.equal(getOrderTotal({ ...original, totalAmount: 0 }), 0);
  assert.equal(getOrderProfit({ ...original, unitCost: 0 }), 10000);
});

test('legacy records use their stored unit price, never the catalog or a fabricated zero', () => {
  assert.equal(getOrderTotal({ ...original, totalAmount: null }), 10000);
  const unknown = { ...original, totalAmount: null, unitPrice: null, unitCost: null, productRef: catalog };
  assert.equal(getOrderTotal(unknown), null);
  assert.equal(getOrderProfit(unknown), null);
  assert.equal(formatOrderAmount(null), 'Sin importe registrado');
});

test('unrelated edits omit all financial fields, preserving existing nulls and discounts', () => {
  for (const order of [original, { ...original, totalAmount: 9000 }, { ...original, unitPrice: null, unitCost: null, totalAmount: null }]) {
    const before = structuredClone(order);
    assert.deepEqual(getOrderPricingUpdate(order, 'original', 2, catalog), {});
    assert.deepEqual(order, before);
    assert.deepEqual(getOrderPricingUpdate(order, 'original', 2, undefined), {});
  }
});

test('quantity edits use the stored unit price and leave both snapshot fields untouched', () => {
  assert.deepEqual(getOrderPricingUpdate(original, 'original', 3, catalog), { totalAmount: 15000 });
  assert.deepEqual(getOrderPricingUpdate({ ...original, unitPrice: 0 }, 'original', 3, catalog), { totalAmount: 0 });
  assert.throws(() => getOrderPricingUpdate({ ...original, unitPrice: null }, 'original', 3, catalog), /no tiene precio por pack/);
});

test('new orders and explicit product changes capture current price and cost', () => {
  const expected = { unitPrice: 6000, unitCost: 3000, totalAmount: 18000 };
  assert.deepEqual(getOrderPricingUpdate(null, 'new', 3, catalog), expected);
  assert.deepEqual(getOrderPricingUpdate(original, 'new', 3, catalog), expected);
  assert.deepEqual(getOrderPricingUpdate(null, 'new', 1, { price: 0, cost: 0 }), { unitPrice: 0, unitCost: 0, totalAmount: 0 });
  assert.throws(() => getOrderPricingUpdate(original, 'new', 1, undefined), /producto seleccionado/);
});

test('invalid quantities and nonfinite catalog amounts are rejected before saving', () => {
  for (const quantity of [0, -1, 1.5, NaN]) {
    assert.throws(() => getOrderPricingUpdate(original, 'original', quantity, catalog), /cantidad/);
  }
  assert.throws(() => getOrderPricingUpdate(null, 'new', 1, { price: Infinity, cost: 0 }), /precio y costo/);
});

test('sales, collections and margins consistently exclude cancellations and count missing amounts', () => {
  const paid = { ...original, status: 'DELIVERED', isPaid: true };
  const unpaid = { ...original, status: 'PENDING', isPaid: false, totalAmount: null };
  const cancelled = { ...original, status: 'CANCELLED', isPaid: true, totalAmount: 999999 };
  const unknown = { ...paid, totalAmount: null, unitPrice: null, unitCost: null };
  assert.deepEqual(summarizeOrderAmounts([paid, unpaid, cancelled, unknown]), {
    revenue: 20000, paid: 10000, pending: 10000, profit: 12000,
    missingTotals: 1, missingProfits: 1, average: 10000,
  });
});

test('missing cost does not fabricate profit, while a loss remains a valid margin', () => {
  assert.equal(getOrderProfit({ ...original, unitCost: null }), null);
  assert.equal(getOrderProfit({ ...original, unitCost: 6000 }), -2000);
  const unknown = { ...original, totalAmount: null, unitPrice: null, unitCost: null, status: 'PENDING', isPaid: false };
  assert.equal(summarizeOrderAmounts([unknown]).average, null);
});
