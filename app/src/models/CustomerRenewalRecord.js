const mongoose = require("mongoose");

const customerRenewalRecordSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    customerCode: {
      type: String,
      required: true
    },
    customerNickname: {
      type: String,
      required: true
    },
    renewalDate: {
      type: Date,
      required: true
    },
    planName: {
      type: String,
      default: ""
    },
    planId: {
      type: String,
      required: true
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

customerRenewalRecordSchema.index({ customerId: 1, renewalDate: 1 });

customerRenewalRecordSchema.set("toJSON", {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("CustomerRenewalRecord", customerRenewalRecordSchema);
