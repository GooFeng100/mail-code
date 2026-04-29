const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    customerNickname: {
      type: String,
      required: true,
      trim: true
    },
    customerContact: {
      type: String,
      default: ""
    },
    customerContactEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true
    },
    purchasedPlan: {
      type: String,
      required: true
    },
    purchasedPlanId: {
      type: String,
      default: ""
    },
    initialPurchasedPlan: {
      type: String,
      default: ""
    },
    initialPurchasedPlanId: {
      type: String,
      default: ""
    },
    firstPaidAt: {
      type: Date,
      default: null
    },
    baseAfterSalesExpireAt: {
      type: Date,
      default: null
    },
    remark: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

customerSchema.set("toJSON", {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Customer", customerSchema);
