const crypto = require("crypto");

const PASSWORD_HASH = "9c40a0ce571c23f45b0aa9ba36c8095ebea4839282b377433188827ec72ca15a";

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  };
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    const cookie = event.headers.cookie || event.headers.Cookie || "";
    const match = cookie.match(/(?:^|; )henry_admin=([^;]+)/);
    const token = match && match[1];
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret || !token) return json(401, { authenticated: false });
    const [issued, signature] = decodeURIComponent(token).split(".");
    if (!issued || !signature) return json(401, { authenticated: false });
    const expected = sign(issued, secret);
    const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    const fresh = Number(issued) > Date.now() - 1000 * 60 * 60 * 12;
    return valid && fresh ? json(200, { authenticated: true }) : json(401, { authenticated: false });
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  if (!process.env.ADMIN_SESSION_SECRET) {
    return json(500, { error: "ADMIN_SESSION_SECRET is not configured in Netlify." });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON." }); }

  const password = String(body.password || "");
  const supplied = crypto.createHash("sha256").update(password).digest("hex");
  const ok = crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(PASSWORD_HASH));
  if (!ok) return json(401, { error: "Invalid credentials." });

  const issued = String(Date.now());
  const token = encodeURIComponent(issued + "." + sign(issued, process.env.ADMIN_SESSION_SECRET));
  return json(200, { authenticated: true }, {
    "Set-Cookie": `henry_admin=${token}; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Strict`
  });
};
