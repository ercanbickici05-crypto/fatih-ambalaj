// Panelden yüklenen büyük fotoğrafları yayın kopyasında (dist/) küçültür.
// Orijinal dosyalara dokunmaz; dosya adı ve biçimi aynı kalır, bu yüzden
// sayfalardaki bağlantılar değişmez. "sharp" kurulu değilse sessizce atlanır.
const fs = require("fs");
const path = require("path");

const KLASORLER = ["img/urunler", "img/uretim"];
const EN_FAZLA = 1600; // px, uzun kenar
const SINIR_KB = 350; // bundan büyük ya da 1600 px'ten geniş olanlar küçültülür

function sharpYukle() {
  try { return require("sharp"); } catch { return null; }
}

async function gorselleriKucult(dist) {
  const sharp = sharpYukle();
  if (!sharp) return { atlandi: true, kucultulen: [] };
  sharp.cache(false);
  const kucultulen = [];
  for (const k of KLASORLER) {
    const dizin = path.join(dist, k);
    if (!fs.existsSync(dizin)) continue;
    for (const ad of fs.readdirSync(dizin)) {
      const ext = path.extname(ad).toLowerCase();
      if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) continue;
      const dosya = path.join(dizin, ad);
      const once = fs.statSync(dosya).size;
      try {
        // Dosya belleğe okunur; aksi hâlde Windows'ta sharp dosyayı açık tutar ve üzerine yazılamaz.
        const ham = fs.readFileSync(dosya);
        const meta = await sharp(ham).metadata();
        if (once / 1024 <= SINIR_KB && Math.max(meta.width || 0, meta.height || 0) <= EN_FAZLA) continue;
        let is = sharp(ham).rotate().resize({ width: EN_FAZLA, height: EN_FAZLA, fit: "inside", withoutEnlargement: true });
        if (ext === ".png") is = is.png({ compressionLevel: 9, palette: true, quality: 85 });
        else if (ext === ".webp") is = is.webp({ quality: 80 });
        else is = is.jpeg({ quality: 80, mozjpeg: true });
        const tampon = await is.toBuffer();
        if (tampon.length < once) {
          fs.writeFileSync(dosya, tampon);
          kucultulen.push(`${k}/${ad}: ${Math.round(once / 1024)} KB → ${Math.round(tampon.length / 1024)} KB`);
        }
      } catch (e) {
        console.warn(`  • ${k}/${ad} küçültülemedi: ${e.message}`);
      }
    }
  }
  return { atlandi: false, kucultulen };
}

module.exports = { gorselleriKucult, sharpVar: () => !!sharpYukle() };
