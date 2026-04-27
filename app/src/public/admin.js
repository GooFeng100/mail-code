const tokenKey = "mailCodeToken";

const state = {
  config: {
    plans: [],
    adobeAccountStatuses: [],
    customerRenewalStatuses: [],
    renewalPlans: []
  },
  currentUser: null,
  adobeAccounts: [],
  customers: [],
  assignments: [],
  parameters: [],
  activeSection: "adobe",
  parameterCategoryFilter: "",
  adobePage: 1,
  adobePageSize: 10,
  assignmentCustomerOptions: [],
  assignmentAdobeOptions: [],
  selectedAdobeId: null,
  selectedAdobeDetail: null,
  selectedCustomerId: null,
  selectedCustomerDetail: null
};

const el = {
  adminPanel: document.getElementById("adminPanel"),
  adminInfo: document.getElementById("adminInfo"),
  adminMessage: document.getElementById("adminMessage"),
  adminPageTitle: document.getElementById("adminPageTitle"),
  adminPageHeader: document.querySelector(".admin-page-header"),
  adminPageEyebrow: document.getElementById("adminPageEyebrow"),
  adminPageHeading: document.getElementById("adminPageHeading"),
  adminPageDescription: document.getElementById("adminPageDescription"),
  logoutBtn: document.getElementById("logoutBtn"),
  adobeStatTotal: document.getElementById("adobeStatTotal"),
  adobeStatHint: document.getElementById("adobeStatHint"),
  adobeStatNormal: document.getElementById("adobeStatNormal"),
  adobeStatSoon: document.getElementById("adobeStatSoon"),
  adobeStatRisk: document.getElementById("adobeStatRisk"),
  customerStatTotal: document.getElementById("customerStatTotal"),
  customerStatHint: document.getElementById("customerStatHint"),
  customerStatNormal: document.getElementById("customerStatNormal"),
  customerStatSoon: document.getElementById("customerStatSoon"),
  assignmentStatTotal: document.getElementById("assignmentStatTotal"),
  assignmentStatHint: document.getElementById("assignmentStatHint"),
  parameterStatTotal: document.getElementById("parameterStatTotal"),
  parameterStatHint: document.getElementById("parameterStatHint"),
  modal: document.getElementById("adminModal"),
  modalPanel: document.getElementById("adminModalPanel"),
  modalTitle: document.getElementById("adminModalTitle"),
  modalBody: document.getElementById("adminModalBody"),
  modalClose: document.getElementById("adminModalClose"),
  modalStaging: document.getElementById("adminModalStaging"),
  confirmModal: document.getElementById("adminConfirmModal"),
  confirmText: document.getElementById("adminConfirmText"),
  confirmDetails: document.getElementById("adminConfirmDetails"),
  confirmHint: document.getElementById("adminConfirmHint"),
  confirmCancel: document.getElementById("adminConfirmCancel"),
  confirmOk: document.getElementById("adminConfirmOk"),
  confirmClose: document.getElementById("adminConfirmClose"),
  navButtons: Array.from(document.querySelectorAll(".admin-nav button")),
  parameterFilterButtons: Array.from(document.querySelectorAll("[data-parameter-filter]")),
  sections: {
    adobe: document.getElementById("adobeSection"),
    customers: document.getElementById("customersSection"),
    assignments: document.getElementById("assignmentsSection"),
    parameters: document.getElementById("parametersSection")
  },
  adobeForm: document.getElementById("adobeForm"),
  customerForm: document.getElementById("customerForm"),
  assignmentForm: document.getElementById("assignmentForm"),
  parameterForm: document.getElementById("parameterForm"),
  adobeFormCard: document.getElementById("adobeFormCard"),
  adobeRenewalFormCard: document.getElementById("adobeRenewalFormCard"),
  customerFormCard: document.getElementById("customerFormCard"),
  customerRenewalFormCard: document.getElementById("customerRenewalFormCard"),
  assignmentFormCard: document.getElementById("assignmentFormCard"),
  parameterFormCard: document.getElementById("parameterFormCard"),
  adobeBody: document.getElementById("adobeBody"),
  customersBody: document.getElementById("customersBody"),
  assignmentsBody: document.getElementById("assignmentsBody"),
  parametersBody: document.getElementById("parametersBody"),
  adobeSearchInput: document.getElementById("adobeSearchInput"),
  clearAdobeSearchBtn: document.getElementById("clearAdobeSearchBtn"),
  adobeToolbarSearchInput: null,
  adobePlanFilterSelect: document.getElementById("adobePlanFilterSelect"),
  adobeStatusFilterSelect: document.getElementById("adobeStatusFilterSelect"),
  adobeExpireFilterSelect: document.getElementById("adobeExpireFilterSelect"),
  adobeListView: document.getElementById("adobeListView"),
  backAdobeListBtn: document.getElementById("backAdobeListBtn"),
  exportAdobeBtn: document.getElementById("exportAdobeBtn"),
  adobePrevPageBtn: document.getElementById("adobePrevPageBtn"),
  adobeNextPageBtn: document.getElementById("adobeNextPageBtn"),
  adobePageSizeSelect: document.getElementById("adobePageSizeSelect"),
  adobePaginationInfo: document.getElementById("adobePaginationInfo"),
  adobePageInfo: document.getElementById("adobePageInfo"),
  customerSearchInput: document.getElementById("customerSearchInput"),
  clearCustomerSearchBtn: document.getElementById("clearCustomerSearchBtn"),
  customerPlanFilterSelect: document.getElementById("customerPlanFilterSelect"),
  customerExpireFilterSelect: document.getElementById("customerExpireFilterSelect"),
  assignmentSearchInput: document.getElementById("assignmentSearchInput"),
  parameterSearchInput: document.getElementById("parameterSearchInput"),
  customerListView: document.getElementById("customerListView"),
  adobePlanSelect: document.getElementById("adobePlanSelect"),
  adobeStatusSelect: document.getElementById("adobeStatusSelect"),
  verificationEmailDomainSelect: document.getElementById("verificationEmailDomainSelect"),
  customerPlanSelect: document.getElementById("customerPlanSelect"),
  customerRenewalStatusSelect: document.getElementById("customerRenewalStatusSelect"),
  adobeRenewalPlanSelect: document.getElementById("adobeRenewalPlanSelect"),
  adobeRenewalDaysPreview: document.getElementById("adobeRenewalDaysPreview"),
  adobeRenewalBeforePreview: document.getElementById("adobeRenewalBeforePreview"),
  adobeRenewalAfterPreview: document.getElementById("adobeRenewalAfterPreview"),
  customerRenewalPlanSelect: document.getElementById("customerRenewalPlanSelect"),
  customerRenewalDaysPreview: document.getElementById("customerRenewalDaysPreview"),
  customerRenewalBeforePreview: document.getElementById("customerRenewalBeforePreview"),
  customerRenewalAfterPreview: document.getElementById("customerRenewalAfterPreview"),
  assignmentCustomerSelect: document.getElementById("assignmentCustomerSelect"),
  assignmentAdobeSelect: document.getElementById("assignmentAdobeSelect"),
  assignmentCustomerInput: document.getElementById("assignmentCustomerInput"),
  assignmentAdobeInput: document.getElementById("assignmentAdobeInput"),
  assignmentCustomerOptions: document.getElementById("assignmentCustomerOptions"),
  assignmentAdobeOptions: document.getElementById("assignmentAdobeOptions"),
  assignmentCustomerMenu: document.getElementById("assignmentCustomerMenu"),
  assignmentAdobeMenu: document.getElementById("assignmentAdobeMenu"),
  adobeDetailCard: document.getElementById("adobeDetailCard"),
  adobeDetailSummary: document.getElementById("adobeDetailSummary"),
  copyAdobeDetailBtn: document.getElementById("copyAdobeDetailBtn"),
  adobeDetailCustomers: document.getElementById("adobeDetailCustomers"),
  addBindingFromAdobeBtn: document.getElementById("addBindingFromAdobeBtn"),
  adobeRenewalForm: document.getElementById("adobeRenewalForm"),
  adobeRenewalsBody: document.getElementById("adobeRenewalsBody"),
  customerDetailCard: document.getElementById("customerDetailCard"),
  customerDetailSummary: document.getElementById("customerDetailSummary"),
  customerDetailAdobeAccounts: document.getElementById("customerDetailAdobeAccounts"),
  addBindingFromCustomerBtn: document.getElementById("addBindingFromCustomerBtn"),
  customerMetricAccounts: document.getElementById("customerMetricAccounts"),
  customerMetricRenewals: document.getElementById("customerMetricRenewals"),
  customerMetricExpire: document.getElementById("customerMetricExpire"),
  backCustomerListBtn: document.getElementById("backCustomerListBtn"),
  customerRenewalForm: document.getElementById("customerRenewalForm"),
  customerRenewalsBody: document.getElementById("customerRenewalsBody"),
  parameterCategorySelect: document.getElementById("parameterCategorySelect")
};

let currentModalContent = null;
let confirmResolver = null;
let successFeedbackTimer = null;

function getToken() {
  return localStorage.getItem(tokenKey);
}

function clearSessionAndReturnHome() {
  localStorage.removeItem(tokenKey);
  window.location.href = "/";
}

function isAuthExpired(res, data) {
  return res.status === 401 && ["invalid token", "missing token"].includes(data.error);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayValue(value) {
  return value === undefined || value === null || value === "" ? "-" : value;
}

function setMessage(text, type = "") {
  if (type === "success") {
    el.adminMessage.textContent = "";
    el.adminMessage.className = "admin-message";
    showSuccessFeedback({ message: text || "已完成" });
    return;
  }

  el.adminMessage.textContent = text || "";
  el.adminMessage.className = `admin-message ${type}`.trim();
}

function showSuccessFeedback(options = {}) {
  const title = options.title || "操作成功";
  const message = options.message || "已完成";
  const duration = Number(options.duration || 2000);
  const root = document.getElementById("successToastRoot") || document.body;

  root.querySelectorAll(".success-feedback").forEach((item) => item.remove());
  window.clearTimeout(successFeedbackTimer);

  const toast = document.createElement("div");
  toast.className = "success-feedback";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `
    <div class="success-icon-wrap" aria-hidden="true">
      <div class="success-ring"></div>
      <div class="success-sparks">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
      </div>
      <div class="success-icon-core">
        <svg class="success-check" viewBox="0 0 52 40">
          <path d="M6 21.5L20.5 34L46 6"></path>
        </svg>
      </div>
    </div>
    <div class="success-copy">
      <p class="success-title"></p>
      <p class="success-message"></p>
    </div>
  `;

  toast.querySelector(".success-title").textContent = title;
  toast.querySelector(".success-message").textContent = message;
  root.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("is-enter");
  });

  successFeedbackTimer = window.setTimeout(() => {
    toast.classList.remove("is-enter");
    toast.classList.add("is-leave");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, duration);
}

function prepareModalCards() {
  [
    el.adobeFormCard,
    el.adobeRenewalFormCard,
    el.customerFormCard,
    el.customerRenewalFormCard,
    el.assignmentFormCard,
    el.parameterFormCard
  ].filter(Boolean).forEach((card) => {
    el.modalStaging.appendChild(card);
  });
}

function openModal(title, content, size = "") {
  if (currentModalContent && currentModalContent !== content) {
    el.modalStaging.appendChild(currentModalContent);
  }

  currentModalContent = content;
  if (el.modalTitle) {
    el.modalTitle.textContent = title;
  }
  el.modalPanel.className = `admin-modal-panel ${size}`.trim();
  el.modal.classList.toggle("adobe-form-open", content === el.adobeFormCard);
  content.classList.remove("hidden");
  el.modalBody.appendChild(content);
  el.modal.classList.remove("hidden");
  document.body.classList.add("admin-modal-open");
}

