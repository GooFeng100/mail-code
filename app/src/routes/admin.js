const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const config = require("../config");
const {
  createParameterOption,
  deleteParameterOption,
  getOptionConfig,
  listParameterOptions,
  updateParameterOption
} = require("../services/parameterService");
const {
  createAdobeAccount,
  createAdobeRenewal,
  createAssignment,
  createCustomer,
  createCustomerRenewal,
  deleteAdobeAccount,
  deleteAdobeRenewal,
  deleteAssignment,
  deleteCustomer,
  deleteCustomerRenewal,
  getAdobeAccount,
  getAdobeDetail,
  getCustomer,
  getCustomerDetail,
  listAdobeAccounts,
  listAdobeRenewals,
  listAssignments,
  listCustomers,
  listCustomerRenewals,
  updateAdobeAccount,
  updateAssignment,
  updateCustomer
} = require("../services/accountManagementService");
const AdobeAccount = require("../models/AdobeAccount");
const { saveCode } = require("../services/codeService");

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/config", async (req, res, next) => {
  try {
    res.json({
      ok: true,
      mailDomain: config.mailDomain,
      mailDomains: config.mailDomains,
      verificationCodeUrl: config.verificationCodeUrl,
      ...(await getOptionConfig())
    });
  } catch (error) {
    next(error);
  }
});

router.get("/parameters", async (req, res, next) => {
  try {
    res.json({ ok: true, parameters: await listParameterOptions() });
  } catch (error) {
    next(error);
  }
});

router.post("/parameters", async (req, res, next) => {
  try {
    res.status(201).json({ ok: true, parameter: await createParameterOption(req.body) });
  } catch (error) {
    next(error);
  }
});

router.put("/parameters/:id", async (req, res, next) => {
  try {
    res.json({ ok: true, parameter: await updateParameterOption(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

router.delete("/parameters/:id", async (req, res, next) => {
  try {
    await deleteParameterOption(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/adobe-accounts", async (req, res, next) => {
  try {
    res.json({ ok: true, adobeAccounts: await listAdobeAccounts() });
  } catch (error) {
    next(error);
  }
});

router.post("/adobe-accounts", async (req, res, next) => {
  try {
    res.status(201).json({ ok: true, adobeAccount: await createAdobeAccount(req.body) });
  } catch (error) {
    next(error);
  }
});

router.get("/adobe-accounts/:id/detail", async (req, res, next) => {
  try {
    res.json({ ok: true, ...(await getAdobeDetail(req.params.id)) });
  } catch (error) {
    next(error);
  }
});

router.get("/adobe-accounts/:id/renewals", async (req, res, next) => {
  try {
    res.json({ ok: true, renewalRecords: await listAdobeRenewals(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.post("/adobe-accounts/:id/renewals", async (req, res, next) => {
  try {
    res.status(201).json({ ok: true, renewalRecords: await createAdobeRenewal(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

router.delete("/adobe-accounts/:id/renewals/:renewalId", async (req, res, next) => {
  try {
    res.json({ ok: true, renewalRecords: await deleteAdobeRenewal(req.params.id, req.params.renewalId) });
  } catch (error) {
    next(error);
  }
});

router.get("/adobe-accounts/:id", async (req, res, next) => {
  try {
    res.json({ ok: true, adobeAccount: await getAdobeAccount(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.put("/adobe-accounts/:id", async (req, res, next) => {
  try {
    res.json({ ok: true, adobeAccount: await updateAdobeAccount(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

router.delete("/adobe-accounts/:id", async (req, res, next) => {
  try {
    await deleteAdobeAccount(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/customers", async (req, res, next) => {
  try {
    res.json({ ok: true, customers: await listCustomers() });
  } catch (error) {
    next(error);
  }
});

router.post("/customers", async (req, res, next) => {
  try {
    res.status(201).json({ ok: true, customer: await createCustomer(req.body) });
  } catch (error) {
    next(error);
  }
});

router.get("/customers/:id/detail", async (req, res, next) => {
  try {
    res.json({ ok: true, ...(await getCustomerDetail(req.params.id)) });
  } catch (error) {
    next(error);
  }
});

router.get("/customers/:id/renewals", async (req, res, next) => {
  try {
    res.json({ ok: true, renewalRecords: await listCustomerRenewals(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.post("/customers/:id/renewals", async (req, res, next) => {
  try {
    res.status(201).json({ ok: true, renewalRecords: await createCustomerRenewal(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

router.delete("/customers/:id/renewals/:renewalId", async (req, res, next) => {
  try {
    res.json({ ok: true, renewalRecords: await deleteCustomerRenewal(req.params.id, req.params.renewalId) });
  } catch (error) {
    next(error);
  }
});

router.get("/customers/:id", async (req, res, next) => {
  try {
    res.json({ ok: true, customer: await getCustomer(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.put("/customers/:id", async (req, res, next) => {
  try {
    res.json({ ok: true, customer: await updateCustomer(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

router.delete("/customers/:id", async (req, res, next) => {
  try {
    await deleteCustomer(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/assignments", async (req, res, next) => {
  try {
    res.json({ ok: true, assignments: await listAssignments() });
  } catch (error) {
    next(error);
  }
});

router.post("/assignments", async (req, res, next) => {
  try {
    res.status(201).json({ ok: true, assignment: await createAssignment(req.body) });
  } catch (error) {
    next(error);
  }
});

router.put("/assignments/:id", async (req, res, next) => {
  try {
    res.json({ ok: true, assignment: await updateAssignment(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

router.delete("/assignments/:id", async (req, res, next) => {
  try {
    res.json({ ok: true, assignment: await deleteAssignment(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.post("/test-code", async (req, res, next) => {
  try {
    const accountEmail = String(req.body.accountEmail || req.body.username || "").trim().toLowerCase();
    const code = String(req.body.code || "123456").trim();
    const adobeAccount = await AdobeAccount.findOne({ accountEmail, enabled: true });

    if (!adobeAccount) {
      return res.status(404).json({ ok: false, error: "enabled Adobe account not found" });
    }

    if (!/^\d{4,8}$/.test(code)) {
      return res.status(400).json({ ok: false, error: "code must be 4-8 digits" });
    }

    const saved = await saveCode({
      code,
      username: adobeAccount.accountEmail,
      emailAddress: adobeAccount.verificationEmail,
      from: "manual-test@example.com",
      subject: "Manual test code"
    });

    res.json({ ok: true, code: saved });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
