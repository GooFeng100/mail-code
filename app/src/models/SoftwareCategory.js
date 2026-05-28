const mongoose = require("mongoose");

const softwareCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true, lowercase: true },
    icon: { type: String, default: "" },
    color: { type: String, default: "" },
    description: { type: String, default: "" },
    sort: { type: Number, default: 100 },
    isEnabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

softwareCategorySchema.index({ key: 1 }, { unique: true });
softwareCategorySchema.index({ isEnabled: 1, sort: 1, createdAt: -1 });

softwareCategorySchema.set("toJSON", {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    ret.version = ret.__v;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("SoftwareCategory", softwareCategorySchema);