function closeModal() {
  if (currentModalContent) {
    currentModalContent.classList.add("hidden");
    el.modalStaging.appendChild(currentModalContent);
    currentModalContent = null;
  }
  el.modal.classList.remove("adobe-form-open");
  el.modal.classList.add("hidden");
  document.body.classList.remove("admin-modal-open");
}

function askConfirm(text, title = "确认操作", details = [], hint = "") {
  const isBindingUnbind = title.includes("取消绑定");
  const isBindingRestore = title.includes("恢复绑定");
  const isBindingAction = isBindingUnbind || isBindingRestore;
  const displayTitle = isBindingUnbind ? "解除绑定关系" : isBindingRestore ? "恢复绑定关系" : confirmTitleText(title);
  el.confirmModal.classList.toggle("binding-unbind-open", isBindingUnbind);
  el.confirmModal.classList.toggle("binding-restore-open", isBindingRestore);
  el.confirmModal.classList.toggle("binding-action-open", isBindingAction);
  el.confirmText.textContent = text;
  const confirmTitle = document.getElementById("adminConfirmTitle");
  if (confirmTitle) {
    confirmTitle.textContent = displayTitle;
  }
  if (el.confirmOk) {
    el.confirmOk.textContent = confirmOkText(title);
  }
  if (isBindingAction) {
    const findDetail = (label) => (details || []).find((item) => item.label === label)?.value || "";
    const [customerCode = "-", customerName = "-"] = String(findDetail("客户")).split("|").map((item) => item.trim());
    const [adobeCode = "-", accountEmail = "-"] = String(findDetail("Adobe账户")).split("|").map((item) => item.trim());
    const assignedAt = findDetail("绑定日期") || "-";
    const modeClass = isBindingRestore ? "binding-bridge-restore" : "binding-bridge-unbind";
    const noticeText = isBindingRestore
      ? "恢复后，该客户将重新显示在该 Adobe 账户下。"
      : "解除后，该客户将不再使用此 Adobe 账户。";
    el.confirmDetails.innerHTML = `
      <p class="binding-confirm-subtitle">${isBindingRestore ? "确认恢复当前客户与 Adobe 账户的绑定关系" : "确认解除当前客户与 Adobe 账户的绑定关系"}</p>
      <div class="binding-confirm-date"><span>绑定日期</span><strong>${escapeHtml(displayValue(assignedAt))}</strong></div>
      <div class="binding-confirm-layout">
        <section class="binding-confirm-card">
          <div>
            <h3>客户信息</h3>
            <p>客户编号：<strong>${escapeHtml(displayValue(customerCode))}</strong></p>
            <p>客户名称：<strong>${escapeHtml(displayValue(customerName))}</strong></p>
          </div>
        </section>
        <div class="binding-bridge ${modeClass}" aria-hidden="true"></div>
        <section class="binding-confirm-card">
          <div>
            <h3>账户信息</h3>
            <p>账户编号：<strong>${escapeHtml(displayValue(adobeCode))}</strong></p>
            <p>账户名称：<strong>${escapeHtml(displayValue(accountEmail))}</strong></p>
          </div>
        </section>
      </div>
      <div class="binding-warning-strip">${escapeHtml(noticeText)}</div>
    `;
  } else {
    el.confirmDetails.innerHTML = (details || []).map((item) => `
      <div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(displayValue(item.value))}</strong></div>
    `).join("");
  }
  el.confirmDetails.classList.toggle("hidden", !details || !details.length);
  el.confirmHint.textContent = hint || "";
  el.confirmHint.classList.toggle("hidden", !hint);
  el.confirmModal.classList.remove("hidden");
  document.body.classList.add("admin-modal-open");

  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function confirmTitleText(title) {
  if (title.startsWith("确认")) {
    return title;
  }
  if (title.includes("删除")) {
    return `确认${title}`;
  }
  if (title.includes("取消绑定")) {
    return "确认解绑";
  }
  if (title.includes("恢复绑定")) {
    return "确认恢复绑定";
  }
  return title;
}

function confirmOkText(title) {
  if (title.includes("删除")) {
    if (title.includes("续费记录")) {
      return "确认删除续费记录";
    }
    if (title.includes("客户")) {
      return "确认删除客户";
    }
    if (title.includes("参数")) {
      return "确认删除参数";
    }
    if (title.includes("绑定")) {
      return "确认删除绑定关系";
    }
    return "确认删除";
  }
  if (title.includes("取消绑定")) {
    return "确认解除绑定";
  }
  if (title.includes("恢复绑定")) {
    return "确认恢复绑定";
  }
  return "确认";
}

function resolveConfirm(value) {
  el.confirmModal.classList.add("hidden");
  el.confirmModal.classList.remove("binding-unbind-open");
  el.confirmModal.classList.remove("binding-restore-open");
  el.confirmModal.classList.remove("binding-action-open");
  if (el.modal.classList.contains("hidden")) {
    document.body.classList.remove("admin-modal-open");
  }
  if (confirmResolver) {
    confirmResolver(value);
    confirmResolver = null;
  }
}

function openAdobeCreateModal() {
  resetAdobeForm();
  openModal("新增 Adobe账户", el.adobeFormCard, "adobe-account");
}

function openAdobeEditModal(account) {
  fillAdobeForm(account);
  openModal("编辑 Adobe账户", el.adobeFormCard, "adobe-account");
}

function openAdobeRenewalModal() {
  if (!state.selectedAdobeId) {
    setMessage("请先选择 Adobe账户", "error");
    return;
  }

  el.adobeRenewalForm.reset();
  el.adobeRenewalForm.dataset.id = state.selectedAdobeId;
  updateAdobeRenewalPreview();
  openModal("新增续费记录", el.adobeRenewalFormCard, "renewal-modal account-renewal-modal");
}

function openCustomerCreateModal() {
  resetCustomerForm();
  const title = document.getElementById("customerModalTitle");
  if (title) {
    title.textContent = "新增客户";
  }
  openModal("新增客户", el.customerFormCard, "customer-modal");
}

function openCustomerEditModal(customer) {
  fillCustomerForm(customer);
  const title = document.getElementById("customerModalTitle");
  if (title) {
    title.textContent = "编辑客户";
  }
  openModal(`编辑客户 ${customer.customerCode || ""}`, el.customerFormCard, "customer-modal");
}

function openCustomerRenewalModal() {
  if (!state.selectedCustomerId) {
    setMessage("请先选择客户", "error");
    return;
  }

  el.customerRenewalForm.reset();
  el.customerRenewalForm.dataset.id = state.selectedCustomerId;
  updateCustomerRenewalPreview();
  openModal("新增续费记录", el.customerRenewalFormCard, "renewal-modal");
}

function assignmentOption(kind, id) {
  const options = kind === "customer" ? state.assignmentCustomerOptions : state.assignmentAdobeOptions;
  return options.find((item) => String(item.id) === String(id));
}

function prefillAssignmentCombobox(kind, id) {
  if (!id) {
    return;
  }
  const option = assignmentOption(kind, id);
  if (option) {
    selectAssignmentComboboxOption(kind, option.id, option.label);
  }
}

function openAssignmentCreateModal(prefill = {}) {
  el.assignmentForm.reset();
  populateAssignmentOptions();
  if (el.assignmentCustomerInput) {
    el.assignmentCustomerInput.value = "";
  }
  if (el.assignmentAdobeInput) {
    el.assignmentAdobeInput.value = "";
  }
  if (el.assignmentCustomerSelect) {
    el.assignmentCustomerSelect.value = "";
  }
  if (el.assignmentAdobeSelect) {
    el.assignmentAdobeSelect.value = "";
  }
  if (el.assignmentForm.elements.assignedAt) {
    el.assignmentForm.elements.assignedAt.value = dateInput(new Date());
  }
  if (el.assignmentForm.elements.assignmentRole) {
    el.assignmentForm.elements.assignmentRole.value = "backup";
  }
  if (el.assignmentForm.elements.assignmentRoleToggle) {
    el.assignmentForm.elements.assignmentRoleToggle.checked = false;
  }
  syncAssignmentRoleField();
  prefillAssignmentCombobox("customer", prefill.customerId);
  prefillAssignmentCombobox("adobe", prefill.adobeAccountId);
  openModal("新增绑定关系", el.assignmentFormCard, "binding-bind-modal");
}

function openParameterCreateModal() {
  resetParameterForm();
  openModal("新增参数", el.parameterFormCard, "settings-modal");
}

function openParameterEditModal(item) {
  fillParameterForm(item);
  openModal(`编辑参数 ${item.name || ""}`, el.parameterFormCard, "settings-modal");
}

function icon(name) {
  return `<img class="admin-action-icon" src="/assets/icons/admin/${name}.png" alt="" />`;
}

function renderStats() {
  const expiredAdobe = state.adobeAccounts.filter((account) => account.dynamicStatus === "已到期").length;
  const soonAdobe = state.adobeAccounts.filter((account) => {
    const days = adobeRemainingDays(account);
    return Number.isFinite(days) && days >= 0 && days <= 30;
  }).length;
  const riskAdobe = state.adobeAccounts.filter((account) => {
    const text = String(account.dynamicStatus || account.status || "");
    return text === "停用" || text === "异常" || account.enabled === false;
  }).length;
  const normalAdobe = state.adobeAccounts.filter((account) => adobeStatusText(account) === "正常" && account.enabled !== false).length;
  const expiredCustomers = state.customers.filter((customer) => customer.dynamicRenewalStatus === "已到期").length;
  const soonCustomers = state.customers.filter((customer) => {
    const days = Number(customer.remainingDays);
    return Number.isFinite(days) && days >= 0 && days <= 30;
  }).length;
  const normalCustomers = state.customers.filter((customer) => {
    return customerStatusText(customer) === "正常";
  }).length;
  const activeAssignments = state.assignments.filter((assignment) => assignment.active).length;
  const enabledParameters = state.parameters.filter((parameter) => parameter.enabled).length;

  if (el.adobeStatTotal) {
    el.adobeStatTotal.textContent = state.adobeAccounts.length;
    el.adobeStatHint.textContent = expiredAdobe ? `${expiredAdobe} 个已到期` : "状态良好";
  }
  if (el.adobeStatNormal) {
    el.adobeStatNormal.textContent = normalAdobe;
  }
  if (el.adobeStatSoon) {
    el.adobeStatSoon.textContent = soonAdobe;
  }
  if (el.adobeStatRisk) {
    el.adobeStatRisk.textContent = riskAdobe;
  }
  if (el.customerStatTotal) {
    el.customerStatTotal.textContent = state.customers.length;
    el.customerStatHint.textContent = expiredCustomers ? `${expiredCustomers} 个售后到期` : "售后正常";
  }
  if (el.customerStatNormal) {
    el.customerStatNormal.textContent = normalCustomers;
  }
  if (el.customerStatSoon) {
    el.customerStatSoon.textContent = soonCustomers;
  }
  if (el.assignmentStatTotal) {
    el.assignmentStatTotal.textContent = activeAssignments;
    el.assignmentStatHint.textContent = `${state.assignments.length} 条历史记录`;
  }
  if (el.parameterStatTotal) {
    el.parameterStatTotal.textContent = state.parameters.length;
    el.parameterStatHint.textContent = `${enabledParameters} 个启用中`;
  }
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isAuthExpired(res, data)) {
      localStorage.removeItem(tokenKey);
      alert("登录已过期，请重新登录后再操作。");
      window.location.href = "/";
      throw new Error("登录已过期，请重新登录后再操作。");
    }
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function dateInput(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function fillSelect(select, options, placeholder) {
  select.innerHTML = [
    placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : "",
    ...options.map((item) => {
      const value = typeof item === "string" ? item : item.name;
      const label = typeof item === "string" ? item : `${item.name}（${item.days}天）`;
      return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
    })
  ].join("");
}

function planDays(planName) {
  const plan = (state.config.plans || []).find((item) => {
    return (typeof item === "string" ? item : item.name) === planName;
  });

  if (!plan || typeof plan === "string") {
    return 0;
  }

  return Number(plan.days || 0);
}

function optionDays(options, optionName) {
  const option = (options || []).find((item) => (typeof item === "string" ? item : item.name) === optionName);
  return option && typeof option !== "string" ? Number(option.days || 0) : 0;
}

function planLabel(planName, fallbackDays = 0) {
  const name = String(planName || "");
  if (!name) {
    return "-";
  }

  const options = [
    ...(state.config.plans || []),
    ...(state.config.renewalPlans || [])
  ];
  const plan = options.find((item) => {
    return (typeof item === "string" ? item : item.name) === name;
  });
  const days = Number((plan && typeof plan !== "string" ? plan.days : fallbackDays) || 0);

  return days > 0 ? `${name}（${days}天）` : name;
}

function addDaysToDateInput(dateValue, days) {
  if (!dateValue || !days) {
    return "";
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) {
    return "";
  }

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + Number(days || 0));
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateInputFromAny(value) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return String(value);
  }

  return dateInput(value);
}

