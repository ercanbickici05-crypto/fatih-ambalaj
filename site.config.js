// =====================================================================
//  FATİH AMBALAJ — FİRMA AYARLARI
//
//  Ayarlar artık content/ayarlar.json dosyasında duruyor ve yönetim
//  panelinden (/admin/) düzenleniyor. Bu dosya yalnızca o dosyayı okur;
//  burada değişiklik yapmanız gerekmez.
//
//  Boş bırakılan alanlar sitede hiç gösterilmez; bozuk bağlantı oluşmaz.
// =====================================================================

const fs = require("fs");
const path = require("path");

const ham = JSON.parse(fs.readFileSync(path.join(__dirname, "content", "ayarlar.json"), "utf8"));

// Panel boş görsel alanlarını { src: "" } ya da hiç yazmayabilir; hepsini aynı biçime getir.
const gorsel = (g) => (g && g.src ? { src: g.src, alt: g.alt || "" } : null);

module.exports = {
  ...ham,
  kurulusYili: Number(ham.kurulusYili) || 2000,
  iletisim: { ...(ham.iletisim || {}) },
  anaSayfaGorseli: gorsel(ham.anaSayfaGorseli),
  baskiGorseli: gorsel(ham.baskiGorseli),
  uretimFotograflari: (ham.uretimFotograflari || []).map(gorsel).filter(Boolean),
};
