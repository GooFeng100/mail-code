const User = require("../models/User");
const AdobeAccount = require("../models/AdobeAccount");
const AdobeRenewalRecord = require("../models/AdobeRenewalRecord");
const Customer = require("../models/Customer");
const CustomerRenewalRecord = require("../models/CustomerRenewalRecord");
const CustomerAssignment = require("../models/CustomerAssignment");
const ParameterOption = require("../models/ParameterOption");
const config = require("../config");
const { ensureDefaultParameterOptions } = require("./parameterService");

async function ensureUserIndexes() {
  await User.updateMany(
    { emailDomain: { $exists: false } },
    [
      {
        $set: {
          emailDomain: {
            $ifNull: [
              "$emailDomain",
              {
                $arrayElemAt: [
                  { $split: ["$emailAddress", "@"] },
                  1
                ]
              }
            ]
          }
        }
      }
    ]
  );

  await User.updateMany(
    { emailDomain: { $in: [null, ""] } },
    { $set: { emailDomain: config.mailDomain } }
  );

  try {
    await User.collection.dropIndex("emailLocal_1");
    console.log("Dropped legacy emailLocal_1 index");
  } catch (error) {
    if (error.codeName !== "IndexNotFound") {
      console.error("Failed to drop legacy emailLocal_1 index:", error.message);
    }
  }

  await User.syncIndexes();
  await AdobeAccount.syncIndexes();
  await AdobeRenewalRecord.syncIndexes();
  await Customer.syncIndexes();
  await CustomerRenewalRecord.syncIndexes();
  await CustomerAssignment.syncIndexes();
  await ParameterOption.syncIndexes();
  await ensureDefaultParameterOptions();
  console.log("Indexes synced");
}

module.exports = { ensureUserIndexes };