function addDaysToAnyDate(value, days) {
  const base = dateInputFromAny(value);
  return addDaysToDateInput(base, days);
}

function adobeRemainingDays(account) {
  if (account && account.remainingDays !== undefined && account.remainingDays !== null && account.remainingDays !== "") {
    const value = Number(account.remainingDays);
    return Number.isFinite(value) ? value : NaN;
  }

  const expireAt = account ? account.accountExpireAt : "";
  if (!expireAt) {
    return NaN;
  }

  const expire = new Date(expireAt);
  if (Number.isNaN(expire.getTime())) {
    return NaN;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expire.setHours(0, 0, 0, 0);
  return Math.ceil((expire.getTime() - today.getTime()) / 86400000);
}

function adobeRemainingText(account) {
  const days = adobeRemainingDays(account);
  if (!Number.isFinite(days)) {
    return displayValue(account ? account.remainingText : "");
  }
  return days < 0 ? `已过期 ${Math.abs(days)} 天` : `${days} 天`;
}

function adobeStatusKind(account) {
  const text = adobeStatusText(account);
  const remainingDays = adobeRemainingDays(account);
  if (text === "已到期") {
    return "danger";
  }
  if (Number.isFinite(remainingDays) && remainingDays > 0 && remainingDays <= 30) {
    return "warning";
  }
  if (text === "异常") {
    return "danger";
  }
  if (text === "停用") {
    return "muted";
  }
  return "success";
}

function adobeStatusText(account) {
  const days = adobeRemainingDays(account);
  if (Number.isFinite(days) && days < 0) {
    return "已到期";
  }
  return "正常";
}

function customerStatusKind(customer) {
  const text = customerStatusText(customer);
  const remainingDays = Number(customer.remainingDays);
  if (text === "已到期") {
    return "danger";
  }
  if (Number.isFinite(remainingDays) && remainingDays > 0 && remainingDays <= 30) {
    return "warning";
  }
  if (text === "异常") {
    return "danger";
  }
  if (text === "停用") {
    return "muted";
  }
  return "success";
}

function customerStatusText(customer) {
  const days = Number(customer ? customer.remainingDays : NaN);
  if (Number.isFinite(days) && days < 0) {
    return "已到期";
  }
  return "正常";
}

function updateAdobeRenewalPreview() {
  const account = state.selectedAdobeDetail ? state.selectedAdobeDetail.adobeAccount : null;
  const planName = formValue(el.adobeRenewalForm, "planName");
  const days = optionDays(state.config.renewalPlans, planName);
  const before = account ? dateInput(account.accountExpireAt) : "";
  const after = before && days ? addDaysToAnyDate(before, days) : "";

  el.adobeRenewalDaysPreview.value = days ? `${days} 天` : "";
  el.adobeRenewalBeforePreview.value = before || "-";
  el.adobeRenewalAfterPreview.value = after || "-";
}

function updateCustomerRenewalPreview() {
  const customer = state.selectedCustomerDetail ? state.selectedCustomerDetail.customer : null;
  const planName = formValue(el.customerRenewalForm, "planName");
  const days = optionDays(state.config.renewalPlans, planName);
  const before = customer ? dateInput(customer.afterSalesExpireAt) : "";
  const after = before && days ? addDaysToAnyDate(before, days) : "";

  el.customerRenewalDaysPreview.value = days ? `${days} 天` : "";
  el.customerRenewalBeforePreview.value = before || "-";
  el.customerRenewalAfterPreview.value = after || "-";
}

function selectedAdobeRenewalRecord(id) {
  const records = state.selectedAdobeDetail ? state.selectedAdobeDetail.renewalRecords : [];
  return (records || []).find((record) => record.id === id);
}

function selectedCustomerRenewalRecord(id) {
  const records = state.selectedCustomerDetail ? state.selectedCustomerDetail.renewalRecords : [];
  return (records || []).find((record) => record.id === id);
}

function syncAdobeExpireFromPlan() {
  const paidAt = formValue(el.adobeForm, "paidAt");
  const days = planDays(formValue(el.adobeForm, "accountPlan"));
  const nextExpireAt = addDaysToDateInput(paidAt, days);
  if (nextExpireAt) {
    el.adobeForm.elements.baseExpireAt.value = nextExpireAt;
  }
  syncAdobeStatusPreview();
}

function syncCustomerExpireFromPlan() {
  const firstPaidAt = formValue(el.customerForm, "firstPaidAt");
  const days = planDays(formValue(el.customerForm, "purchasedPlan"));
  const nextExpireAt = addDaysToDateInput(firstPaidAt, days);
  if (nextExpireAt) {
    el.customerForm.elements.baseAfterSalesExpireAt.value = nextExpireAt;
  }
  syncCustomerStatusPreview();
}

function statusFromExpireDate(value) {
  if (!value) {
    return "根据到期日自动计算";
  }
  const expire = new Date(value);
  if (Number.isNaN(expire.getTime())) {
    return "根据到期日自动计算";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expire.setHours(0, 0, 0, 0);
  const days = Math.ceil((expire.getTime() - today.getTime()) / 86400000);
  if (days < 0) {
    return "已到期";
  }
  return "正常";
}

function syncAdobeStatusPreview() {
  if (el.adobeStatusSelect) {
    el.adobeStatusSelect.value = statusFromExpireDate(formValue(el.adobeForm, "baseExpireAt"));
  }
}

function syncCustomerStatusPreview() {
  if (el.customerRenewalStatusSelect) {
    el.customerRenewalStatusSelect.value = statusFromExpireDate(formValue(el.customerForm, "baseAfterSalesExpireAt"));
  }
}

function statusChip(text, kind = "") {
  return `<span class="admin-chip ${kind}">${escapeHtml(displayValue(text))}</span>`;
}

function assignmentRoleLabel(value) {
  return value === "primary" ? "主要账号" : "备用账号";
}

function assignmentRoleChip(value, assignment = null) {
  const role = value === "primary" ? "primary" : "backup";
  const assignmentId = assignment ? assignment.assignmentId || assignment.id : "";
  const nextRole = role === "primary" ? "backup" : "primary";
  const disabled = !assignmentId || assignment?.active === false ? " disabled" : "";
  const actionAttrs = assignmentId
    ? ` data-action="set-assignment-role" data-id="${escapeHtml(assignmentId)}" data-role="${nextRole}"`
    : "";
  return `
    <span class="checkbox-wrapper-35 assignment-role-switch ${role}" aria-label="${assignmentRoleLabel(role)}">
      <button type="button" class="switch-button" aria-label="${assignmentRoleLabel(role)}"${actionAttrs}${disabled}>
        <span class="switch-shell"></span>
      </button>
      <span class="switch-label" aria-hidden="true">
        <span class="switch-x-toggletext">
          <span class="switch-x-unchecked"><span class="switch-x-hiddenlabel">Unchecked: </span>备用</span>
          <span class="switch-x-checked"><span class="switch-x-hiddenlabel">Checked: </span>主要</span>
        </span>
      </span>
    </span>
  `;
}

function isEnabledText(value) {
  return value ? statusChip("启用", "success") : statusChip("禁用", "muted");
}

function assignmentSummaryDetails(assignment) {
  return [
    { label: "客户", value: `${assignment.customerCode || "-"} | ${assignment.customerNickname || "-"}` },
    { label: "Adobe账户", value: `${assignment.adobeCode || "-"} | ${assignment.accountEmail || "-"}` },
    { label: "主备标识", value: assignmentRoleLabel(assignment.assignmentRole) },
    { label: "绑定日期", value: formatDate(assignment.assignedAt) },
    { label: "当前状态", value: assignment.active ? "有效" : "已取消" }
  ];
}

function emptyRow(colspan, text) {
  return `<tr><td colspan="${colspan}" class="admin-empty">${escapeHtml(text)}</td></tr>`;
}

function renewalAction(record) {
  if (record.initial) {
    return '<span class="admin-muted">基准记录</span>';
  }

  return `<button type="button" class="admin-small admin-danger" data-action="delete-renewal" data-id="${escapeHtml(record.id)}">${icon("delete")}删除</button>`;
}

function clearAdobeDetail() {
  state.selectedAdobeId = null;
  state.selectedAdobeDetail = null;
  el.adobeRenewalForm.dataset.id = "";
  el.adobeDetailCard.classList.add("hidden");
  if (el.adobeListView) {
    el.adobeListView.classList.remove("hidden");
  }
  el.adobeDetailSummary.innerHTML = "";
  el.adobeDetailCustomers.innerHTML = "";
  el.adobeRenewalsBody.innerHTML = "";
  setText("adobeMetricCustomers", "0");
  setText("adobeMetricRenewals", "0");
  setText("adobeMetricExpire", "-");
  setAdobeHeaderMode(false);
}

function clearCustomerDetail() {
  state.selectedCustomerId = null;
  state.selectedCustomerDetail = null;
  el.customerRenewalForm.dataset.id = "";
  el.customerDetailCard.classList.add("hidden");
  if (el.customerListView) {
    el.customerListView.classList.remove("hidden");
  }
  el.customerDetailSummary.innerHTML = "";
  el.customerDetailAdobeAccounts.innerHTML = "";
  el.customerRenewalsBody.innerHTML = "";
  setText("customerMetricAccounts", "0");
  setText("customerMetricRenewals", "0");
  setText("customerMetricExpire", "-");
}

function showCustomerListMode() {
  clearCustomerDetail();
}

function formValue(form, name) {
  return form.elements[name] ? form.elements[name].value : "";
}

function defaultMailDomain() {
  return (state.config.mailDomains || [])[0] || state.config.mailDomain || "";
}

function splitVerificationEmail(account = {}) {
  const existingLocal = String(account.verificationEmailLocal || "").trim();
  const existingDomain = String(account.verificationEmailDomain || "").trim();
  if (existingLocal || existingDomain) {
    return { local: existingLocal, domain: existingDomain || defaultMailDomain() };
  }

  const [local = "", domain = ""] = String(account.verificationEmail || "").trim().split("@");
  return { local, domain: domain || defaultMailDomain() };
}

function setVerificationEmailFields(account = {}) {
  const { local, domain } = splitVerificationEmail(account);
  if (el.adobeForm.elements.verificationEmailLocal) {
    el.adobeForm.elements.verificationEmailLocal.value = local;
  }
  if (el.adobeForm.elements.verificationEmailDomain) {
    el.adobeForm.elements.verificationEmailDomain.value = domain || defaultMailDomain();
  }
}

function verificationEmailValue() {
  const local = formValue(el.adobeForm, "verificationEmailLocal").trim().toLowerCase();
  const domain = formValue(el.adobeForm, "verificationEmailDomain").trim().toLowerCase();
  return local && domain ? `${local}@${domain}` : "";
}

function syncAssignmentRoleField() {
  const roleField = el.assignmentForm?.elements.assignmentRole;
  const roleToggle = el.assignmentForm?.elements.assignmentRoleToggle;
  if (!roleField || !roleToggle) {
    return;
  }
  roleField.value = roleToggle.checked ? "primary" : "backup";
}

function setText(id, value) {
  const target = document.getElementById(id);
  if (target) {
    target.textContent = displayValue(value);
  }
}

function syncSearchClearButtons() {
  if (el.clearAdobeSearchBtn && el.adobeSearchInput) {
    el.clearAdobeSearchBtn.disabled = !el.adobeSearchInput.value;
  }
  if (el.clearCustomerSearchBtn && el.customerSearchInput) {
    el.clearCustomerSearchBtn.disabled = !el.customerSearchInput.value;
  }
}

function setAdobeHeaderMode(isDetail) {
  if (state.activeSection !== "adobe") {
    return;
  }
  if (el.adminPageHeader) {
    el.adminPageHeader.classList.toggle("hidden", isDetail);
  }
  if (el.adminPageEyebrow) {
    el.adminPageEyebrow.textContent = "Adobe Accounts";
  }
  if (el.adminPageHeading) {
    el.adminPageHeading.textContent = isDetail ? "Adobe账户" : sectionMeta.adobe.heading;
  }
  if (el.adminPageDescription) {
    el.adminPageDescription.textContent = isDetail
      ? "选择一个账户查看详情、当前使用客户和续费记录。"
      : sectionMeta.adobe.description;
  }
}

function showAdobeDetailMode() {
  if (el.adobeListView) {
    el.adobeListView.classList.add("hidden");
  }
  el.adobeDetailCard.classList.remove("hidden");
  setAdobeHeaderMode(true);
}

function showAdobeListMode() {
  if (el.adobeListView) {
    el.adobeListView.classList.remove("hidden");
  }
  el.adobeDetailCard.classList.add("hidden");
  setAdobeHeaderMode(false);
}

const sectionMeta = {
  adobe: {
    crumbRoot: "Adobe账户",
    crumbLeaf: "账户列表",
    eyebrow: "Adobe Accounts",
    heading: "Adobe账户管理",
    description: "集中维护账号、验证码接收邮箱、付费日期、到期状态与续费记录。"
  },
  customers: {
    crumbRoot: "客户管理",
    crumbLeaf: "客户列表",
    eyebrow: "Customers",
    heading: "客户管理",
    description: "集中维护客户资料、购买计划、售后到期日与续费状态。"
  },
  assignments: {
    crumbRoot: "绑定关系",
    crumbLeaf: "绑定列表",
    eyebrow: "Assignments",
    heading: "绑定关系",
    description: "管理客户与 Adobe账户之间的绑定和使用关系。"
  },
  parameters: {
    crumbRoot: "参数设置",
    crumbLeaf: "参数列表",
    eyebrow: "Parameters",
    heading: "参数设置",
    description: "在线维护账户计划、客户计划与状态参数。"
  }
};

function switchSection(section) {
  const titles = {
    adobe: "Adobe账户",
    customers: "客户管理",
    assignments: "绑定关系",
    parameters: "参数设置"
  };
  if (el.adminPageTitle) {
    el.adminPageTitle.textContent = titles[section] || titles.adobe;
  }
  if (el.adminPageHeader) {
    el.adminPageHeader.classList.remove("hidden");
  }
  state.activeSection = section;
  const meta = sectionMeta[section] || sectionMeta.adobe;
  if (el.adminPageEyebrow) {
    el.adminPageEyebrow.textContent = meta.eyebrow;
  }
  if (el.adminPageHeading) {
    el.adminPageHeading.textContent = meta.heading;
  }
  if (el.adminPageDescription) {
    el.adminPageDescription.textContent = meta.description;
  }
  if (section === "adobe" && el.adobeDetailCard && !el.adobeDetailCard.classList.contains("hidden")) {
    setAdobeHeaderMode(true);
  }
  el.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.section === section));
  Object.entries(el.sections).forEach(([key, sectionEl]) => {
    sectionEl.classList.toggle("active", key === section);
  });
}

