const tokenKey = "mailCodeToken";

const loginPanel = document.getElementById("loginPanel");
const userPanel = document.getElementById("userPanel");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const userInfo = document.getElementById("userInfo");
const accountAvatar = document.getElementById("accountAvatar");
const codeList = document.getElementById("codeList");
const socketStatus = document.getElementById("socketStatus");
const sessionCountdown = document.getElementById("sessionCountdown");
const newCodeSound = document.getElementById("newCodeSound");

let currentUser = null;
let socket = null;
let codes = [];
let sessionExpiresAt = null;

function getToken() {
  return localStorage.getItem(tokenKey);
}

function getTokenPayload() {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    return JSON.parse(atob(padded));
  } catch (error) {
    return null;
  }
}

function setMessage(el, text, type) {
  el.textContent = text || "";
  el.className = `message ${type || ""}`.trim();
}

function friendlyErrorMessage(message) {
  if (message === "invalid username or password") {
    return "用户名或密码错误，请重新输入或联系管理员。";
  }

  return message;
}

function cleanLoginAccount(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9@._%+-]/g, "")
    .toLowerCase();
}

function isValidLoginAccount(value) {
  const account = cleanLoginAccount(value);

  if (account === "admin") {
    return true;
  }

  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(account);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    if (res.status === 401) {
      logoutToLogin("登录已过期，请重新登录。");
    }
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

function remainingText(expiresAt) {
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

function normalizeCodeValue(value) {
  const text = String(value || "");
  const match = text.match(/\b\d{4,8}\b/);
  return match ? match[0] : text;
}

function playNewCodeSound() {
  if (!newCodeSound) {
    return;
  }

  try {
    newCodeSound.currentTime = 0;
    const playPromise = newCodeSound.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  } catch (error) {
    // Browser autoplay rules can block audio until user interaction.
  }
}

async function copyText(value) {
  const text = String(value || "");

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("copy failed");
  }
}

function sessionRemainingText() {
  let expiresAt = sessionExpiresAt ? new Date(sessionExpiresAt).getTime() : 0;

  if (!expiresAt) {
    const payload = getTokenPayload();
    expiresAt = payload && payload.exp ? payload.exp * 1000 : 0;
  }

  if (!expiresAt) {
    return "--";
  }

  const seconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

function logoutToLogin(message) {
  localStorage.removeItem(tokenKey);
  currentUser = null;
  sessionExpiresAt = null;
  codes = [];
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  showLogin();
  if (message) {
    setMessage(loginMessage, message, "error");
  }
}

function renderSessionCountdown() {
  if (!currentUser) {
    return;
  }

  const text = sessionRemainingText();
  sessionCountdown.textContent = `登录剩余时间 ${text}`;

  if (text === "0m 00s") {
    logoutToLogin("登录已过期，请重新登录。");
  }
}

function renderCodes() {
  const activeCodes = codes
    .filter((item) => new Date(item.expiresAt).getTime() > Date.now())
    .sort((a, b) => {
      const receivedDiff = new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
      if (receivedDiff !== 0) {
        return receivedDiff;
      }
      return new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime();
    });

  if (!activeCodes.length) {
    codeList.innerHTML = `
      <div class="receiver-empty">
        <div class="receiver-loader" aria-hidden="true">
          <div class="circle">
            <div class="dot"></div>
            <div class="outline"></div>
          </div>
          <div class="circle">
            <div class="dot"></div>
            <div class="outline"></div>
          </div>
          <div class="circle">
            <div class="dot"></div>
            <div class="outline"></div>
          </div>
          <div class="circle">
            <div class="dot"></div>
            <div class="outline"></div>
          </div>
        </div>
        <span>等待接收验证码</span>
      </div>
    `;
    return;
  }

  codeList.innerHTML = activeCodes.map((item, index) => `
    <article class="receiver-code-card ${index > 0 ? "is-older" : ""}">
      <div class="receiver-code-main">
        <p>验证码</p>
        <div class="receiver-code-value">${escapeHtml(normalizeCodeValue(item.code))}</div>
        <button type="button" class="copy-code-btn" data-id="${escapeHtml(item.id)}">Copy</button>
      </div>
      <div class="receiver-code-info">
        <div class="info-row">
          <div class="info-icon" aria-hidden="true">@</div>
          <div>
            <p>发送者</p>
            <strong>${escapeHtml(item.from || "未知发送者")}</strong>
          </div>
        </div>
        <div class="info-row">
          <div class="info-icon" aria-hidden="true">M</div>
          <div>
            <p>接收者</p>
            <strong>${escapeHtml(item.emailAddress || "")}</strong>
          </div>
        </div>
        <div class="info-grid">
          <div>
            <p>Received</p>
            <strong>${new Date(item.receivedAt).toLocaleString()}</strong>
          </div>
          <div class="status-pill">
            <p>Status</p>
            <strong>Expires in ${remainingText(item.expiresAt)}</strong>
          </div>
        </div>
      </div>
    </article>
  `).join("");
}

function showUser() {
  document.body.classList.remove("login-active");
  document.body.classList.add("receiver-active");
  loginPanel.classList.add("hidden");
  userPanel.classList.remove("hidden");
  userInfo.textContent = currentUser.username;
  if (accountAvatar) {
    accountAvatar.textContent = String(currentUser.username || "U").slice(0, 1).toUpperCase();
  }
  renderSessionCountdown();
}

function showLogin() {
  document.body.classList.remove("receiver-active");
  document.body.classList.add("login-active");
  userPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  if (sessionCountdown) {
    sessionCountdown.textContent = "登录剩余时间 --";
  }
}

async function loadCodes() {
  const data = await api("/api/codes");
  codes = data.codes || [];
  renderCodes();
}

function connectSocket() {
  if (socket) {
    socket.disconnect();
  }

  socket = io({
    auth: {
      token: getToken()
    }
  });

  socket.on("connect", () => {
    if (socketStatus) {
      socketStatus.textContent = "Realtime connected";
    }
  });

  socket.on("disconnect", () => {
    if (socketStatus) {
      socketStatus.textContent = "Realtime disconnected";
    }
  });

  socket.on("connect_error", () => {
    if (socketStatus) {
      socketStatus.textContent = "Realtime auth failed";
    }
  });

  socket.on("new_code", (codeData) => {
    codes = [codeData, ...codes.filter((item) => item.id !== codeData.id)];
    renderCodes();
    playNewCodeSound();
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(loginMessage, "正在登录...");

  const formData = new FormData(loginForm);
  const username = cleanLoginAccount(formData.get("username"));
  formData.set("username", username);

  if (!isValidLoginAccount(username)) {
    setMessage(loginMessage, "请输入正确的英文邮箱格式。", "error");
    return;
  }

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    localStorage.setItem(tokenKey, data.token);
    currentUser = data.user;
    sessionExpiresAt = data.sessionExpiresAt || null;

    if (currentUser.role === "admin") {
      window.location.href = "/admin.html";
      return;
    }

    showUser();
    await loadCodes();
    connectSocket();
    setMessage(loginMessage, "");
  } catch (error) {
    setMessage(loginMessage, friendlyErrorMessage(error.message), "error");
  }
});

loginForm.elements.username.addEventListener("input", (event) => {
  const cleaned = cleanLoginAccount(event.target.value);
  if (event.target.value !== cleaned) {
    event.target.value = cleaned;
  }
});

document.getElementById("refreshBtn").addEventListener("click", loadCodes);
document.getElementById("logoutBtn").addEventListener("click", () => {
  logoutToLogin();
});

codeList.addEventListener("click", async (event) => {
  const button = event.target.closest(".copy-code-btn");
  if (!button) {
    return;
  }

  const codeItem = codes.find((item) => item.id === button.dataset.id);
  const codeValue = codeItem ? normalizeCodeValue(codeItem.code) : "";

  try {
    await copyText(codeValue);
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = "Copy";
    }, 1200);
  } catch (error) {
    button.textContent = "Copy failed";
    setTimeout(() => {
      button.textContent = "Copy";
    }, 1200);
  }
});

setInterval(() => {
  renderCodes();
  renderSessionCountdown();
}, 1000);

(async function init() {
  if (!getToken()) {
    showLogin();
    return;
  }

  try {
    const data = await api("/api/me");
    currentUser = data.user;
    sessionExpiresAt = data.sessionExpiresAt || null;

    if (currentUser.role === "admin") {
      window.location.href = "/admin.html";
      return;
    }

    showUser();
    await loadCodes();
    connectSocket();
  } catch (error) {
    localStorage.removeItem(tokenKey);
    showLogin();
  }
})();
