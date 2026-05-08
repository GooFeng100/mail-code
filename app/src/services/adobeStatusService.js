async function fetchAdobeUserStatus(email) {
  const normalizedEmail = String(email || "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    const error = new Error("invalid email");
    error.status = 400;
    throw error;
  }

  const upstream = await fetch("https://reseller.ado-besoft.com/api/user-status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: normalizedEmail }),
  });
  const data = await upstream.json().catch(() => ({}));

  return {
    data,
    status: upstream.status,
  };
}

async function handleAdobeUserStatus(req, res, next) {
  try {
    const result = await fetchAdobeUserStatus(req.body && req.body.email);
    return res.status(result.status).json(result.data);
  } catch (error) {
    if (!error.status) {
      error.status = 502;
      error.message = "Adobe status request failed";
    }
    return next(error);
  }
}

module.exports = {
  fetchAdobeUserStatus,
  handleAdobeUserStatus,
};