function populateConfigOptions() {
  fillSelect(el.adobePlanSelect, state.config.plans);
  if (el.verificationEmailDomainSelect) {
    fillSelect(el.verificationEmailDomainSelect, state.config.mailDomains || [state.config.mailDomain].filter(Boolean));
  }
  fillSelect(el.customerPlanSelect, state.config.plans);
  if (el.adobeStatusSelect?.tagName === "SELECT") {
    fillSelect(el.adobeStatusSelect, state.config.adobeAccountStatuses);
  }
  if (el.customerRenewalStatusSelect?.tagName === "SELECT") {
    fillSelect(el.customerRenewalStatusSelect, state.config.customerRenewalStatuses);
  }
  fillSelect(el.adobeRenewalPlanSelect, state.config.renewalPlans);
  fillSelect(el.customerRenewalPlanSelect, state.config.renewalPlans);
  if (el.customerPlanFilterSelect) {
    fillSelect(el.customerPlanFilterSelect, state.config.plans, "全部购买计划");
  }
  if (el.adobePlanFilterSelect) {
    fillSelect(el.adobePlanFilterSelect, state.config.plans, "全部账户计划");
  }
  if (el.adobeStatusFilterSelect) {
    fillSelect(el.adobeStatusFilterSelect, state.config.adobeAccountStatuses, "全部状态");
  }
}

function populateAssignmentOptions() {
  const customerOptions = state.customers.map((customer) => {
    const label = `${customer.customerCode || "-"} - ${customer.customerNickname || "-"}`;
    return { id: customer.id, label };
  });
  const adobeOptions = state.adobeAccounts.map((account) => {
    const label = `${account.adobeCode || "-"} - ${account.accountEmail || "-"}`;
    return { id: account.id, label };
  });
  state.assignmentCustomerOptions = customerOptions;
  state.assignmentAdobeOptions = adobeOptions;

  el.assignmentCustomerSelect.innerHTML = [
    '<option value="">请选择客户</option>',
    ...customerOptions.map((item) => `<option value="${escapeHtml(item.id)}" data-label="${escapeHtml(item.label)}">${escapeHtml(item.label)}</option>`)
  ].join("");
  el.assignmentAdobeSelect.innerHTML = [
    '<option value="">请选择 Adobe 账户</option>',
    ...adobeOptions.map((item) => `<option value="${escapeHtml(item.id)}" data-label="${escapeHtml(item.label)}">${escapeHtml(item.label)}</option>`)
  ].join("");

  if (el.assignmentCustomerOptions) {
    el.assignmentCustomerOptions.innerHTML = customerOptions.length
      ? customerOptions.map((item) => `<option value="${escapeHtml(item.label)}"></option>`).join("")
      : '<option value="暂无客户"></option>';
  }
  if (el.assignmentAdobeOptions) {
    el.assignmentAdobeOptions.innerHTML = adobeOptions.length
      ? adobeOptions.map((item) => `<option value="${escapeHtml(item.label)}"></option>`).join("")
      : '<option value="暂无 Adobe账户"></option>';
  }
  renderAssignmentComboboxMenu("customer");
  renderAssignmentComboboxMenu("adobe");
}

function assignmentComboboxConfig(kind) {
  return kind === "customer"
    ? {
        input: el.assignmentCustomerInput,
        select: el.assignmentCustomerSelect,
        menu: el.assignmentCustomerMenu,
        options: state.assignmentCustomerOptions,
        emptyText: "暂无匹配客户"
      }
    : {
        input: el.assignmentAdobeInput,
        select: el.assignmentAdobeSelect,
        menu: el.assignmentAdobeMenu,
        options: state.assignmentAdobeOptions,
        emptyText: "暂无匹配 Adobe账户"
      };
}

function filteredAssignmentOptions(kind) {
  const config = assignmentComboboxConfig(kind);
  const keyword = String(config.input?.value || "").trim().toLowerCase();
  return keyword
    ? config.options.filter((item) => item.label.toLowerCase().includes(keyword))
    : config.options;
}

function renderAssignmentComboboxMenu(kind) {
  const config = assignmentComboboxConfig(kind);
  if (!config.menu) {
    return;
  }
  const rows = filteredAssignmentOptions(kind);
  config.menu.innerHTML = rows.length
    ? rows.map((item) => `<button type="button" role="option" data-id="${escapeHtml(item.id)}" data-label="${escapeHtml(item.label)}">${escapeHtml(item.label)}</button>`).join("")
    : `<span class="binding-combobox-empty">${escapeHtml(config.emptyText)}</span>`;
}

function openAssignmentComboboxMenu(kind) {
  const config = assignmentComboboxConfig(kind);
  renderAssignmentComboboxMenu(kind);
  config.menu?.classList.add("open");
}

function closeAssignmentComboboxMenus() {
  el.assignmentCustomerMenu?.classList.remove("open");
  el.assignmentAdobeMenu?.classList.remove("open");
}

function selectAssignmentComboboxOption(kind, id, label) {
  const config = assignmentComboboxConfig(kind);
  if (!config.input || !config.select) {
    return;
  }
  config.input.value = label || "";
  config.select.value = id || "";
  closeAssignmentComboboxMenus();
}

function clearAssignmentCombobox(kind) {
  const config = assignmentComboboxConfig(kind);
  if (config.input) {
    config.input.value = "";
  }
  if (config.select) {
    config.select.value = "";
  }
  renderAssignmentComboboxMenu(kind);
  config.input?.focus();
}

function syncAssignmentCombobox(input, select) {
  if (!input || !select) {
    return "";
  }
  const value = String(input.value || "").trim();
  const matched = Array.from(select.options).find((option) => {
    return option.dataset.label === value || option.textContent.trim() === value;
  });
  select.value = matched ? matched.value : "";
  return select.value;
}

function bindAssignmentCombobox(kind) {
  const config = assignmentComboboxConfig(kind);
  if (!config.input || !config.select) {
    return;
  }
  config.input.addEventListener("focus", () => openAssignmentComboboxMenu(kind));
  config.input.addEventListener("input", () => {
    syncAssignmentCombobox(config.input, config.select);
    openAssignmentComboboxMenu(kind);
  });
  config.input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAssignmentComboboxMenus();
    }
  });
  config.menu?.addEventListener("mousedown", (event) => {
    event.preventDefault();
    const option = event.target.closest("button[data-id]");
    if (option) {
      selectAssignmentComboboxOption(kind, option.dataset.id, option.dataset.label);
    }
  });
}

