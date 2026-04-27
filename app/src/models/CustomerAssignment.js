const mongoose = require("mongoose");

const customerAssignmentSchema = new mongoose.Schema(
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
      default: ""
    },
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
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignmentRole: {
      type: String,
      enum: ["primary", "backup"],
      default: "backup"
    },
    active: {
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

customerAssignmentSchema.index(
  { customerId: 1, adobeAccountId: 1, active: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

customerAssignmentSchema.index(
  { customerId: 1, assignmentRole: 1, active: 1 },
  { unique: true, partialFilterExpression: { assignmentRole: "primary", active: true } }
);

customerAssignmentSchema.set("toJSON", {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("CustomerAssignment", customerAssignmentSchema);
