const express = require("express");
const multer = require("multer");
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
  listSoftwareCategories
} = require("../services/softwareCategoryService");
const {
  createSoftwareFromLocalUpload,
  createSoftwareFromExternalLink,
  listSoftwares,
  getSoftware,
  updateSoftware,
  deleteSoftware,
  setSoftwarePublished,
  setSoftwareCategory,
  setSoftwareSort,
  checkSoftwareValidity,
  softwareDownloadTest,
  resolveRemoteSoftwareMeta
} = require("../services/softwareService");
const {
  startSoftwareImportTask,
  getSoftwareImportTask
} = require("../services/softwareImportTaskService");
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
  syncPlanParameterChange,
  updateAdobeAccount,
  updateAssignment,
  updateCustomer
} = require("../services/accountManagementService");
const AdobeAccount = require("../models/AdobeAccount");
const { saveCode } = require("../services/codeService");

const router = express.Router();
const softwareUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(config.softwareImportMaxMb, config.softwareMaxUploadMb) * 1024 * 1024
  }
});

router.use(requireAuth, requireAdmin);

router.get("/config", async (req, res, next) => {
  try {
    res.json({
      ok: true,
      mailDomain: config.mailDomain,
      mailDomainConfigs: config.mailDomainConfigs,
      mailDomains: config.mailDomains,
      verificationCodeUrls: config.verificationCodeUrls,
      verificationCodeUrl: config.verificationCodeUrl,
      ...(await getOptionConfig())
    });
  } catch (error) {
    next(error);
  }
});

router.get("/parameters", async (req, res, next) => {
  try {
    res.json({ ok: true, ...(await listParameterOptions(req.query)) });
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
    const result = await updateParameterOption(req.params.id, req.body);
    await syncPlanParameterChange(result.previousOption, result.parameter);
    res.json({ ok: true, parameter: result.parameter });
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

router.get("/software-categories", async (req, res, next) => {
  try {
    res.json({ ok: true, ...(await listSoftwareCategories(req.query)) });
  } catch (error) {
    next(error);
  }
});

router.post("/software-categories", async (req, res, next) => {
  res.status(405).json({ ok: false, error: "software categories are fixed enum and cannot be modified" });
});

router.put("/software-categories/:id", async (req, res, next) => {
  res.status(405).json({ ok: false, error: "software categories are fixed enum and cannot be modified" });
});

router.patch("/software-categories/:id/sort", async (req, res, next) => {
  res.status(405).json({ ok: false, error: "software categories are fixed enum and cannot be modified" });
});

router.patch("/software-categories/:id/enabled", async (req, res, next) => {
  res.status(405).json({ ok: false, error: "software categories are fixed enum and cannot be modified" });
});

router.delete("/software-categories/:id", async (req, res, next) => {
  res.status(405).json({ ok: false, error: "software categories are fixed enum and cannot be modified" });
});

router.post("/softwares/upload-local", softwareUpload.fields([
  { name: "file", maxCount: 1 }
]), async (req, res, next) => {
  try {
    const software = await createSoftwareFromLocalUpload({
      body: req.body,
      file: req.files && req.files.file ? req.files.file[0] : null
    });
    res.status(201).json({ ok: true, software });
  } catch (error) {
    next(error);
  }
});

router.post("/softwares/import-to-server", softwareUpload.none(), async (req, res, next) => {
  try {
    const task = startSoftwareImportTask({
      body: req.body
    });
    res.status(202).json({ ok: true, task });
  } catch (error) {
    next(error);
  }
});

router.post("/softwares/resolve-remote-meta", async (req, res, next) => {
  try {
    const result = await resolveRemoteSoftwareMeta({ sourceUrl: req.body && req.body.sourceUrl });
    res.json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

router.get("/softwares/import-tasks/:taskId", async (req, res, next) => {
  try {
    const task = getSoftwareImportTask(req.params.taskId);
    res.json({ ok: true, task });
  } catch (error) {
    next(error);
  }
});

router.post("/softwares/external-link", softwareUpload.none(), async (req, res, next) => {
  try {
    const software = await createSoftwareFromExternalLink({
      body: req.body
    });
    res.status(201).json({ ok: true, software });
  } catch (error) {
    next(error);
  }
});

router.get("/softwares", async (req, res, next) => {
  try {
    res.json({ ok: true, ...(await listSoftwares(req.query)) });
  } catch (error) {
    next(error);
  }
});

router.get("/softwares/:id", async (req, res, next) => {
  try {
    res.json({ ok: true, software: await getSoftware(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.put("/softwares/:id", async (req, res, next) => {
  try {
    res.json({ ok: true, software: await updateSoftware(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

router.delete("/softwares/:id", async (req, res, next) => {
  try {
    await deleteSoftware(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.patch("/softwares/:id/publish", async (req, res, next) => {
  try {
    res.json({ ok: true, software: await setSoftwarePublished(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

router.patch("/softwares/:id/category", async (req, res, next) => {
  try {
    res.json({ ok: true, software: await setSoftwareCategory(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

router.patch("/softwares/:id/sort", async (req, res, next) => {
  try {
    res.json({ ok: true, software: await setSoftwareSort(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
});

router.post("/softwares/:id/check-validity", async (req, res, next) => {
  try {
    res.json({ ok: true, software: await checkSoftwareValidity(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.get("/softwares/:id/download-test", async (req, res, next) => {
  try {
    res.json({ ok: true, result: await softwareDownloadTest(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.get("/adobe-accounts", async (req, res, next) => {
  try {
    res.json({ ok: true, ...(await listAdobeAccounts(req.query)) });
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
    res.json({ ok: true, ...(await listCustomers(req.query)) });
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
    res.json({ ok: true, ...(await listAssignments(req.query)) });
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