function parameterCategoryLabel(category) {
  const labels = state.config.parameterCategories || {
    plan: "账户计划",
    adobeAccountStatus: "Adobe账户状态",
    customerStatus: "客户状态"
  };
  return labels[category] || category;
}

function parameterSummaryDetails(item) {
  return [
    { label: "参数分类", value: parameterCategoryLabel(item.category) },
    { label: "参数名称", value: item.name },
    { label: "使用天数", value: item.category === "plan" ? Number(item.days || 0) : "-" },
    { label: "启用状态", value: item.enabled ? "启用" : "停用" }
  ];
}

function renderParameters() {
  const keyword = String(el.parameterSearchInput.value || "").trim().toLowerCase();
  const rows = state.parameters.filter((item) => {
    const searchable = `${parameterCategoryLabel(item.category)} ${item.name} ${item.remark}`.toLowerCase();
    const matchesKeyword = !keyword || searchable.includes(keyword);
    const matchesCategory = !state.parameterCategoryFilter || item.category === state.parameterCategoryFilter;
    return matchesKeyword && matchesCategory;
  });

  if (!rows.length) {
    el.parametersBody.innerHTML = emptyRow(8, "暂无参数");
    return;
  }

  el.parametersBody.innerHTML = rows.map((item) => `
    <tr>
      <td>${escapeHtml(parameterCategoryLabel(item.category))}</td>
      <td>${escapeHtml(displayValue(item.name))}</td>
      <td>${item.category === "plan" ? Number(item.days || 0) : "-"}</td>
      <td>${isEnabledText(item.enabled)}</td>
      <td>${Number(item.sortOrder || 0)}</td>
      <td>${escapeHtml(displayValue(item.remark))}</td>
      <td>${formatDate(item.updatedAt || item.createdAt)}</td>
      <td class="admin-actions-cell">
        <button type="button" class="admin-small admin-secondary" data-action="edit" data-id="${escapeHtml(item.id)}">${icon("edit")}编辑</button>
        <button type="button" class="admin-small admin-danger" data-action="delete" data-id="${escapeHtml(item.id)}">${icon("delete")}删除</button>
      </td>
    </tr>
  `).join("");
}

function filteredAdobeAccounts() {
  const keyword = String(el.adobeSearchInput ? el.adobeSearchInput.value : "").trim().toLowerCase();
  const toolbarKeyword = String(el.adobeToolbarSearchInput ? el.adobeToolbarSearchInput.value : "").trim().toLowerCase();
  const plan = el.adobePlanFilterSelect ? el.adobePlanFilterSelect.value : "";
  const status = el.adobeStatusFilterSelect ? el.adobeStatusFilterSelect.value : "";
  const expire = el.adobeExpireFilterSelect ? el.adobeExpireFilterSelect.value : "";
  const searchText = [keyword, toolbarKeyword].filter(Boolean).join(" ");

  return state.adobeAccounts.filter((account) => {
    const days = adobeRemainingDays(account);
    const accountStatus = adobeStatusText(account);
    const searchable = `${account.adobeCode} ${account.accountEmail} ${account.verificationEmail} ${account.accountPlan} ${account.remark}`.toLowerCase();
    const matchesKeyword = !searchText || searchText.split(/\s+/).every((word) => searchable.includes(word));
    const matchesPlan = !plan || account.accountPlan === plan;
    const matchesStatus = !status || accountStatus === status;
    const matchesExpire = !expire
      || (expire === "soon" && Number.isFinite(days) && days >= 0 && days <= 30)
      || (expire === "expired" && Number.isFinite(days) && days < 0)
      || (expire === "valid" && Number.isFinite(days) && days >= 0);
    return matchesKeyword && matchesPlan && matchesStatus && matchesExpire;
  });
}

function renderAdobeAccounts() {
  const rows = filteredAdobeAccounts();
  const totalPages = Math.max(1, Math.ceil(rows.length / state.adobePageSize));
  state.adobePage = Math.min(Math.max(1, state.adobePage), totalPages);
  const start = (state.adobePage - 1) * state.adobePageSize;
  const pageRows = rows.slice(start, start + state.adobePageSize);

  if (!pageRows.length) {
    el.adobeBody.innerHTML = emptyRow(10, "暂无 Adobe账户");
    renderAdobePagination(rows.length, totalPages);
    return;
  }

  el.adobeBody.innerHTML = pageRows.map((account) => `
    <tr>
      <td>${escapeHtml(displayValue(account.adobeCode))}</td>
      <td class="admin-ellipsis" title="${escapeHtml(displayValue(account.accountEmail))}">${escapeHtml(displayValue(account.accountEmail))}</td>
      <td class="admin-ellipsis" title="${escapeHtml(displayValue(account.verificationEmail))}">${escapeHtml(displayValue(account.verificationEmail))}</td>
      <td>${escapeHtml(planLabel(account.accountPlan))}</td>
      <td>${formatDate(account.paidAt)}</td>
      <td>${formatDate(account.accountExpireAt)}</td>
      <td>${escapeHtml(adobeRemainingText(account))}</td>
      <td>${statusChip(adobeStatusText(account), adobeStatusKind(account))}</td>
      <td>${isEnabledText(account.enabled)}</td>
      <td class="admin-actions-cell">
        <button type="button" class="admin-small" data-action="view" data-id="${escapeHtml(account.id)}">${icon("view")}查看</button>
        <button type="button" class="admin-small admin-secondary" data-action="edit" data-id="${escapeHtml(account.id)}">${icon("edit")}编辑</button>
        <button type="button" class="admin-small admin-danger" data-action="delete" data-id="${escapeHtml(account.id)}">${icon("delete")}删除</button>
      </td>
    </tr>
  `).join("");
  renderAdobePagination(rows.length, totalPages);
}

function renderAdobePagination(total, totalPages) {
  if (el.adobePaginationInfo) {
    el.adobePaginationInfo.textContent = `共 ${total} 条`;
  }
  if (el.adobePageInfo) {
    el.adobePageInfo.textContent = `${state.adobePage} / ${totalPages}`;
  }
  if (el.adobePrevPageBtn) {
    el.adobePrevPageBtn.disabled = state.adobePage <= 1;
  }
  if (el.adobeNextPageBtn) {
    el.adobeNextPageBtn.disabled = state.adobePage >= totalPages;
  }
  if (el.adobePageSizeSelect) {
    el.adobePageSizeSelect.value = String(state.adobePageSize);
  }
}

function renderCustomers() {
  const keyword = String(el.customerSearchInput.value || "").trim().toLowerCase();
  const plan = String(el.customerPlanFilterSelect?.value || "");
  const expireFilter = String(el.customerExpireFilterSelect?.value || "");
  const rows = state.customers.filter((customer) => {
    const days = Number(customer.remainingDays);
    const searchable = `${customer.customerCode} ${customer.customerNickname} ${customer.customerContact} ${customer.customerContactEmail} ${customer.purchasedPlan} ${customer.remark}`.toLowerCase();
    const matchesKeyword = !keyword || keyword.split(/\s+/).every((word) => searchable.includes(word));
    const matchesPlan = !plan || customer.purchasedPlan === plan;
    const matchesExpire = !expireFilter
      || (expireFilter === "soon" && Number.isFinite(days) && days >= 0 && days <= 30)
      || (expireFilter === "expired" && Number.isFinite(days) && days < 0)
      || (expireFilter === "valid" && Number.isFinite(days) && days >= 0);
    return matchesKeyword && matchesPlan && matchesExpire;
  });

  if (!rows.length) {
    el.customersBody.innerHTML = emptyRow(10, "暂无客户");
    return;
  }

  el.customersBody.innerHTML = rows.map((customer) => `
    <tr>
      <td>${escapeHtml(displayValue(customer.customerCode))}</td>
      <td>${escapeHtml(displayValue(customer.customerNickname))}</td>
      <td>${escapeHtml(displayValue(customer.customerContact))}</td>
      <td>${escapeHtml(planLabel(customer.purchasedPlan))}</td>
      <td>${formatDate(customer.afterSalesExpireAt)}</td>
      <td>${escapeHtml(displayValue(customer.remainingText))}</td>
      <td>${statusChip(customer.dynamicRenewalStatus || customer.renewalStatus, customerStatusKind(customer))}</td>
      <td>${customer.assignmentCount || 0}</td>
      <td class="admin-ellipsis" title="${escapeHtml(displayValue(customer.remark))}">${escapeHtml(displayValue(customer.remark))}</td>
      <td class="admin-actions-cell">
        <button type="button" class="admin-small" data-action="view" data-id="${escapeHtml(customer.id)}">${icon("view")}查看</button>
        <button type="button" class="admin-small admin-secondary" data-action="edit" data-id="${escapeHtml(customer.id)}">${icon("edit")}编辑</button>
        <button type="button" class="admin-small admin-danger" data-action="delete" data-id="${escapeHtml(customer.id)}">${icon("delete")}删除</button>
      </td>
    </tr>
  `).join("");
}

function renderAssignments() {
  const keyword = String(el.assignmentSearchInput.value || "").trim().toLowerCase();
  const rows = state.assignments.filter((assignment) => {
    const searchable = `${assignment.customerCode} ${assignment.customerNickname} ${assignment.adobeCode} ${assignment.accountEmail}`.toLowerCase();
    return !keyword || searchable.includes(keyword);
  });

  if (!rows.length) {
    el.assignmentsBody.innerHTML = emptyRow(8, "暂无绑定关系");
    return;
  }

  el.assignmentsBody.innerHTML = rows.map((assignment) => {
    const targetMissing = assignment.customerExists === false || assignment.adobeAccountExists === false;
    const status = assignment.active
      ? statusChip("有效", "success")
      : statusChip(targetMissing ? "已取消（对象已删除）" : "已取消", "muted");
    const restoreAction = assignment.active
      ? ""
      : assignment.canRestore
        ? `<button type="button" class="admin-small" data-action="restore" data-id="${escapeHtml(assignment.id)}">${icon("restore")}恢复</button>`
        : '<span class="admin-muted">无法恢复</span>';
    const cancelAction = assignment.active
      ? `<button type="button" class="admin-small admin-danger" data-action="cancel" data-id="${escapeHtml(assignment.id)}">${icon("cancel")}解绑</button>`
      : "";
    const deleteAction = assignment.active
      ? `<button type="button" class="admin-small admin-secondary" disabled title="绑定状态不能删除，请先解绑">${icon("delete")}删除</button>`
      : `<button type="button" class="admin-small admin-danger" data-action="delete" data-id="${escapeHtml(assignment.id)}">${icon("delete")}删除</button>`;
    const action = [cancelAction, restoreAction, deleteAction].filter(Boolean).join("");

    return `
      <tr>
        <td>${escapeHtml(displayValue(assignment.customerCode))}</td>
        <td>${escapeHtml(displayValue(assignment.customerNickname))}</td>
        <td>${escapeHtml(displayValue(assignment.adobeCode))}</td>
        <td>${escapeHtml(displayValue(assignment.accountEmail))}</td>
        <td>${assignmentRoleChip(assignment.assignmentRole, assignment)}</td>
        <td>${formatDate(assignment.assignedAt)}</td>
        <td>${status}</td>
        <td class="admin-actions-cell">${action}</td>
      </tr>
    `;
  }).join("");
}

function resetAdobeForm() {
  el.adobeForm.reset();
  el.adobeForm.elements.id.value = "";
  el.adobeForm.elements.adobeCode.value = "";
  el.adobeForm.elements.enabled.checked = true;
  setVerificationEmailFields();
  syncAdobeStatusPreview();
}

