const mongoose = require("mongoose");

const parameterOptionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    days: {
      type: Number,
      default: 0
    },
    enabled: {
      type: Boolean,
      default: true
    },
    sortOrder: {
      type: Number,
      default: 1,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "sortOrder must be an integer"
      }
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

parameterOptionSchema.index({ category: 1, name: 1 }, { unique: true });

parameterOptionSchema.set("toJSON", {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("ParameterOption", parameterOptionSchema);
