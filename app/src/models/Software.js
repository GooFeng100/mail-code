const mongoose = require("mongoose");
const { SOFTWARE_CATEGORIES } = require("../constants/softwareCategories");

const SOURCE_TYPES = ["local_upload", "remote_import", "external_link"];
const VALIDITY_STATUSES = [
  "local_file_ok",
  "local_file_missing",
  "external_available",
  "external_unavailable",
  "unchecked",
  "checking"
];
const CATEGORY_KEYS = SOFTWARE_CATEGORIES.map((item) => item.key);

const softwareSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    categoryKey: { type: String, enum: CATEGORY_KEYS, default: "other", required: true },
    // legacy compatibility field, no longer used for new writes
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "SoftwareCategory", required: false },
    description: { type: String, default: "" },
    appVersion: { type: String, default: "" },
    platform: { type: String, default: "" },
    iconPath: { type: String, default: "" },
    sourceType: { type: String, enum: SOURCE_TYPES, required: true },
    sourceUrl: { type: String, default: "" },
    externalUrl: { type: String, default: "" },
    originalName: { type: String, default: "" },
    fileName: { type: String, default: "" },
    filePath: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: "" },
    fileHash: { type: String, default: "" },
    downloadCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    sort: { type: Number, default: 100 },
    validityStatus: { type: String, enum: VALIDITY_STATUSES, default: "unchecked" },
    validityCheckedAt: { type: Date, default: null },
    lastError: { type: String, default: "" }
  },
  { timestamps: true }
);

softwareSchema.index({ categoryKey: 1, sort: 1, createdAt: -1 });
softwareSchema.index({ sourceType: 1, isPublished: 1, validityStatus: 1 });
softwareSchema.index({ isPublished: 1, sort: 1, updatedAt: -1 });

softwareSchema.set("toJSON", {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    ret.revision = ret.__v;
    ret.version = ret.__v;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = {
  Software: mongoose.model("Software", softwareSchema),
  SOURCE_TYPES,
  VALIDITY_STATUSES
};