function resetCustomerForm() {
  el.customerForm.reset();
  el.customerForm.elements.id.value = "";
  syncCustomerStatusPreview();
  updateCustomerRemarkCount();
}

function resetParameterForm() {
  el.parameterForm.reset();
  el.parameterForm.elements.id.value = "";
  el.parameterForm.elements.enabled.checked = true;
  syncParameterDaysState();
}

function fillAdobeForm(account) {
  el.adobeForm.elements.id.value = account.id;
  el.adobeForm.elements.adobeCode.value = account.adobeCode || "";
  el.adobeForm.elements.accountEmail.value = account.accountEmail || "";
  el.adobeForm.elements.adobePassword.value = account.adobePassword || "";
  el.adobeForm.elements.accountEmailPassword.value = account.accountEmailPassword || "";
  setVerificationEmailFields(account);
  el.adobeForm.elements.accountPlan.value = account.accountPlan || "";
  el.adobeForm.elements.paidAt.value = dateInput(account.paidAt);
  el.adobeForm.elements.baseExpireAt.value = dateInput(account.baseExpireAt);
  if (el.adobeStatusSelect) {
    el.adobeStatusSelect.value = adobeStatusText(account);
  }
  el.adobeForm.elements.enabled.checked = Boolean(account.enabled);
  el.adobeForm.elements.remark.value = account.remark || "";
}

function fillCustomerForm(customer) {
  el.customerForm.elements.id.value = customer.id;
  el.customerForm.elements.customerCode.value = customer.customerCode || "";
  el.customerForm.elements.customerNickname.value = customer.customerNickname || "";
  el.customerForm.elements.customerContact.value = customer.customerContact || "";
  el.customerForm.elements.customerContactEmail.value = customer.customerContactEmail || "";
  el.customerForm.elements.purchasedPlan.value = customer.purchasedPlan || "";
  el.customerForm.elements.firstPaidAt.value = dateInput(customer.firstPaidAt);
  el.customerForm.elements.baseAfterSalesExpireAt.value = dateInput(customer.baseAfterSalesExpireAt);
  if (el.customerRenewalStatusSelect) {
    el.customerRenewalStatusSelect.value = customerStatusText(customer);
  }
  el.customerForm.elements.remark.value = customer.remark || "";
  updateCustomerRemarkCount();
}

function updateCustomerRemarkCount() {
  const counter = document.getElementById("customerRemarkCount");
  if (!counter || !el.customerForm?.elements?.remark) {
    return;
  }
  counter.textContent = `${el.customerForm.elements.remark.value.length}/200`;
}

function detailItem(label, value, kind = "") {
  return `<div class="admin-detail-item ${kind}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(displayValue(value))}</strong></div>`;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function adobeDetailCopyText(account) {
  const verificationCodeUrl = state.config.verificationCodeUrl || "mail.889100.com";
  return [
    `Adobe账户邮箱：${account.accountEmail || ""}`,
    `Adobe密码：${account.adobePassword || ""}`,
    `验证码接收网址：${verificationCodeUrl}`
  ].join("\n");
}

function renderAdobeDetail(data) {
  const account = data.adobeAccount;
  const customers = data.customers || [];
  state.selectedAdobeId = account.id;
  state.selectedAdobeDetail = data;
  showAdobeDetailMode();
  el.adobeRenewalForm.dataset.id = account.id;
  el.adobeDetailSummary.innerHTML = [
    detailItem("Adobe账户", account.adobeCode, "primary"),
    detailItem("账户计划", planLabel(account.accountPlan)),
    detailItem("Adobe账户邮箱", account.accountEmail),
    detailItem("付费日期", formatDate(account.paidAt)),
    detailItem("Adobe密码", account.adobePassword),
    detailItem("Adobe账户到期日", formatDate(account.accountExpireAt)),
    detailItem("Adobe账户邮箱密码", account.accountEmailPassword),
    detailItem("剩余天数", data.remainingText, adobeStatusKind(account)),
    detailItem("验证码接收邮箱", account.verificationEmail),
    detailItem("状态", adobeStatusText(account), adobeStatusKind(account)),
    detailItem("启用状态", account.enabled ? "启用" : "禁用"),
    detailItem("备注", account.remark, "wide")
  ].join("");
  setText("adobeMetricCustomers", customers.length);
  setText("adobeMetricRenewals", (data.renewalRecords || []).length);
  setText("adobeMetricExpire", data.remainingText || account.dynamicStatus || account.status || "-");

  el.adobeDetailCustomers.innerHTML = customers.length
    ? customers.map((customer) => `
      <tr>
        <td>${escapeHtml(displayValue(customer.customerCode))}</td>
        <td>${escapeHtml(displayValue(customer.customerNickname))}</td>
        <td>${escapeHtml(displayValue(customer.customerContact))}</td>
        <td>${escapeHtml(planLabel(customer.purchasedPlan))}</td>
        <td>${formatDate(customer.afterSalesExpireAt)}</td>
        <td>${escapeHtml(displayValue(customer.remainingText))}</td>
        <td>${statusChip(customerStatusText(customer), customerStatusKind(customer))}</td>
        <td class="admin-actions-cell">
          <button type="button" class="admin-small" data-action="view-customer-detail" data-id="${escapeHtml(customer.id)}">${icon("view")}查看</button>
        </td>
      </tr>
    `).join("")
    : emptyRow(8, "当前没有绑定客户");
  renderAdobeRenewals(data.renewalRecords);
}

function renderAdobeRenewals(records) {
  const rows = records || [];
  el.adobeRenewalsBody.innerHTML = rows.length
    ? rows.map((record) => `
      <tr>
        <td>${formatDate(record.renewalDate)}</td>
        <td>${escapeHtml(planLabel(record.planName, record.planDays))}</td>
        <td>${escapeHtml(displayValue(record.planDays))}</td>
        <td>${formatDate(record.beforeExpireAt)}</td>
        <td>${formatDate(record.afterExpireAt)}</td>
        <td>${escapeHtml(displayValue(record.remark))}</td>
        <td class="admin-actions-cell">${renewalAction(record)}</td>
      </tr>
    `).join("")
    : emptyRow(7, "暂无续费记录");
}

function renderCustomerDetail(data) {
  const customer = data.customer;
  const adobeAccounts = data.adobeAccounts || [];
  state.selectedCustomerId = customer.id;
  state.selectedCustomerDetail = data;
  el.customerDetailCard.classList.remove("hidden");
  if (el.customerListView) {
    el.customerListView.classList.add("hidden");
  }
  el.customerRenewalForm.dataset.id = customer.id;
  el.customerDetailSummary.innerHTML = [
    detailItem("客户编号", customer.customerCode, "primary"),
    detailItem("客户昵称", customer.customerNickname),
    detailItem("联系方式", customer.customerContact),
    detailItem("联系邮箱", customer.customerContactEmail),
    detailItem("购买计划", planLabel(customer.purchasedPlan)),
    detailItem("续费状态", customerStatusText(customer), customerStatusKind(customer)),
    detailItem("售后到期日", formatDate(customer.afterSalesExpireAt)),
    detailItem("剩余天数", data.remainingText, customerStatusKind(customer)),
    detailItem("备注", customer.remark, "wide")
  ].join("");
  setText("customerMetricAccounts", adobeAccounts.length);
  setText("customerMetricRenewals", (data.renewalRecords || []).length);
  setText("customerMetricExpire", data.remainingText || customer.dynamicRenewalStatus || customer.renewalStatus || "-");

  el.customerDetailAdobeAccounts.innerHTML = adobeAccounts.length
    ? adobeAccounts.map((account) => `
      <tr>
        <td>${escapeHtml(displayValue(account.adobeCode))}</td>
        <td>${escapeHtml(displayValue(account.accountEmail))}</td>
        <td>${assignmentRoleChip(account.assignmentRole, account)}</td>
        <td>${escapeHtml(planLabel(account.accountPlan))}</td>
        <td>${formatDate(account.accountExpireAt)}</td>
        <td>${escapeHtml(displayValue(account.remainingText))}</td>
        <td>${statusChip(adobeStatusText(account), adobeStatusKind(account))}</td>
        <td class="admin-actions-cell">
          <button type="button" class="admin-small" data-action="view-adobe-detail" data-id="${escapeHtml(account.id)}">${icon("view")}查看</button>
        </td>
      </tr>
    `).join("")
    : emptyRow(8, "当前没有使用中的 Adobe账户");
  renderCustomerRenewals(data.renewalRecords);
}

function renderCustomerRenewals(records) {
  const rows = records || [];
  el.customerRenewalsBody.innerHTML = rows.length
    ? rows.map((record) => `
      <tr>
        <td>${formatDate(record.renewalDate)}</td>
        <td>${escapeHtml(planLabel(record.planName, record.planDays))}</td>
        <td>${escapeHtml(displayValue(record.planDays))}</td>
        <td>${formatDate(record.beforeExpireAt)}</td>
        <td>${formatDate(record.afterExpireAt)}</td>
        <td>${escapeHtml(displayValue(record.remark))}</td>
        <td class="admin-actions-cell">${renewalAction(record)}</td>
      </tr>
    `).join("")
    : emptyRow(7, "暂无续费记录");
}

async function loadAdobeAccounts() {
  const data = await api("/api/admin/adobe-accounts");
  state.adobeAccounts = data.adobeAccounts || [];
  renderAdobeAccounts();
  renderStats();
}

async function loadCustomers() {
  const data = await api("/api/admin/customers");
  state.customers = data.customers || [];
  renderCustomers();
  renderStats();
}

async function loadAssignments() {
  const data = await api("/api/admin/assignments");
  state.assignments = data.assignments || [];
  renderAssignments();
  renderStats();
}

async function loadParameters() {
  const data = await api("/api/admin/parameters");
  state.parameters = data.parameters || [];
  renderParameters();
  renderStats();
}

async function loadConfig() {
  const configData = await api("/api/admin/config");
  state.config = configData;
  populateConfigOptions();
}

async function refreshAll() {
  await loadAdobeAccounts();
  await loadCustomers();
  await loadAssignments();
  await loadParameters();
  populateAssignmentOptions();
  renderStats();
  syncSearchClearButtons();
  await refreshSelectedDetails();
}

async function loadAdobeDetail(id) {
  const data = await api(`/api/admin/adobe-accounts/${id}/detail`);
  renderAdobeDetail(data);
}

async function loadCustomerDetail(id) {
  const data = await api(`/api/admin/customers/${id}/detail`);
  renderCustomerDetail(data);
}

async function refreshSelectedDetails() {
  const tasks = [];

  if (state.selectedAdobeId && !el.adobeDetailCard.classList.contains("hidden")) {
    tasks.push(loadAdobeDetail(state.selectedAdobeId).catch(clearAdobeDetail));
  }

  if (state.selectedCustomerId && !el.customerDetailCard.classList.contains("hidden")) {
    tasks.push(loadCustomerDetail(state.selectedCustomerId).catch(clearCustomerDetail));
  }

  await Promise.all(tasks);
}

async function updateAssignmentRole(id, role) {
  await api(`/api/admin/assignments/${id}`, {
    method: "PUT",
    body: JSON.stringify({ assignmentRole: role })
  });
  await refreshAll();
  setMessage(`已设为${assignmentRoleLabel(role)}`, "success");
}

function adobePayload() {
  return {
    adobeCode: formValue(el.adobeForm, "adobeCode"),
    accountEmail: formValue(el.adobeForm, "accountEmail"),
    adobePassword: formValue(el.adobeForm, "adobePassword"),
    accountEmailPassword: formValue(el.adobeForm, "accountEmailPassword"),
    verificationEmail: verificationEmailValue(),
    accountPlan: formValue(el.adobeForm, "accountPlan"),
    paidAt: formValue(el.adobeForm, "paidAt"),
    baseExpireAt: formValue(el.adobeForm, "baseExpireAt"),
    enabled: el.adobeForm.elements.enabled.checked,
    remark: formValue(el.adobeForm, "remark")
  };
}

function customerPayload() {
  return {
    customerCode: formValue(el.customerForm, "customerCode"),
    customerNickname: formValue(el.customerForm, "customerNickname"),
    customerContact: formValue(el.customerForm, "customerContact"),
    customerContactEmail: formValue(el.customerForm, "customerContactEmail"),
    purchasedPlan: formValue(el.customerForm, "purchasedPlan"),
    firstPaidAt: formValue(el.customerForm, "firstPaidAt"),
    baseAfterSalesExpireAt: formValue(el.customerForm, "baseAfterSalesExpireAt"),
    remark: formValue(el.customerForm, "remark")
  };
}

function parameterPayload() {
  const sortOrder = Number(formValue(el.parameterForm, "sortOrder"));
  if (!Number.isInteger(sortOrder) || sortOrder <= 0) {
    throw new Error("排序必须是大于 0 的整数");
  }

  return {
    category: formValue(el.parameterForm, "category"),
    name: formValue(el.parameterForm, "name"),
    days: formValue(el.parameterForm, "days"),
    sortOrder,
    enabled: el.parameterForm.elements.enabled.checked,
    remark: formValue(el.parameterForm, "remark")
  };
}

function fillParameterForm(item) {
  el.parameterForm.elements.id.value = item.id;
  el.parameterForm.elements.category.value = item.category || "plan";
  el.parameterForm.elements.name.value = item.name || "";
  el.parameterForm.elements.days.value = item.category === "plan" ? Number(item.days || 0) : "";
  el.parameterForm.elements.sortOrder.value = Number(item.sortOrder || 0);
  el.parameterForm.elements.enabled.checked = Boolean(item.enabled);
  el.parameterForm.elements.remark.value = item.remark || "";
  syncParameterDaysState();
}

function syncParameterDaysState() {
  const isPlan = el.parameterForm.elements.category.value === "plan";
  el.parameterForm.elements.days.disabled = !isPlan;
  if (!isPlan) {
    el.parameterForm.elements.days.value = "";
  }
}

el.navButtons.forEach((button) => {
  button.addEventListener("click", () => switchSection(button.dataset.section));
});

if (el.logoutBtn) {
  el.logoutBtn.addEventListener("click", clearSessionAndReturnHome);
}
if (el.modalClose) {
  el.modalClose.addEventListener("click", closeModal);
}
el.modal.addEventListener("click", (event) => {
  if (event.target === el.modal) {
    event.stopPropagation();
  }
});
el.confirmCancel.addEventListener("click", () => resolveConfirm(false));
el.confirmOk.addEventListener("click", () => resolveConfirm(true));
if (el.confirmClose) {
  el.confirmClose.addEventListener("click", () => resolveConfirm(false));
}
el.confirmModal.addEventListener("click", (event) => {
  if (event.target === el.confirmModal) {
    event.stopPropagation();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!el.confirmModal.classList.contains("hidden")) {
      resolveConfirm(false);
      return;
    }
    if (!el.modal.classList.contains("hidden")) {
      if (currentModalContent === el.adobeFormCard) {
        return;
      }
      closeModal();
    }
  }
});

