const config = require("../config");

const KEYWORDS = [
  "verification code",
  "security code",
  "one-time code",
  "one time code",
  "login code",
  "sign-in code",
  "signin code",
  "authentication code",
  "codigo de verificacion",
  "codigo de seguridad",
  "code de verification",
  "codice di verifica",
  "verifizierungscode",
  "verificatiecode",
  "kod weryfikacyjny",
  "verifikationskod",
  "verificacion",
  "verification",
  "otp",
  "verify",
  "codigo",
  "code"
];

function decodeEntities(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCharCode(parseInt(number, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToText(html) {
  return decodeEntities(String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/\s(?:href|src|data-saferedirecturl)=("[^"]*"|'[^']*'|[^\s>]+)/gi, " ")
    .replace(/<(?:br|\/td|\/tr|\/p|\/div|\/h[1-6]|\/li)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeForSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function stripConfiguredDomains(text) {
  let content = String(text || "");

  for (const domain of config.mailDomains) {
    const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const emailPattern = new RegExp(`\\b[a-z0-9._%+-]+@${escapedDomain}\\b`, "gi");
    const domainPattern = new RegExp(`\\b${escapedDomain}\\b`, "gi");
    content = content.replace(emailPattern, " ");
    content = content.replace(domainPattern, " ");
  }

  return content;
}

function readableMailText(text) {
  const content = String(text || "");

  if (!/<[a-z][\s\S]*>/i.test(content)) {
    return stripConfiguredDomains(decodeEntities(content));
  }

  return stripConfiguredDomains(htmlToText(content));
}

function valueToText(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(valueToText).join(" ");
  }

  if (value.text) {
    return value.text;
  }

  if (value.value) {
    return value.value.map((item) => item.address || item.name || "").join(" ");
  }

  return String(value);
}

function findRecipient(parsed) {
  const domains = config.mailDomains.map((domain) => domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const emailPattern = new RegExp(`\\b[a-z0-9._%+-]+@(?:${domains.join("|")})\\b`, "i");
  const candidates = [
    parsed.headers.get("x-original-to"),
    parsed.headers.get("delivered-to"),
    parsed.headers.get("envelope-to"),
    parsed.headers.get("x-envelope-to"),
    parsed.headers.get("x-forwarded-to"),
    parsed.headers.get("x-forwarded-for"),
    parsed.headers.get("original-recipient"),
    parsed.headers.get("final-recipient"),
    parsed.headers.get("resent-to"),
    parsed.headers.get("apparently-to"),
    parsed.to && parsed.to.text,
    parsed.cc && parsed.cc.text,
    parsed.headers.get("to"),
    parsed.headers.get("cc")
  ];

  for (const [key, value] of parsed.headers) {
    if (!candidates.includes(value)) {
      candidates.push(value);
    }
  }

  candidates.push(parsed.text || "", parsed.html || "");

  for (const candidate of candidates) {
    const text = valueToText(candidate).toLowerCase();
    const match = text.match(emailPattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

function extractCode(text) {
  const content = readableMailText(text);
  const normalized = normalizeForSearch(content);
  const matches = Array.from(normalized.matchAll(/\b\d{4,8}\b/g));

  if (!matches.length) {
    return null;
  }

  const normalizedKeywords = KEYWORDS.map(normalizeForSearch);
  let best = null;
  let bestDistance = Number.MAX_SAFE_INTEGER;

  for (const keyword of normalizedKeywords) {
    let keywordIndex = normalized.indexOf(keyword);

    while (keywordIndex !== -1) {
      const windowText = normalized.slice(keywordIndex, keywordIndex + 360);
      const windowMatch = windowText.match(/\b\d{4,8}\b/);

      if (windowMatch) {
        const absoluteIndex = keywordIndex + windowMatch.index;
        const distance = absoluteIndex - keywordIndex;

        if (distance < bestDistance) {
          best = windowMatch;
          bestDistance = distance;
        }
      }

      keywordIndex = normalized.indexOf(keyword, keywordIndex + keyword.length);
    }
  }

  if (!best) {
    best = matches[0];
  }

  return best[0];
}

function parseMail(parsed) {
  const emailAddress = findRecipient(parsed);
  const text = [
    parsed.subject || "",
    parsed.text || "",
    htmlToText(parsed.html || "")
  ].join("\n");
  const code = extractCode(text);

  return {
    emailAddress,
    emailLocal: emailAddress ? emailAddress.split("@")[0] : null,
    code,
    from: parsed.from && parsed.from.text ? parsed.from.text : "",
    subject: parsed.subject || "",
    receivedAt: (parsed.date || new Date()).toISOString()
  };
}

module.exports = {
  parseMail,
  findRecipient,
  extractCode
};
