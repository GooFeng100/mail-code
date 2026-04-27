const mongoose = require("mongoose");

const adobeAccountSchema = new mongoose.Schema(
  {
    adobeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    accountEmail: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    accountEmailPassword: {
      type: String,
      default: ""
    },
    adobePassword: {
      type: String,
      required: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    verificationEmail: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    verificationEmailLocal: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    verificationEmailDomain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    accountPlan: {
      type: String,
      required: true
    },
    initialAccountPlan: {
      type: String,
      default: ""
    },
    paidAt: {
      type: Date,
      default: null
    },
    baseExpireAt: {
      type: Date,
      default: null
    },
    accountExpireAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      default: "正常"
    },
    enabled: {
      type: Boolean,
      default: true
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

adobeAccountSchema.index({ verificationEmailLocal: 1, verificationEmailDomain: 1 }, { unique: true });

adobeAccountSchema.set("toJSON", {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model("AdobeAccount", adobeAccountSchema);
