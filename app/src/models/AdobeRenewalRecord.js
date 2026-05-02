const mongoose = require("mongoose");

const adobeRenewalRecordSchema = new mongoose.Schema(
  {
    adobeAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdobeAccount",
      required: true
    },
    renewalDate: {
      type: Date,
      required: true
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
