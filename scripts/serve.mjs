import http from "node:http";
import { appendFile, mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { orchestrateHybridReply } from "../src/orchestrator/hybrid-orchestrator.js";
import { getHybridRuntimeConfig } from "../src/orchestrator/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const auditRoot = path.join(root, "logs", "chat-audit");

const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

async function resolvePath(urlPath) {
  const clean = urlPath.split("?")[0];
  if (clean === "/" || clean === "/index.html") {
    return path.join(root, "index.html");
  }
  return path.join(root, clean.replace(/^\/+/, ""));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw || "{}");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function isSafeSessionId(value) {
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

async function appendAuditEvent(event) {
  await mkdir(auditRoot, { recursive: true });
  const line = `${JSON.stringify(event)}\n`;
  const sessionFile = path.join(auditRoot, `${event.sessionId || "unknown"}.jsonl`);
  const allFile = path.join(auditRoot, "all-sessions.jsonl");
  await appendFile(sessionFile, line, "utf8");
  await appendFile(allFile, line, "utf8");
}

async function readSessionAudit(sessionId) {
  const file = path.join(auditRoot, `${sessionId}.jsonl`);
  const raw = await readFile(file, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const server = http.createServer(async (req, res) => {
  const method = req.method || "GET";
  const url = req.url || "/";
  const cleanPath = url.split("?")[0];

  if (method === "GET" && cleanPath === "/api/health") {
    const runtimeConfig = getHybridRuntimeConfig();
    sendJson(res, 200, {
      ok: true,
      hybridMode: String(process.env.HYBRID_MODE ?? "true"),
      provider: runtimeConfig.llm.provider,
      model: runtimeConfig.llm.model,
      keyConfigured: Boolean(runtimeConfig.llm.apiKey)
    });
    return;
  }

  if (method === "GET" && cleanPath === "/api/chat/respond") {
    sendJson(res, 200, {
      ok: true,
      endpoint: "/api/chat/respond",
      method: "POST",
      hint: "Use POST with JSON body containing userText, stateContext, history, sessionId."
    });
    return;
  }

  if (method === "GET" && cleanPath === "/api/audit/sessions") {
    try {
      await mkdir(auditRoot, { recursive: true });
      const files = await readdir(auditRoot);
      const sessions = files
        .filter((name) => name.endsWith(".jsonl") && name !== "all-sessions.jsonl")
        .map((name) => name.replace(/\.jsonl$/, ""))
        .sort();
      sendJson(res, 200, {
        ok: true,
        auditRoot,
        sessions
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: "audit_list_failed",
        message: String(error?.message || error)
      });
    }
    return;
  }

  if (method === "GET" && cleanPath.startsWith("/api/audit/session/")) {
    const sessionId = decodeURIComponent(cleanPath.replace("/api/audit/session/", ""));
    if (!sessionId || !isSafeSessionId(sessionId)) {
      sendJson(res, 400, {
        ok: false,
        error: "invalid_session_id"
      });
      return;
    }
    try {
      const events = await readSessionAudit(sessionId);
      sendJson(res, 200, {
        ok: true,
        sessionId,
        events
      });
    } catch (error) {
      sendJson(res, 404, {
        ok: false,
        error: "session_not_found",
        message: String(error?.message || error)
      });
    }
    return;
  }

  if (method === "POST" && cleanPath === "/api/chat/respond") {
    try {
      const body = await readJsonBody(req);
      if (!body?.userText || typeof body.userText !== "string") {
        sendJson(res, 400, {
          error: "invalid_request",
          message: "userText is required"
        });
        return;
      }

      const result = await orchestrateHybridReply(body);
      const auditEvent = {
        timestamp: new Date().toISOString(),
        sessionId: body.sessionId || "unknown",
        userText: body.userText,
        stateContext: body.stateContext || {},
        history: Array.isArray(body.history) ? body.history : [],
        reply: result.reply,
        meta: result.meta,
        generationSource: result.meta?.generationSource || result.reply?.generationSource || "fallback",
        fallbackReason: result.meta?.fallbackReason || result.reply?.fallbackReason || null,
        guardrailReason: result.meta?.guardrailReason || result.reply?.guardrailReason || null,
        decisionTrace: result.meta?.decisionTrace || null
      };
      await appendAuditEvent(auditEvent);
      sendJson(res, 200, result);
      return;
    } catch (error) {
      sendJson(res, 500, {
        error: "server_error",
        message: String(error?.message || error)
      });
      return;
    }
  }

  try {
    const filePath = await resolvePath(url);
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const content = await readFile(filePath);
    const ext = path.extname(filePath);
    res.setHeader("Content-Type", mimeByExt[ext] || "application/octet-stream");
    res.writeHead(200);
    res.end(content);
  } catch (_error) {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(port, host, () => {
  console.log(`KOL MVP server running on http://${host}:${port}`);
  console.log(`Hybrid chat endpoint: http://${host}:${port}/api/chat/respond`);
});
