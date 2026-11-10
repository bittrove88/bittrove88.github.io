"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const root = path.resolve(__dirname, "../..");
const types = {
  ".webm": "video/webm",
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};
module.exports = () =>
  http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const file = path.resolve(
      root,
      "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
    );
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) return res.writeHead(404).end();
      res.setHeader(
        "Content-Type",
        types[path.extname(file)] || "application/octet-stream",
      );
      res.setHeader("Accept-Ranges", "bytes");
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      const start = range ? Number(range[1]) : 0,
        end =
          range && range[2]
            ? Math.min(stat.size - 1, Number(range[2]))
            : stat.size - 1;
      if (start > end) return res.writeHead(416).end();
      if (range)
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Content-Length": end - start + 1,
        });
      else res.setHeader("Content-Length", stat.size);
      fs.createReadStream(file, { start, end }).pipe(res);
    });
  });
