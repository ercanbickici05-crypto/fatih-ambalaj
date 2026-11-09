// Yerel önizleme sunucusu: siteyi derler, http://localhost:4321 adresinde açar
// ve site.config.js, data/, assets/, public/ değiştikçe yeniden derler.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { tamDerle, ROOT, DIST } = require("./build");

const PORT = Number(process.env.PORT) || 4321;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".avif": "image/avif", ".ico": "image/x-icon", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
  ".json": "application/json", ".woff2": "font/woff2", ".yml": "text/yaml; charset=utf-8",
};

// Windows'ta derleme sırasında dosyaların kopyalanması da izleme olayı üretebilir;
// derlemeden hemen sonraki olaylar yok sayılır (aksi hâlde sonsuz döngü oluşur).
let sonDerleme = 0;
async function guvenliDerle() {
  try { await tamDerle(); } catch (e) { console.error("Derleme hatası:", e.message); }
  sonDerleme = Date.now();
}
guvenliDerle();

let zaman;
for (const hedef of ["site.config.js", "data", "content", "assets", "public"]) {
  const p = path.join(ROOT, hedef);
  if (!fs.existsSync(p)) continue;
  fs.watch(p, { recursive: true }, () => {
    if (Date.now() - sonDerleme < 1500) return;
    clearTimeout(zaman);
    zaman = setTimeout(guvenliDerle, 200);
  });
}

http
  .createServer((req, res) => {
    let yol = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let dosya = path.normalize(path.join(DIST, yol));
    if (!dosya.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(dosya) && fs.statSync(dosya).isDirectory()) {
      if (!yol.endsWith("/")) { res.writeHead(301, { Location: yol + "/" }); return res.end(); }
      dosya = path.join(dosya, "index.html");
    }
    let durum = 200;
    if (!fs.existsSync(dosya)) { durum = 404; dosya = path.join(DIST, "404.html"); }
    res.writeHead(durum, { "Content-Type": TYPES[path.extname(dosya)] || "application/octet-stream", "Cache-Control": "no-cache" });
    fs.createReadStream(dosya).pipe(res);
  })
  .listen(PORT, () => console.log(`Önizleme: http://localhost:${PORT}  (durdurmak için Ctrl+C)`));