document.getElementById("addAdobeBtn").addEventListener("click", openAdobeCreateModal);
document.getElementById("addCustomerBtn").addEventListener("click", openCustomerCreateModal);
document.getElementById("addCustomerHeroBtn").addEventListener("click", openCustomerCreateModal);
document.getElementById("addAssignmentBtn").addEventListener("click", openAssignmentCreateModal);
document.getElementById("addAssignmentHeroBtn").addEventListener("click", openAssignmentCreateModal);
document.getElementById("addParameterBtn").addEventListener("click", openParameterCreateModal);
document.getElementById("addParameterHeroBtn").addEventListener("click", openParameterCreateModal);

if (el.addBindingFromAdobeBtn) {
  el.addBindingFromAdobeBtn.addEventListener("click", () => {
    const account = state.selectedAdobeDetail?.adobeAccount;
    if (!account?.id) {
      setMessage("请先选择 Adobe账户", "error");
      return;
    }
    switchSection("assignments");
    openAssignmentCreateModal({ adobeAccountId: account.id });
  });
}

if (el.addBindingFromCustomerBtn) {
  el.addBindingFromCustomerBtn.addEventListener("click", () => {
    const customer = state.selectedCustomerDetail?.customer;
    if (!customer?.id) {
      setMessage("请先选择客户", "error");
      return;
    }
    switchSection("assignments");
    openAssignmentCreateModal({ customerId: customer.id });
  });
}

const resetAdobeFormBtn = document.getElementById("resetAdobeFormBtn");
if (resetAdobeFormBtn) {
  resetAdobeFormBtn.addEventListener("click", resetAdobeForm);
}
const resetCustomerFormBtn = document.getElementById("resetCustomerFormBtn");
if (resetCustomerFormBtn) {
  resetCustomerFormBtn.addEventListener("click", resetCustomerForm);
}
const resetAssignmentFormBtn = document.getElementById("resetAssignmentFormBtn");
if (resetAssignmentFormBtn) {
  resetAssignmentFormBtn.addEventListener("click", () => {
    el.assignmentForm.reset();
    syncAssignmentRoleField();
  });
}
document.getElementById("resetParameterFormBtn").addEventListener("click", resetParameterForm);
bindAssignmentCombobox("customer");
bindAssignmentCombobox("adobe");
if (el.assignmentForm.elements.assignmentRoleToggle) {
  el.assignmentForm.elements.assignmentRoleToggle.addEventListener("change", syncAssignmentRoleField);
}
document.querySelectorAll("[data-binding-clear]").forEach((button) => {
  button.addEventListener("click", () => clearAssignmentCombobox(button.dataset.bindingClear));
});
document.addEventListener("mousedown", (event) => {
  if (!event.target.closest(".binding-select-shell")) {
    closeAssignmentComboboxMenus();
  }
});
document.getElementById("addAdobeRenewalBtn").addEventListener("click", openAdobeRenewalModal);
if (el.backAdobeListBtn) {
  el.backAdobeListBtn.addEventListener("click", showAdobeListMode);
}
if (el.backCustomerListBtn) {
  el.backCustomerListBtn.addEventListener("click", showCustomerListMode);
}
document.getElementById("addCustomerRenewalBtn").addEventListener("click", openCustomerRenewalModal);
if (el.copyAdobeDetailBtn) {
  el.copyAdobeDetailBtn.addEventListener("click", async () => {
    const account = state.selectedAdobeDetail ? state.selectedAdobeDetail.adobeAccount : null;
    if (!account) {
      setMessage("请先选择 Adobe账户", "error");
      return;
    }
    try {
      await copyTextToClipboard(adobeDetailCopyText(account));
      setMessage("账户详情已复制", "success");
    } catch (error) {
      setMessage("复制失败，请稍后重试", "error");
    }
  });
}
document.getElementById("editSelectedAdobeBtn").addEventListener("click", () => {
  const account = state.selectedAdobeDetail ? state.selectedAdobeDetail.adobeAccount : null;
  if (account) {
    openAdobeEditModal(account);
  }
});
document.getElementById("editSelectedCustomerBtn").addEventListener("click", () => {
  const customer = state.selectedCustomerDetail ? state.selectedCustomerDetail.customer : null;
  if (customer) {
    openCustomerEditModal(customer);
  }
});
document.querySelectorAll("[data-modal-close]").forEach((button) => {
  button.addEventListener("click", closeModal);
});

el.parameterFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.parameterCategoryFilter = button.dataset.parameterFilter || "";
    el.parameterFilterButtons.forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    renderParameters();
  });
});

[el.adobeSearchInput, el.adobeToolbarSearchInput, el.customerSearchInput, el.assignmentSearchInput, el.parameterSearchInput].filter(Boolean).forEach((input) => {
  input.addEventListener("input", () => {
    state.adobePage = 1;
    renderAdobeAccounts();
    renderCustomers();
    renderAssignments();
    renderParameters();
    syncSearchClearButtons();
  });
});

if (el.clearAdobeSearchBtn && el.adobeSearchInput) {
  el.clearAdobeSearchBtn.addEventListener("click", () => {
    el.adobeSearchInput.value = "";
    state.adobePage = 1;
    renderAdobeAccounts();
    syncSearchClearButtons();
    el.adobeSearchInput.focus();
  });
}

if (el.clearCustomerSearchBtn && el.customerSearchInput) {
  el.clearCustomerSearchBtn.addEventListener("click", () => {
    el.customerSearchInput.value = "";
    renderCustomers();
    syncSearchClearButtons();
    el.customerSearchInput.focus();
  });
}

[el.adobePlanFilterSelect, el.adobeStatusFilterSelect, el.adobeExpireFilterSelect].filter(Boolean).forEach((select) => {
  select.addEventListener("change", () => {
    state.adobePage = 1;
    renderAdobeAccounts();
  });
});

[el.customerPlanFilterSelect, el.customerExpireFilterSelect].filter(Boolean).forEach((select) => {
  select.addEventListener("change", renderCustomers);
});

if (el.adobePrevPageBtn) {
  el.adobePrevPageBtn.addEventListener("click", () => {
    state.adobePage = Math.max(1, state.adobePage - 1);
    renderAdobeAccounts();
  });
}

if (el.adobeNextPageBtn) {
  el.adobeNextPageBtn.addEventListener("click", () => {
    state.adobePage += 1;
    renderAdobeAccounts();
  });
}

if (el.adobePageSizeSelect) {
  el.adobePageSizeSelect.addEventListener("change", () => {
    state.adobePageSize = Number(el.adobePageSizeSelect.value) || 10;
    state.adobePage = 1;
    renderAdobeAccounts();
  });
}

if (el.exportAdobeBtn) {
  el.exportAdobeBtn.addEventListener("click", () => {
    const rows = filteredAdobeAccounts();
    const headers = ["Adobe账户编号", "账户邮箱", "验证码邮箱", "账户计划", "付费日期", "账户到期日", "剩余天数", "状态", "启用"];
    const csvRows = [
      headers,
      ...rows.map((account) => [
        displayValue(account.adobeCode),
        displayValue(account.accountEmail),
        displayValue(account.verificationEmail),
        planLabel(account.accountPlan),
        formatDate(account.paidAt),
        formatDate(account.accountExpireAt),
        adobeRemainingText(account),
        adobeStatusText(account),
        account.enabled ? "启用" : "禁用"
      ])
    ];
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "adobe-accounts.csv";
    link.click();
    URL.revokeObjectURL(url);
  });
}

el.parameterCategorySelect.addEventListener("change", syncParameterDaysState);
el.adobeForm.elements.accountPlan.addEventListener("change", syncAdobeExpireFromPlan);
el.adobeForm.elements.paidAt.addEventListener("change", syncAdobeExpireFromPlan);
el.adobeForm.elements.baseExpireAt.addEventListener("change", syncAdobeStatusPreview);
el.adobeRenewalForm.elements.planName.addEventListener("change", updateAdobeRenewalPreview);
el.customerForm.elements.purchasedPlan.addEventListener("change", syncCustomerExpireFromPlan);
el.customerForm.elements.firstPaidAt.addEventListener("change", syncCustomerExpireFromPlan);
el.customerForm.elements.baseAfterSalesExpireAt.addEventListener("change", syncCustomerStatusPreview);
el.customerForm.elements.remark.addEventListener("input", updateCustomerRemarkCount);
el.customerRenewalForm.elements.planName.addEventListener("change", updateCustomerRenewalPreview);

