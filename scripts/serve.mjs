import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);

const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

async function resolvePath(urlPath) {
  const clean = urlPath.split("?")[0];
  if (clean === "/" || clean === "/index.html") {
    return path.join(root, "index.html");
  }
  return path.join(root, clean.replace(/^\/+/, ""));
}

const server = http.createServer(async (req, res) => {
  try {
    const filePath = await resolvePath(req.url || "/");
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
});
