function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// "Dr. Advice" is a fixed consultation fee — its amount must never move with
// a discount, so any discount on this line is ignored during computation.
const NON_DISCOUNTABLE_TITLES = new Set(["Dr. Advice"]);

function computeItemTotals(item) {
  const qty = Number(item.qty) || 0;
  const rate = Number(item.rate) || 0;
  const mrp = Number(item.mrp) || 0;
  const discountPercent = NON_DISCOUNTABLE_TITLES.has(item.title) ? 0 : Number(item.discountPercent) || 0;
  const taxPercent = Number(item.taxPercent) || 0;

  const amount = round2(rate * qty * (1 - discountPercent / 100));
  const taxAmount = round2(amount * (taxPercent / 100));
  const total = round2(amount + taxAmount);

  return {
    category: item.category,
    title: item.title,
    productId: item.productId ?? null,
    qty,
    mrp,
    rate,
    discountPercent,
    amount,
    taxPercent,
    taxAmount,
    total,
  };
}

function computeOrderTotals({ items, additionalDiscountAmount, vppDiscountPercent, courierCharges }) {
  const computedItems = (items || []).map(computeItemTotals);

  const subtotalAmount = round2(computedItems.reduce((sum, item) => sum + item.total, 0));
  const vppDiscountAmount = round2(subtotalAmount * ((Number(vppDiscountPercent) || 0) / 100));
  const additionalDiscount = round2(Number(additionalDiscountAmount) || 0);
  const courier = round2(Number(courierCharges) || 0);

  const netPayable = round2(subtotalAmount - additionalDiscount - vppDiscountAmount + courier);
  const grandTotal = netPayable;

  return {
    items: computedItems,
    subtotalAmount,
    additionalDiscountAmount: additionalDiscount,
    vppDiscountAmount,
    netPayable,
    grandTotal,
  };
}

module.exports = { computeItemTotals, computeOrderTotals, round2 };