el.adobeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = el.adobeForm.elements.id.value;
  try {
    await api(id ? `/api/admin/adobe-accounts/${id}` : "/api/admin/adobe-accounts", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(adobePayload())
    });
    resetAdobeForm();
    await refreshAll();
    closeModal();
    setMessage("Adobe账户已保存", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = el.customerForm.elements.id.value;
  try {
    await api(id ? `/api/admin/customers/${id}` : "/api/admin/customers", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(customerPayload())
    });
    resetCustomerForm();
    await refreshAll();
    closeModal();
    setMessage("客户已保存", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.assignmentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  syncAssignmentRoleField();
  const customerId = syncAssignmentCombobox(el.assignmentCustomerInput, el.assignmentCustomerSelect);
  const adobeAccountId = syncAssignmentCombobox(el.assignmentAdobeInput, el.assignmentAdobeSelect);
  if (!customerId || !adobeAccountId) {
    setMessage("请选择有效的客户和 Adobe账户", "error");
    return;
  }
  try {
    await api("/api/admin/assignments", {
      method: "POST",
      body: JSON.stringify({
        customerId,
        adobeAccountId,
        assignmentRole: formValue(el.assignmentForm, "assignmentRole"),
        assignedAt: formValue(el.assignmentForm, "assignedAt"),
        remark: formValue(el.assignmentForm, "remark")
      })
    });
    el.assignmentForm.reset();
    await refreshAll();
    closeModal();
    setMessage("绑定关系已创建", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.parameterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = el.parameterForm.elements.id.value;
  try {
    await api(id ? `/api/admin/parameters/${id}` : "/api/admin/parameters", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(parameterPayload())
    });
    resetParameterForm();
    await loadConfig();
    await refreshAll();
    closeModal();
    setMessage("参数已保存", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.parametersBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const item = state.parameters.find((parameter) => parameter.id === button.dataset.id);
  if (!item) {
    return;
  }

  try {
    if (button.dataset.action === "edit") {
      openParameterEditModal(item);
      return;
    }
    if (button.dataset.action === "delete" && await askConfirm(
      "确认删除该参数？删除后相关下拉选项将不再显示，请谨慎操作。",
      "删除参数",
      parameterSummaryDetails(item),
      "该操作不可撤销。"
    )) {
      await api(`/api/admin/parameters/${item.id}`, { method: "DELETE" });
      await loadConfig();
      await refreshAll();
      setMessage("参数已删除", "success");
    }
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.adobeBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const account = state.adobeAccounts.find((item) => item.id === button.dataset.id);
  if (!account) {
    return;
  }

  try {
    if (button.dataset.action === "view") {
      await loadAdobeDetail(account.id);
      return;
    }
    if (button.dataset.action === "edit") {
      openAdobeEditModal(account);
      return;
    }
    if (button.dataset.action === "renew") {
      await loadAdobeDetail(account.id);
      openAdobeRenewalModal();
      return;
    }
    if (button.dataset.action === "delete" && await askConfirm(
      "确认删除该 Adobe账户？删除后无法恢复，请谨慎操作。",
      "删除 Adobe账户",
      [
        { label: "账户编号", value: account.adobeCode },
        { label: "Adobe账户", value: account.accountEmail },
        { label: "验证码邮箱", value: account.verificationEmail },
        { label: "到期日", value: formatDate(account.accountExpireAt) }
      ],
      "该操作不可撤销。"
    )) {
      await api(`/api/admin/adobe-accounts/${account.id}`, { method: "DELETE" });
      await refreshAll();
      setMessage("Adobe账户已删除", "success");
    }
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.customersBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const customer = state.customers.find((item) => item.id === button.dataset.id);
  if (!customer) {
    return;
  }

  try {
    if (button.dataset.action === "view") {
      await loadCustomerDetail(customer.id);
      return;
    }
    if (button.dataset.action === "edit") {
      openCustomerEditModal(customer);
      return;
    }
    if (button.dataset.action === "delete" && await askConfirm(
      "确认删除该客户？删除后无法恢复，请谨慎操作。",
      "删除客户",
      [
        { label: "客户编号", value: customer.customerCode },
        { label: "客户昵称", value: customer.customerNickname },
        { label: "联系方式", value: customer.customerContact },
        { label: "售后到期日", value: formatDate(customer.afterSalesExpireAt) }
      ],
      "该操作不可撤销。"
    )) {
      await api(`/api/admin/customers/${customer.id}`, { method: "DELETE" });
      await refreshAll();
      setMessage("客户已删除", "success");
    }
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.adobeDetailCustomers.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.dataset.action !== "view-customer-detail") {
    return;
  }

  try {
    switchSection("customers");
    await loadCustomerDetail(button.dataset.id);
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.customerDetailAdobeAccounts.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  try {
    if (button.dataset.action === "set-assignment-role") {
      await updateAssignmentRole(button.dataset.id, button.dataset.role);
      return;
    }
    if (button.dataset.action === "view-adobe-detail") {
      switchSection("adobe");
      await loadAdobeDetail(button.dataset.id);
    }
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.assignmentsBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const assignment = state.assignments.find((item) => item.id === button.dataset.id);
  if (!assignment) {
    return;
  }

  try {
    if (button.dataset.action === "set-assignment-role") {
      await updateAssignmentRole(assignment.id, button.dataset.role);
      return;
    }
    if (button.dataset.action === "cancel") {
      const ok = await askConfirm(
        "确认取消该绑定关系？取消后该客户将不再显示在该 Adobe账户下。",
        "取消绑定关系",
        assignmentSummaryDetails(assignment),
        "该操作会保留历史记录。"
      );
      if (!ok) {
        return;
      }
      await api(`/api/admin/assignments/${assignment.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: false })
      });
      setMessage("绑定已取消", "success");
    }
    if (button.dataset.action === "restore") {
      const ok = await askConfirm(
        "确认恢复该绑定关系？",
        "恢复绑定关系",
        assignmentSummaryDetails(assignment)
      );
      if (!ok) {
        return;
      }
      await api(`/api/admin/assignments/${assignment.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: true })
      });
      setMessage("绑定已恢复", "success");
    }
    if (button.dataset.action === "delete") {
      const ok = await askConfirm(
        "您即将删除以下绑定记录，此操作不可撤销。",
        "删除绑定关系",
        assignmentSummaryDetails(assignment),
        "删除后该绑定关系记录将从数据库移除。"
      );
      if (!ok) {
        return;
      }
      await api(`/api/admin/assignments/${assignment.id}`, { method: "DELETE" });
      setMessage("绑定记录已删除", "success");
    }
    await refreshAll();
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.adobeRenewalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = el.adobeRenewalForm.dataset.id;
  if (!id) {
    setMessage("请先选择 Adobe账户", "error");
    return;
  }

  try {
    await api(`/api/admin/adobe-accounts/${id}/renewals`, {
      method: "POST",
      body: JSON.stringify({
        planName: formValue(el.adobeRenewalForm, "planName"),
        renewalDate: formValue(el.adobeRenewalForm, "renewalDate"),
        remark: formValue(el.adobeRenewalForm, "remark")
      })
    });
    el.adobeRenewalForm.reset();
    await loadAdobeAccounts();
    await loadAdobeDetail(id);
    closeModal();
    setMessage("Adobe续费记录已新增", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.adobeRenewalsBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.dataset.action !== "delete-renewal") {
    return;
  }
  const id = el.adobeRenewalForm.dataset.id;
  try {
    const record = selectedAdobeRenewalRecord(button.dataset.id);
    const account = state.selectedAdobeDetail ? state.selectedAdobeDetail.adobeAccount : null;
    const ok = await askConfirm(
      "删除后，系统将自动回滚到期日，请确认是否继续。",
      "确认删除续费记录",
      [
        { label: "Adobe账户", value: account ? `${account.adobeCode} | ${account.accountEmail}` : "-" },
        { label: "续费日期", value: record ? formatDate(record.renewalDate) : "-" },
        { label: "续费套餐", value: record ? planLabel(record.planName, record.planDays) : "-" },
        { label: "增加天数", value: record ? `${record.planDays || 0} 天` : "-" },
        { label: "续费前到期日", value: record ? formatDate(record.beforeExpireAt) : "-" },
        { label: "续费后到期日", value: record ? formatDate(record.afterExpireAt) : "-" }
      ],
      "该操作不可撤销。"
    );
    if (!ok) {
      return;
    }
    await api(`/api/admin/adobe-accounts/${id}/renewals/${button.dataset.id}`, { method: "DELETE" });
    await loadAdobeAccounts();
    await loadAdobeDetail(id);
    setMessage("Adobe续费记录已删除并重算到期日", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.customerRenewalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = el.customerRenewalForm.dataset.id;
  if (!id) {
    setMessage("请先选择客户", "error");
    return;
  }

  try {
    await api(`/api/admin/customers/${id}/renewals`, {
      method: "POST",
      body: JSON.stringify({
        planName: formValue(el.customerRenewalForm, "planName"),
        renewalDate: formValue(el.customerRenewalForm, "renewalDate"),
        remark: formValue(el.customerRenewalForm, "remark")
      })
    });
    el.customerRenewalForm.reset();
    await loadCustomers();
    await loadCustomerDetail(id);
    closeModal();
    setMessage("客户续费记录已新增", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

el.customerRenewalsBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.dataset.action !== "delete-renewal") {
    return;
  }
  const id = el.customerRenewalForm.dataset.id;
  try {
    const record = selectedCustomerRenewalRecord(button.dataset.id);
    const customer = state.selectedCustomerDetail ? state.selectedCustomerDetail.customer : null;
    const ok = await askConfirm(
      "删除后，系统将自动回滚客户售后到期日，请确认是否继续。",
      "确认删除客户续费记录",
      [
        { label: "客户", value: customer ? `${customer.customerCode} | ${customer.customerNickname}` : "-" },
        { label: "续费日期", value: record ? formatDate(record.renewalDate) : "-" },
        { label: "续费套餐", value: record ? planLabel(record.planName, record.planDays) : "-" },
        { label: "增加天数", value: record ? `${record.planDays || 0} 天` : "-" },
        { label: "续费前售后到期日", value: record ? formatDate(record.beforeExpireAt) : "-" },
        { label: "续费后售后到期日", value: record ? formatDate(record.afterExpireAt) : "-" }
      ],
      "该操作不可撤销。"
    );
    if (!ok) {
      return;
    }
    await api(`/api/admin/customers/${id}/renewals/${button.dataset.id}`, { method: "DELETE" });
    await loadCustomers();
    await loadCustomerDetail(id);
    setMessage("客户续费记录已删除并重算售后到期日", "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

prepareModalCards();

(async function init() {
  if (!getToken()) {
    clearSessionAndReturnHome();
    return;
  }

  try {
    const me = await api("/api/me");
    if (!me.user || me.user.role !== "admin") {
      clearSessionAndReturnHome();
      return;
    }

    state.currentUser = me.user;
    if (el.adminInfo) {
      el.adminInfo.textContent = `当前管理员：${state.currentUser.username}`;
    }
    await loadConfig();
    await refreshAll();
    syncParameterDaysState();
    el.adminPanel.classList.remove("hidden");
  } catch (error) {
    clearSessionAndReturnHome();
  }
})();
