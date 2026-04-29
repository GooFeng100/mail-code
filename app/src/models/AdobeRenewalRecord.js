const mongoose = require("mongoose");

const adobeRenewalRecordSchema = new mongoose.Schema(
  {
    adobeAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdobeAccount",
      required: true
    },
    adobeCode: {
      type: String,
      required: true
    },
    accountEmail: {
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

adobeRenewalRecordSchema.index({ adobeAccountId: 1, renewalDate: 1 });

adobeRenewalRecordSchema.set("toJSON", {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("AdobeRenewalRecord", adobeRenewalRecordSchema);
