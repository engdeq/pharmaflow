const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    priceMonthly: { type: Number, default: 0 },
    priceYearly: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    userLimit: { type: Number, default: 10 },
    branchLimit: { type: Number, default: 1 },
    trialDays: { type: Number, default: 0 },
    modules: { type: [String], default: () => [] },
    features: { type: [String], default: () => [] },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
