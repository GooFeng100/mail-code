const crypto = require("crypto");
const { createSoftwareFromRemoteImport } = require("./softwareService");

const tasks = new Map();
const TASK_TTL_MS = 1000 * 60 * 60;

function nowIso() {
  return new Date().toISOString();
}

function createTaskRecord() {
  const taskId = crypto.randomUUID();
  const record = {
    taskId,
    status: "queued",
    message: "",
    softwareId: "",
    errorCode: "",
    errorMessage: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  tasks.set(taskId, record);
  return record;
}

function updateTask(taskId, patch) {
  const current = tasks.get(taskId);
  if (!current) return;
  tasks.set(taskId, {
    ...current,
    ...patch,
    updatedAt: nowIso(),
  });
}

function normalizeErrorCode(message = "") {
  const text = String(message || "").toLowerCase();
  if (text.includes("timeout") || text.includes("aborted")) return "download_timeout";
  if (text.includes("unsupported file extension")) return "unsupported_extension";
  if (text.includes("size")) return "file_too_large";
  if (text.includes("status")) return "remote_http_error";
  if (text.includes("url")) return "invalid_url";
  return "import_failed";
}

function pruneExpiredTasks() {
  const now = Date.now();
  for (const [taskId, item] of tasks.entries()) {
    const updated = new Date(item.updatedAt).getTime();
    if (Number.isFinite(updated) && now - updated > TASK_TTL_MS) {
      tasks.delete(taskId);
    }
  }
}

async function runImportTask(taskId, payload) {
  try {
    const software = await createSoftwareFromRemoteImport({
      ...payload,
      onStatus: (status, message = "") => {
        updateTask(taskId, { status, message });
      },
    });
    updateTask(taskId, {
      status: "success",
      message: "import completed",
      softwareId: software.id,
    });
  } catch (error) {
    updateTask(taskId, {
      status: "failed",
      message: "import failed",
      errorCode: normalizeErrorCode(error && error.message),
      errorMessage: String((error && error.message) || "import failed"),
    });
  } finally {
    pruneExpiredTasks();
  }
}

function startSoftwareImportTask(payload) {
  const task = createTaskRecord();
  runImportTask(task.taskId, payload).catch(() => {});
  return {
    taskId: task.taskId,
    status: task.status,
    createdAt: task.createdAt,
  };
}

function getSoftwareImportTask(taskId) {
  pruneExpiredTasks();
  const task = tasks.get(String(taskId || ""));
  if (!task) {
    const error = new Error("import task not found");
    error.status = 404;
    throw error;
  }
  return task;
}

module.exports = {
  startSoftwareImportTask,
  getSoftwareImportTask,
};

