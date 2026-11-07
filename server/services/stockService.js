const MedicineBatch = require("../models/MedicineBatch");
const InventoryTransaction = require("../models/InventoryTransaction");

async function getAvailableQty(medicineId) {
  const batches = await MedicineBatch.find({
    medicine: medicineId,
    isActive: true,
    quantity: { $gt: 0 },
    expiryDate: { $gt: new Date() },
  });
  return batches.reduce((sum, b) => sum + b.quantity, 0);
}

/** FEFO allocation: earliest expiry first, skip expired */
async function allocateFEFO(medicineId, quantity, session = null) {
  const query = MedicineBatch.find({
    medicine: medicineId,
    isActive: true,
    quantity: { $gt: 0 },
    expiryDate: { $gt: new Date() },
  }).sort({ expiryDate: 1 });

  if (session) query.session(session);
  const batches = await query;

  let remaining = quantity;
  const allocations = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    allocations.push({ batch, quantity: take });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error("Insufficient non-expired stock.");
  }

  return allocations;
}

async function deductStock(allocations, { type, reference, userId, session }) {
  for (const { batch, quantity } of allocations) {
    const previousQty = batch.quantity;
    batch.quantity -= quantity;
    await batch.save(session ? { session } : undefined);

    const tx = {
      medicine: batch.medicine,
      batch: batch._id,
      type,
      quantity: -quantity,
      previousQty,
      newQty: batch.quantity,
      reference,
      performedBy: userId,
    };

    if (session) await InventoryTransaction.create([tx], { session });
    else await InventoryTransaction.create(tx);
  }
}

async function addStock({
  medicineId,
  batchNumber,
  quantity,
  expiryDate,
  purchasePrice,
  sellingPrice,
  supplierId,
  type,
  reference,
  userId,
  session,
}) {
  let query = MedicineBatch.findOne({ medicine: medicineId, batchNumber });
  if (session) query = query.session(session);
  let batch = await query;

  let previousQty = 0;
  if (batch) {
    previousQty = batch.quantity;
    batch.quantity += quantity;
    if (expiryDate) batch.expiryDate = expiryDate;
    if (purchasePrice != null) batch.purchasePrice = purchasePrice;
    if (sellingPrice != null) batch.sellingPrice = sellingPrice;
    await batch.save(session ? { session } : undefined);
  } else {
    const payload = {
      medicine: medicineId,
      batchNumber,
      quantity,
      expiryDate,
      purchasePrice: purchasePrice || 0,
      sellingPrice: sellingPrice || 0,
      supplier: supplierId,
    };
    batch = session
      ? (await MedicineBatch.create([payload], { session }))[0]
      : await MedicineBatch.create(payload);
  }

  const tx = {
    medicine: medicineId,
    batch: batch._id,
    type,
    quantity,
    previousQty,
    newQty: batch.quantity,
    reference,
    performedBy: userId,
  };
  if (session) await InventoryTransaction.create([tx], { session });
  else await InventoryTransaction.create(tx);

  return batch;
}

module.exports = {
  getAvailableQty,
  allocateFEFO,
  deductStock,
  addStock,
};
