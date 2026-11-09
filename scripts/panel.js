// Yönetim panelini bilgisayarda çalıştırır:
//  - Decap'in yerel sunucusunu başlatır (panelden yapılan değişiklikleri doğrudan dosyalara yazar)
//  - Önizleme sunucusunu başlatır (değişiklik olunca siteyi yeniden derler)
// Panel: http://localhost:4321/admin/   Site: http://localhost:4321/
const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const decap = spawn("npx --yes decap-server@3.11.5", {
  cwd: ROOT,
  shell: true,
  stdio: "inherit",
  env: { ...process.env, GIT_REPO_DIRECTORY: ROOT, PORT: "8081" },
});
decap.on("exit", (kod) => { if (kod) console.error("Panel sunucusu kapandı (kod " + kod + ")."); });
process.on("exit", () => decap.kill());
process.on("SIGINT", () => process.exit());

require("./serve");
setTimeout(() => console.log("\nYönetim paneli: http://localhost:4321/admin/  →  \"Giriş yap\" düğmesine basın.\n"), 1500);
