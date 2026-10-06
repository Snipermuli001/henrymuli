const crypto = require("crypto");

const REPO = "Snipermuli001/henrymuli";
const BRANCH = "main";

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  };
}

function authenticated(event) {
  const cookie = event.headers.cookie || event.headers.Cookie || "";
  const match = cookie.match(/(?:^|; )henry_admin=([^;]+)/);
  const token = match && match[1];
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !token) return false;
  const [issued, signature] = decodeURIComponent(token).split(".");
  if (!issued || !signature || Date.now() - Number(issued) > 1000 * 60 * 60 * 12) return false;
  const expected = crypto.createHmac("sha256", secret).update(issued).digest("hex");
  return signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function gh(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured in Netlify.");
  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) {
    const message = data.message || `GitHub API error ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

exports.handler = async (event) => {
  if (!authenticated(event)) return json(401, { error: "Unauthorized." });

  try {
    if (event.httpMethod === "GET") {
      const path = new URL(event.rawUrl).searchParams.get("path");
      if (!path) return json(400, { error: "Missing path." });
      const data = await gh(encodeURIComponent(path) + `?ref=${BRANCH}`);
      return json(200, {
        path,
        sha: data.sha,
        encoding: data.encoding,
        content: data.content,
        download_url: data.download_url
      });
    }

    if (event.httpMethod === "PUT") {
      const body = JSON.parse(event.body || "{}");
      if (!body.path || !body.content || !body.sha) return json(400, { error: "path, content and sha are required." });

      const payload = {
        message: body.message || `admin: update ${body.path}`,
        content: body.content.replace(/\\n/g, "").replace(/\s+$/, ""),
        sha: body.sha,
        branch: BRANCH
      };

      const data = await gh(encodeURIComponent(body.path), {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      return json(200, { ok: true, commit_sha: data.commit && data.commit.sha, content_sha: data.content && data.content.sha });
    }

    return json(405, { error: "Method not allowed." });
  } catch (error) {
    return json(error.status || 500, { error: error.message });
  }
};
