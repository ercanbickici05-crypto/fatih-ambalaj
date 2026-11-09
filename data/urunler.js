// =====================================================================
//  ÜRÜNLER VE KATEGORİLER
//
//  Ürünler content/urunler/ klasöründe, her biri ayrı bir .json dosyası
//  olarak duruyor; kategoriler content/kategoriler.json dosyasında.
//  İkisi de yönetim panelinden (/admin/) düzenleniyor. Bu dosya yalnızca
//  o dosyaları okuyup siteye hazırlar; burada değişiklik yapmanız gerekmez.
//
//  Ürünler "sira" değerine göre (küçükten büyüğe) listelenir.
// =====================================================================

const fs = require("fs");
const path = require("path");

const CONTENT = path.join(__dirname, "..", "content");
const oku = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const liste = (x) => (Array.isArray(x) ? x.map((s) => String(s || "").trim()).filter(Boolean) : []);

const kategoriler = (oku(path.join(CONTENT, "kategoriler.json")).kategoriler || []).filter((k) => k && k.slug && k.ad);

const klasor = path.join(CONTENT, "urunler");
const urunler = fs
  .readdirSync(klasor)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const u = oku(path.join(klasor, f));
    const oz = u.ozellikler || {};
    return {
      ...u,
      slug: String(u.slug || path.basename(f, ".json")).trim(),
      sira: Number(u.sira) || 999,
      aciklama: liste(u.aciklama),
      kullanimAlanlari: liste(u.kullanimAlanlari),
      ozellikler: { olcu: liste(oz.olcu), malzeme: liste(oz.malzeme), baski: liste(oz.baski) },
      gorseller: (u.gorseller || []).filter((g) => g && g.src).map((g) => ({ src: g.src, alt: g.alt || "" })),
      ilgili: liste(u.ilgili),
    };
  })
  .filter((u) => u.yayinda !== false)
  .sort((a, b) => a.sira - b.sira || a.ad.localeCompare(b.ad, "tr"));

module.exports = { kategoriler, urunler };
