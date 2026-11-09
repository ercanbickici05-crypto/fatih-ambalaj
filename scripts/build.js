// =====================================================================
//  Fatih Ambalaj — statik site derleyicisi (bağımlılık yok)
//  Kullanım:  npm run build   → dist/ klasörüne siteyi üretir
//  Sayfa metinleri bu dosyadaki "SAYFALAR" bölümündedir.
// =====================================================================
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { gorselleriKucult, sharpVar } = require("./gorsel");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

// ---------------------------------------------------------------------
//  Yardımcılar
// ---------------------------------------------------------------------
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const digits = (s) => String(s || "").replace(/\D/g, "");

function normalizeTr(no) {
  let d = digits(no);
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "90" + d.slice(1);
  if (d.length === 10) d = "90" + d;
  return d.length >= 11 ? d : "";
}

const waUrl = (no, msg) => `https://wa.me/${no}?text=${encodeURIComponent(msg)}`;

function loadInputs() {
  for (const k of Object.keys(require.cache)) {
    if (k.startsWith(path.join(ROOT, "site.config.js")) || k.startsWith(path.join(ROOT, "data"))) delete require.cache[k];
  }
  const cfg = require(path.join(ROOT, "site.config.js"));
  const data = require(path.join(ROOT, "data", "urunler.js"));
  return { cfg, data };
}

const icon = {
  wa: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>',
  tel: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z"/></svg>',
  mail: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></g></svg>',
  pin: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></g></svg>',
  ig: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></g></svg>',
  clock: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g></svg>',
  arrow: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6"/></svg>',
  map: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14"/></svg>',
};

// ---------------------------------------------------------------------
//  Bağlam: ayarlar + türetilmiş değerler + uyarılar
// ---------------------------------------------------------------------
function makeCtx({ cfg, data }) {
  const uyarilar = [];
  const il = cfg.iletisim || {};
  // Yalnızca test için: FA_TEST_WHATSAPP / FA_TEST_SITE_URL ortam değişkenleri
  const waRaw = process.env.FA_TEST_WHATSAPP || il.whatsapp;
  const wa = normalizeTr(waRaw);
  if (waRaw && !wa) uyarilar.push(`WhatsApp numarası geçersiz görünüyor: "${waRaw}"`);
  const telNo = normalizeTr(il.telefon);
  const siteUrl = String(process.env.FA_TEST_SITE_URL || cfg.siteUrl || "").replace(/\/+$/, "");
  const instagram = String(il.instagram || "").replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
  const harita = /^https?:\/\//.test(il.haritaLinki || "") ? il.haritaLinki : "";
  if (il.haritaLinki && !harita) uyarilar.push("Harita bağlantısı http(s):// ile başlamalı.");

  if (!wa) uyarilar.push("WhatsApp numarası girilmedi (site.config.js → iletisim.whatsapp). WhatsApp butonları gizlendi, teklifler iletişim formuna yönlendiriliyor.");
  if (!il.telefon) uyarilar.push("Telefon girilmedi (iletisim.telefon). \"Ara\" butonları gizlendi.");
  if (!il.adres) uyarilar.push("Açık adres girilmedi (iletisim.adres).");
  if (!harita) uyarilar.push("Harita bağlantısı girilmedi (iletisim.haritaLinki).");
  if (!il.eposta) uyarilar.push("E-posta girilmedi (iletisim.eposta).");
  if (!instagram) uyarilar.push("Instagram hesabı girilmedi (iletisim.instagram).");
  if (!siteUrl) uyarilar.push("siteUrl girilmedi: sitemap.xml ve canonical adresler oluşturulmadı.");
  if (!cfg.logo) uyarilar.push("Logo eklenmedi; firma adı tipografik olarak gösteriliyor.");
  if (!(cfg.uretimFotograflari || []).length) uyarilar.push("Üretim fotoğrafı eklenmedi; ana sayfadaki \"Üretimden\" bölümü gizlendi.");
  if (!(cfg.anaSayfaGorseli && cfg.anaSayfaGorseli.src)) uyarilar.push("Ana sayfa görseli eklenmedi (anaSayfaGorseli); ilk ekran yalnızca metinle gösteriliyor.");

  const kats = data.kategoriler;
  const urunler = data.urunler.map((u) => ({ ...u, kat: kats.find((k) => k.slug === u.kategori) }));
  const fotosuz = urunler.filter((u) => !(u.gorseller || []).length).map((u) => u.ad);
  if (fotosuz.length) uyarilar.push(`${fotosuz.length} üründe fotoğraf yok (yalnızca ürün adı gösteriliyor): ${fotosuz.join(", ")}`);
  urunler.forEach((u) => {
    if (!u.kat) uyarilar.push(`"${u.ad}" ürününün kategorisi bulunamadı: ${u.kategori}`);
    if (!/^[a-z0-9-]+$/.test(u.slug)) uyarilar.push(`"${u.ad}" slug'ı yalnızca küçük harf, rakam ve "-" içermeli: ${u.slug}`);
  });

  // Görsel dosyalarını kontrol et
  const gorselKontrol = (g, nerede) => {
    if (!g || !g.src) return;
    if (!g.alt) uyarilar.push(`${nerede}: "${g.src}" için alt metin (alt) yazılmalı.`);
    if (/^https?:/.test(g.src)) return;
    const p = path.join(ROOT, "public", g.src);
    if (!fs.existsSync(p)) return uyarilar.push(`${nerede}: görsel bulunamadı → public${g.src}`);
    const kb = fs.statSync(p).size / 1024;
    if (kb > 400 && !sharpVar()) uyarilar.push(`${nerede}: "${g.src}" ${Math.round(kb)} KB. Hızlı açılış için 1600 px genişlikte WebP olarak ~300 KB altına indirin.`);
  };
  urunler.forEach((u) => (u.gorseller || []).forEach((g) => gorselKontrol(g, u.ad)));
  (cfg.uretimFotograflari || []).forEach((g) => gorselKontrol(g, "Üretim fotoğrafı"));
  if (cfg.anaSayfaGorseli) gorselKontrol(cfg.anaSayfaGorseli, "Ana sayfa görseli");
  if (cfg.logo && !/^https?:/.test(cfg.logo) && !fs.existsSync(path.join(ROOT, "public", cfg.logo)))
    uyarilar.push(`Logo bulunamadı → public${cfg.logo}`);

  const firma = cfg.firmaAdi;
  return {
    cfg, il, wa, telNo, siteUrl, instagram, harita, kats, urunler, uyarilar, firma,
    selam: `Merhaba, ${firma}'dan teklif almak istiyorum.`,
    yil: new Date().getFullYear(),
  };
}

// WhatsApp butonu; numara yoksa teklif formuna giden çalışan bir bağlantı üretir.
function ctaTeklif(ctx, { mesaj, sinif = "btn btn-accent", etiket, yedekHref = "/iletisim/#teklif" } = {}) {
  if (ctx.wa) {
    return `<a class="${sinif}" href="${esc(waUrl(ctx.wa, mesaj || ctx.selam))}" target="_blank" rel="noopener">${icon.wa}<span>${esc(etiket || "WhatsApp'tan Teklif Al")}</span></a>`;
  }
  return `<a class="${sinif}" href="${esc(yedekHref)}"><span>${esc(etiket ? etiket.replace(/WhatsApp'tan /, "") : "Teklif Al")}</span>${icon.arrow}</a>`;
}

// Özel baskı bölümlerinin görseli: ayardaki baskiGorseli, yoksa fotoğrafı olan ilk baskılı ürün.
function baskiGorseli(ctx) {
  const b = ctx.cfg.baskiGorseli;
  if (b && b.src) return b;
  const sira = ["pizza-kutusu", "pide-kutusu", "kese-kagidi", "kraft-canta"];
  for (const s of sira) {
    const u = ctx.urunler.find((x) => x.slug === s);
    const g = u && gorseller(u)[0];
    if (g) return g;
  }
  return null;
}

const urunMesaj = (ctx, u) => `${ctx.selam}\nÜrün: ${u.ad}`;

function gorseller(u) {
  return (u.gorseller || []).filter((g) => g && g.src).map((g) => ({ src: g.src, alt: g.alt || u.ad }));
}

// Fotoğraf varsa gösterir; yoksa görsel kullanmadan, yalnızca ürün adıyla sade bir kraft alanı çizer.
function media(g, { eager = false, sinif = "media", ad = "" } = {}) {
  if (!g) return `<div class="${sinif} media-bos" aria-hidden="true"><span>${esc(ad)}</span></div>`;
  return `<div class="${sinif}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="${eager ? "eager" : "lazy"}" decoding="async"${eager ? ' fetchpriority="high"' : ""}></div>`;
}

// ---------------------------------------------------------------------
//  Ortak parçalar
// ---------------------------------------------------------------------
function logoHtml(ctx, { acik = false } = {}) {
  const src = acik ? ctx.cfg.logoAcik || "" : ctx.cfg.logo;
  if (src) return `<img class="logo-img" src="${esc(src)}" alt="${esc(ctx.firma)}" width="345" height="240">`;
  const [a, ...b] = ctx.firma.split(" ");
  return `<span class="wordmark"><span class="wm-1">${esc(a)}</span><span class="wm-2">${esc(b.join(" "))}</span></span>`;
}

const NAV = [
  ["/", "Ana Sayfa", "anasayfa"],
  ["/urunler/", "Ürünler", "urunler"],
  ["/ozel-baskili-ambalaj/", "Özel Baskı", "baski"],
  ["/hakkimizda/", "Hakkımızda", "hakkimizda"],
  ["/iletisim/", "İletişim", "iletisim"],
];

function header(ctx, aktif) {
  const links = NAV.map(
    ([href, ad, key]) => `<li><a href="${href}"${key === aktif ? ' aria-current="page"' : ""}>${ad}</a></li>`
  ).join("");
  return `<a class="skip" href="#icerik">İçeriğe geç</a>
<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="/" aria-label="${esc(ctx.firma)} ana sayfa">${logoHtml(ctx)}</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-menu"><span class="bars" aria-hidden="true"></span><span class="sr">Menüyü aç</span></button>
    <nav class="site-menu" id="site-menu" aria-label="Ana menü"><ul>${links}</ul></nav>
    ${ctaTeklif(ctx, { sinif: "btn btn-accent btn-sm header-cta" })}
  </div>
</header>`;
}

function iletisimListesi(ctx, { sinif = "contact-list" } = {}) {
  const il = ctx.il;
  const li = [];
  if (il.telefon || il.telefon2) {
    const tel = (no) => `<a href="tel:+${normalizeTr(no) || digits(no)}">${esc(no)}</a>`;
    li.push(`<li>${icon.tel}<div><span class="lbl">Telefon</span>${[il.telefon, il.telefon2].filter(Boolean).map(tel).join('<span class="tel-ayrac"> · </span>')}</div></li>`);
  }
  if (ctx.wa) li.push(`<li>${icon.wa}<div><span class="lbl">WhatsApp</span><a href="${esc(waUrl(ctx.wa, ctx.selam))}" target="_blank" rel="noopener">WhatsApp'tan yazın</a></div></li>`);
  if (il.eposta) li.push(`<li>${icon.mail}<div><span class="lbl">E-posta</span><a href="mailto:${esc(il.eposta)}">${esc(il.eposta)}</a></div></li>`);
  const fabrikaHarita = /^https?:\/\//.test(il.fabrikaHaritaLinki || "") ? il.fabrikaHaritaLinki : "";
  const ikiKonum = fabrikaHarita || il.fabrikaAdres;
  if (il.adres || ctx.harita) {
    li.push(`<li>${icon.pin}<div><span class="lbl">${ikiKonum ? "Dükkân" : "Adres"}</span>${il.adres ? `<address>${esc(il.adres)}</address>` : ""}${
      ctx.harita ? `<a class="map-link" href="${esc(ctx.harita)}" target="_blank" rel="noopener">${icon.map}Yol tarifi al</a>` : ""
    }</div></li>`);
  }
  if (ikiKonum) {
    li.push(`<li>${icon.pin}<div><span class="lbl">Fabrika</span>${il.fabrikaAdres ? `<address>${esc(il.fabrikaAdres)}</address>` : ""}${
      fabrikaHarita ? `<a class="map-link" href="${esc(fabrikaHarita)}" target="_blank" rel="noopener">${icon.map}Haritada aç</a>` : ""
    }</div></li>`);
  }
  if (ctx.instagram) li.push(`<li>${icon.ig}<div><span class="lbl">Instagram</span><a href="https://www.instagram.com/${esc(ctx.instagram)}/" target="_blank" rel="noopener">@${esc(ctx.instagram)}</a></div></li>`);
  if (il.calismaSaatleri) li.push(`<li>${icon.clock}<div><span class="lbl">Çalışma saatleri</span>${esc(il.calismaSaatleri)}</div></li>`);
  return li.length ? `<ul class="${sinif}">${li.join("")}</ul>` : "";
}

function footer(ctx) {
  const kat = ctx.kats.map((k) => `<li><a href="/urunler/?kategori=${k.slug}">${esc(k.ad)}</a></li>`).join("");
  const iletisim = iletisimListesi(ctx, { sinif: "foot-contact" });
  return `<footer class="site-footer">
  <div class="wrap foot-grid">
    <div class="foot-brand">
      <a class="brand brand-light" href="/" aria-label="${esc(ctx.firma)} ana sayfa">${logoHtml(ctx, { acik: true })}</a>
      <p>${ctx.cfg.kurulusYili}'den bu yana ${esc(ctx.cfg.sehir)}'da koli, kutu, kâğıt ve kese kâğıdı üretimi.</p>
      <p class="muted">Hizmet bölgesi: ${esc(ctx.cfg.hizmetBolgesi)}</p>
    </div>
    <div><h2 class="foot-h">Ürünler</h2><ul class="foot-links">${kat}</ul></div>
    <div><h2 class="foot-h">Kurumsal</h2><ul class="foot-links">${NAV.slice(1).map(([h, a]) => `<li><a href="${h}">${a}</a></li>`).join("")}</ul></div>
    <div><h2 class="foot-h">İletişim</h2>${iletisim || `<p><a href="/iletisim/#teklif">Teklif formu</a></p>`}</div>
  </div>
  <div class="wrap foot-bottom"><span>© ${ctx.yil} ${esc(ctx.firma)}</span><span>Fiyat ve üretim seçenekleri için teklif alınız.</span></div>
</footer>`;
}

function mobilBar(ctx, mesaj) {
  const a = [];
  if (ctx.il.telefon) a.push(`<a class="mb-call" href="tel:+${ctx.telNo || digits(ctx.il.telefon)}">${icon.tel}<span>Ara</span></a>`);
  if (ctx.wa) a.push(`<a class="mb-quote" href="${esc(waUrl(ctx.wa, mesaj || ctx.selam))}" target="_blank" rel="noopener">${icon.wa}<span>Teklif Al</span></a>`);
  else a.push(`<a class="mb-quote" href="/iletisim/#teklif">${icon.arrow}<span>Teklif Al</span></a>`);
  return `<nav class="mobilbar" aria-label="Hızlı iletişim">${a.join("")}</nav>`;
}

function waFloat(ctx, mesaj) {
  if (!ctx.wa) return "";
  return `<a class="wa-float" href="${esc(waUrl(ctx.wa, mesaj || ctx.selam))}" target="_blank" rel="noopener" aria-label="WhatsApp'tan teklif isteyin">${icon.wa}<span class="wa-float-txt">Teklif Al</span></a>`;
}

function isletmeJsonLd(ctx) {
  const il = ctx.il;
  const d = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: ctx.firma,
    foundingDate: String(ctx.cfg.kurulusYili),
    address: { "@type": "PostalAddress", addressLocality: ctx.cfg.sehir, addressCountry: "TR" },
    areaServed: ctx.cfg.hizmetBolgesi,
    description: `${ctx.cfg.kurulusYili}'den bu yana ${ctx.cfg.sehir}'da koli, kutu, kâğıt ve kese kâğıdı üretimi.`,
  };
  if (il.adres) d.address.streetAddress = il.adres;
  if (ctx.siteUrl) d.url = ctx.siteUrl + "/";
  if (il.telefon) d.telephone = "+" + (ctx.telNo || digits(il.telefon));  if (il.eposta) d.email = il.eposta;
  if (ctx.cfg.logo && ctx.siteUrl) d.logo = ctx.siteUrl + ctx.cfg.logo;
  if (ctx.instagram) d.sameAs = [`https://www.instagram.com/${ctx.instagram}/`];
  if (ctx.harita) d.hasMap = ctx.harita;
  if (il.konum && il.konum.enlem && il.konum.boylam) d.geo = { "@type": "GeoCoordinates", latitude: il.konum.enlem, longitude: il.konum.boylam };
  return d;
}

function layout(ctx, p) {
  const title = p.tamBaslik || `${p.baslik} | ${ctx.firma}`;
  const canonical = ctx.siteUrl ? ctx.siteUrl + p.yol : "";
  const ld = (p.jsonld || []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("\n");
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(p.aciklama)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
${p.noindex ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:type" content="website">
<meta property="og:locale" content="tr_TR">
<meta property="og:site_name" content="${esc(ctx.firma)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(p.aciklama)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ""}
${p.ogImage && ctx.siteUrl && !/\.svg$/.test(p.ogImage) ? `<meta property="og:image" content="${esc(ctx.siteUrl + p.ogImage)}">` : ""}
<meta name="theme-color" content="#2b2c2e">
${ctx.cfg.favicon ? `<link rel="icon" href="${esc(ctx.cfg.favicon)}" type="image/png">\n<link rel="apple-touch-icon" href="${esc(ctx.cfg.favicon)}">` : '<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">'}
<link rel="stylesheet" href="/assets/css/site.css?v=${ctx.v.css}">
${ld}
</head>
<body data-wa="${esc(ctx.wa)}" data-firma="${esc(ctx.firma)}" data-eposta="${esc(ctx.il.eposta || "")}" data-tel="${esc(ctx.il.telefon || "")}" data-telno="${esc(ctx.telNo)}">
${header(ctx, p.aktif)}
<main id="icerik">
${p.govde}
</main>
${footer(ctx)}
${waFloat(ctx, p.waMesaj)}
${mobilBar(ctx, p.waMesaj)}
<script src="/assets/js/site.js?v=${ctx.v.js}" defer></script>
</body>
</html>
`;
}

// Teklif formu. urun verilirse ürün sabittir (ürün detay sayfası).
function teklifFormu(ctx, { id, urun = null, baslik = true } = {}) {
  const f = (n) => `${id}-${n}`;
  const urunAlan = urun
    ? `<input type="hidden" name="urun" value="${esc(urun.ad)}">
       <p class="form-fixed"><span class="lbl">Ürün</span><strong>${esc(urun.ad)}</strong></p>`
    : `<div class="field">
        <label for="${f("urun")}">Ürün türü <span class="req" aria-hidden="true">*</span></label>
        <select id="${f("urun")}" name="urun" required aria-describedby="${f("urun-err")}">
          <option value="">Seçiniz</option>
          ${ctx.kats
            .map((k) => {
              const us = ctx.urunler.filter((u) => u.kategori === k.slug);
              return us.length ? `<optgroup label="${esc(k.ad)}">${us.map((u) => `<option>${esc(u.ad)}</option>`).join("")}</optgroup>` : "";
            })
            .join("")}
          <option>Diğer / birden fazla ürün</option>
        </select>
        <p class="err" id="${f("urun-err")}" hidden></p>
      </div>`;
  const submitTxt = ctx.wa ? "Talebi WhatsApp'ta Aç" : "Talep Mesajını Hazırla";
  return `<form class="quote-form" id="${id}" novalidate data-quote-form>
  ${baslik ? `<p class="form-note">Zorunlu alanlar <span class="req" aria-hidden="true">*</span> ile işaretlidir.</p>` : ""}
  <div class="grid-2">
    <div class="field">
      <label for="${f("ad")}">Ad soyad <span class="req" aria-hidden="true">*</span></label>
      <input id="${f("ad")}" name="ad" type="text" autocomplete="name" maxlength="80" required aria-describedby="${f("ad-err")}">
      <p class="err" id="${f("ad-err")}" hidden></p>
    </div>
    <div class="field">
      <label for="${f("isletme")}">İşletme adı</label>
      <input id="${f("isletme")}" name="isletme" type="text" autocomplete="organization" maxlength="100">
    </div>
  </div>
  ${urunAlan}
  <div class="grid-2">
    <div class="field">
      <label for="${f("adet")}">Talep edilen adet <span class="req" aria-hidden="true">*</span></label>
      <input id="${f("adet")}" name="adet" type="text" inputmode="numeric" maxlength="40" placeholder="Örn: 1000" required aria-describedby="${f("adet-ipucu")} ${f("adet-err")}">
      <p class="hint" id="${f("adet-ipucu")}">Minimum adet ürüne ve baskı türüne göre değişir.</p>
      <p class="err" id="${f("adet-err")}" hidden></p>
    </div>
    <div class="field">
      <label for="${f("olcu")}">Ölçü</label>
      <input id="${f("olcu")}" name="olcu" type="text" maxlength="80" placeholder="Örn: 32 x 32 cm" aria-describedby="${f("olcu-ipucu")}">
      <p class="hint" id="${f("olcu-ipucu")}">Bilmiyorsanız boş bırakın, birlikte belirleyelim.</p>
    </div>
  </div>
  <fieldset class="field choice">
    <legend>Baskı tercihi</legend>
    <div class="choices">
      <label><input type="radio" name="baski" value="Baskılı"> <span>Baskılı</span></label>
      <label><input type="radio" name="baski" value="Baskısız"> <span>Baskısız</span></label>
      <label><input type="radio" name="baski" value="Henüz karar vermedim"> <span>Karar vermedim</span></label>
    </div>
  </fieldset>
  <div class="field">
    <label for="${f("aciklama")}">${urun ? "İstenen özellikler / ek açıklama" : "Ek açıklama"}</label>
    <textarea id="${f("aciklama")}" name="aciklama" rows="4" maxlength="600" placeholder="Malzeme, renk, logo, teslim zamanı gibi eklemek istedikleriniz"></textarea>
  </div>
  <button class="btn btn-accent btn-block" type="submit">${ctx.wa ? icon.wa : ""}<span>${submitTxt}</span></button>
  <p class="form-after">${
    ctx.wa
      ? "Mesajınız WhatsApp'ta hazır olarak açılır; talebinizin bize ulaşması için WhatsApp'ta göndermeniz yeterli."
      : "Mesajınız hazırlanır; kopyalayıp bize iletebilirsiniz."
  }</p>
  <div class="form-status" role="status" aria-live="polite" tabindex="-1" hidden></div>
</form>`;
}

function urunKarti(ctx, u, { h = "h3" } = {}) {
  const g = gorseller(u)[0];
  const href = `/urunler/${u.slug}/`;
  return `<article class="card" data-kategori="${u.kategori}">
  <a class="card-media" href="${href}" tabindex="-1" aria-hidden="true">${media(g, { ad: u.ad })}</a>
  <div class="card-body">
    <p class="card-kat">${esc(u.kat ? u.kat.ad : "")}</p>
    <${h} class="card-title"><a href="${href}">${esc(u.ad)}</a></${h}>
    <p class="card-text">${esc(u.kisaAciklama)}</p>
    <div class="card-actions">
      <a class="btn btn-ghost btn-sm" href="${href}">Ürünü İncele</a>
      ${ctaTeklif(ctx, { mesaj: urunMesaj(ctx, u), sinif: "btn btn-accent btn-sm", etiket: "Teklif Al", yedekHref: `${href}#teklif` })}
    </div>
  </div>
</article>`;
}

const crop = '<span class="crop tl" aria-hidden="true"></span><span class="crop tr" aria-hidden="true"></span><span class="crop bl" aria-hidden="true"></span><span class="crop br" aria-hidden="true"></span>';

function secHead({ eyebrow, h2, p, id }) {
  return `<div class="sec-head">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}<h2${id ? ` id="${id}"` : ""}>${h2}</h2>${p ? `<p class="sec-lead">${p}</p>` : ""}</div>`;
}

const SEKTORLER = [
  ["Pide ve lahmacun salonları", "Pide ve lahmacun kutuları, ayran viyolü, sarma kâğıdı"],
  ["Pizzacılar", "Pizza kutuları ve paket servis ambalajları"],
  ["Restoranlar", "Kutular, kraft çantalar ve ambalaj kâğıtları"],
  ["Kafeler", "Kese kâğıtları, kraft çantalar, sarma kâğıtları"],
  ["Pastaneler", "Karton koliler, kese kâğıtları, kraft çantalar"],
  ["Fırınlar", "Kese kâğıtları ve ambalaj kâğıtları"],
  ["Perakende işletmeleri", "Koliler, kraft çantalar ve baskılı ambalajlar"],
];

const BASKI_ADIMLARI = [
  ["Ürünü seçin", "Kutu, kese kâğıdı ya da ambalaj kâğıdı; ihtiyacınıza uygun ürünü belirleyin."],
  ["Ölçü ve adedi belirtin", "Yaklaşık ölçü ve adet yeterli. Emin değilseniz birlikte karar veririz."],
  ["Logonuzu paylaşın", "Logonuzu veya tasarımınızı WhatsApp üzerinden bize gönderin."],
  ["Detayları netleştirelim", "Teklif, baskı ve üretim detaylarını sizinle birlikte netleştirelim."],
];

// Ana sayfa: kaydırdıkça ürünlerin araca yüklendiği bölüm (davranış: assets/js/site.js → "Yükleme sahnesi")
const YUKLER = [
  ["koli.webp", "Logolu karton koli"],
  ["pide-kutusu.webp", "Baskılı pide kutusu"],
  ["kese.webp", "Logolu kraft kese kâğıdı"],
  ["koruklu-kese.webp", "Logolu kese kâğıdı"],
  ["pizza-kutusu.webp", "Baskılı pizza kutusu"],
  ["koli.webp", "Logolu karton koli"],
];
function yuklemeBolumu(ctx) {
  if (!fs.existsSync(path.join(ROOT, "public", "img", "yukleme", "arac.webp"))) return "";
  return `<section class="yukleme" id="yukleme" aria-labelledby="yukleme-baslik" data-yukleme>
  <div class="yk-sahne">
    <div class="yk-duvar" aria-hidden="true"></div>
    <div class="yk-zemin" aria-hidden="true"></div>
    <div class="yk-metin">
      <h2 id="yukleme-baslik">Üretimden aracımıza, aracımızdan işletmenize.</h2>
      <ol class="yk-adimlar">
        <li data-adim="0">Siparişiniz atölyemizde hazırlanır.</li>
        <li data-adim="1">Özenle paketlenip aracımıza yüklenir.</li>
        <li data-adim="2">${esc(ctx.cfg.hizmetBolgesi)} için yola çıkar.</li>
      </ol>
      <div class="yk-cta">${ctaTeklif(ctx, { etiket: "WhatsApp'tan Sipariş Ver", mesaj: `${ctx.selam}\nSipariş vermek istiyorum.` })}</div>
    </div>
    <div class="yk-yukler" aria-hidden="true">${YUKLER.map(([f]) => `<img class="yk-yuk" src="/img/yukleme/${f}" alt="" decoding="async" loading="lazy">`).join("")}</div>
    <img class="yk-arac" src="/img/yukleme/arac.webp" alt="${esc(ctx.firma)} logolu teslimat aracı" width="1600" height="800" decoding="async" loading="lazy">
  </div>
</section>`;
}

// ---------------------------------------------------------------------
//  SAYFALAR
// ---------------------------------------------------------------------
function anaSayfa(ctx) {
  const cfg = ctx.cfg;
  const heroG = cfg.anaSayfaGorseli && cfg.anaSayfaGorseli.src ? cfg.anaSayfaGorseli : null;
  const baskiG = baskiGorseli(ctx);

  const kategoriler = ctx.kats
    .map((k) => {
      const us = ctx.urunler.filter((x) => x.kategori === k.slug);
      if (!us.length) return "";
      const g = us.map((u) => gorseller(u)[0]).find(Boolean);
      return `<li><a class="kat" href="/urunler/?kategori=${k.slug}">${media(g, { sinif: "media kat-media", ad: k.ad })}<span class="kat-name">${esc(k.ad)}</span>${icon.arrow}</a></li>`;
    })
    .join("");

  const fotolar = (cfg.uretimFotograflari || [])
    .filter((g) => g && g.src)
    .map((g) => `<figure class="prod-photo">${media(g)}${g.alt ? `<figcaption>${esc(g.alt)}</figcaption>` : ""}</figure>`);

  const govde = `
<section class="hero kraft">
  <div class="wrap hero-grid${heroG ? "" : " hero-solo"}">
    <div class="hero-text">
      <p class="eyebrow">${cfg.kurulusYili}'den bu yana · ${esc(cfg.sehir)}</p>
      <h1>İşletmenize Özel Ambalaj, <span class="nowrap">Üreticiden Çözüm.</span></h1>
      <p class="lead">${cfg.kurulusYili}’den bu yana ${esc(cfg.sehir)}’da koli, kutu, kâğıt ve kese kâğıdı üretimiyle işletmelerin ambalaj ihtiyaçlarına çözüm sunuyoruz.</p>
      <div class="actions">
        <a class="btn btn-dark" href="/urunler/">Ürünleri İncele</a>
        ${ctaTeklif(ctx)}
      </div>
    </div>
    ${heroG ? `<div class="hero-visual sheet">${crop}<img class="hero-photo" src="${esc(heroG.src)}" alt="${esc(heroG.alt || ctx.firma)}" fetchpriority="high" decoding="async"></div>` : ""}
  </div>
  <div class="wrap">
    <ul class="facts">
      <li><strong>${cfg.kurulusYili}</strong><span>yılından bu yana üretim</span></li>
      <li><strong>Üretici</strong><span>koli, kutu, kâğıt ve kese kâğıdı</span></li>
      <li><strong>Özel baskı</strong><span>işletmenize özel, düşük adetlerle</span></li>
      <li><strong>${esc(cfg.sehir)}</strong><span>ve çevre illere hizmet</span></li>
    </ul>
  </div>
</section>

<section class="section" aria-labelledby="kategoriler">
  <div class="wrap">
    ${secHead({ eyebrow: "Ürün grupları", h2: "Ne üretiyoruz?", id: "kategoriler", p: "Paket servisten mağaza satışına kadar işletmenizin ihtiyaç duyduğu ambalajları üretiyoruz. Bir kategori seçin, ürünleri inceleyin." })}
    <ul class="kat-grid">${kategoriler}</ul>
    <p class="center"><a class="btn btn-ghost" href="/urunler/">Tüm ürünleri gör ${icon.arrow}</a></p>
  </div>
</section>

${yuklemeBolumu(ctx)}

<section class="section dark" aria-labelledby="ozel-baski">
  <div class="wrap split${baskiG ? "" : " split-solo"}">
    <div>
      <p class="eyebrow">İşletmeye özel baskılı ambalaj</p>
      <h2 id="ozel-baski">Logonuz her pakette müşterinizle birlikte gitsin.</h2>
      <p>Uygun kutu, kese kâğıdı ve ambalaj kâğıtlarına işletmenizin logosunu ve tasarımını basıyoruz. Paket servisten tezgâh satışına kadar markanız her ambalajda görünür olur.</p>
      <ul class="ticks">
        <li>Pide, lahmacun ve pizza kutuları</li>
        <li>Kese kâğıtları ve kraft çantalar</li>
        <li>Ambalaj ve sarma kâğıtları</li>
      </ul>
      <div class="actions">
        <a class="btn btn-light" href="/ozel-baskili-ambalaj/">Özel baskı nasıl yapılır?</a>
      </div>
    </div>
    ${baskiG ? `<div class="split-visual sheet sheet-dark">${crop}<img src="${esc(baskiG.src)}" alt="${esc(baskiG.alt)}" loading="lazy" decoding="async"></div>` : ""}
  </div>
</section>

<section class="section lowqty" aria-labelledby="dusuk-adet">
  <div class="wrap lowqty-inner">
    <div class="stamp" aria-hidden="true">DÜŞÜK<br>ADET</div>
    <div>
      <h2 id="dusuk-adet">Düşük adetlerle işletmenize özel baskı.</h2>
      <p>Logolu ambalaj için çok yüksek adetlerle başlamanız gerekmez. Minimum sipariş miktarı ürüne ve baskı türüne göre değişir; ihtiyacınızı yazın, size uygun seçeneği teklif sırasında birlikte netleştirelim.</p>
    </div>
    <div class="lowqty-cta">${ctaTeklif(ctx, { mesaj: `${ctx.selam}\nDüşük adetli özel baskı hakkında bilgi almak istiyorum.` })}</div>
  </div>
</section>

${
  fotolar.length
    ? `<section class="section" aria-labelledby="uretimden">
  <div class="wrap">
    ${secHead({ eyebrow: "Üretim", h2: "Üretimden", id: "uretimden", p: "Koli, kutu, kâğıt ve kese kâğıdını kendi atölyemizde üretiyoruz. Baskıdan sevkiyata kadar süreci yakından takip ediyoruz." })}
    <div class="prod-grid">${fotolar.join("")}</div>
  </div>
</section>`
    : ""
}

<section class="section soft" aria-labelledby="sektorler">
  <div class="wrap">
    ${secHead({ eyebrow: "Sektörler", h2: "Kimler için üretiyoruz?", id: "sektorler" })}
    <ul class="sector-grid">${SEKTORLER.map(([a, b], i) => `<li><span class="num">${String(i + 1).padStart(2, "0")}</span><h3>${a}</h3><p>${b}</p></li>`).join("")}</ul>
  </div>
</section>

<section class="section" aria-labelledby="hakkimizda-kisa">
  <div class="wrap about-short">
    <div class="year" aria-hidden="true">${cfg.kurulusYili}</div>
    <div>
      <p class="eyebrow">Fatih Ambalaj</p>
      <h2 id="hakkimizda-kisa">${cfg.kurulusYili}’den bu yana ${esc(cfg.sehir)}’da ambalaj üretiyoruz.</h2>
      <p>Yalnızca ambalaj satan bir işletme değiliz; koli, kutu, kâğıt ve kese kâğıdı alanlarında üretim yapıyoruz. Gelişen makine parkurumuzla işletmelerin ihtiyacına uygun, işletmeye özel ambalaj çözümleri sunuyoruz.</p>
      <a class="link-arrow" href="/hakkimizda/">Hakkımızda ${icon.arrow}</a>
    </div>
  </div>
</section>

<section class="section kraft" id="teklif" aria-labelledby="teklif-baslik">
  <div class="wrap quote-wrap">
    <div class="quote-side">
      <p class="eyebrow">Teklif</p>
      <h2 id="teklif-baslik">Kolay teklif alın</h2>
      <p>Formu doldurun; talebiniz düzenli bir mesaj olarak ${ctx.wa ? "WhatsApp'ta açılsın, göndermeniz yeterli" : "hazırlansın"}. Fiyat ve üretim seçeneklerini size özel olarak iletelim.</p>
      ${iletisimListesi(ctx)}
    </div>
    <div class="quote-card">${teklifFormu(ctx, { id: "teklif-ana" })}</div>
  </div>
</section>`;

  return layout(ctx, {
    yol: "/",
    aktif: "anasayfa",
    tamBaslik: `${ctx.firma} | ${cfg.sehir} Ambalaj Üreticisi – Koli, Kutu, Kese Kâğıdı`,
    aciklama: `${cfg.kurulusYili}'den bu yana ${cfg.sehir}'da koli, kutu, kâğıt ve kese kâğıdı üretimi. Pide kutusu, pizza kutusu ve baskılı kese kâğıdı için WhatsApp'tan teklif alın.`,
    jsonld: [isletmeJsonLd(ctx)],
    govde,
  });
}

function urunlerSayfasi(ctx) {
  const chips = [`<li><a class="chip" href="/urunler/" data-filter="" aria-current="true">Tümü</a></li>`]
    .concat(ctx.kats.map((k) => `<li><a class="chip" href="/urunler/?kategori=${k.slug}" data-filter="${k.slug}">${esc(k.ad)}</a></li>`))
    .join("");
  const govde = `
<section class="page-head kraft">
  <div class="wrap">
    <nav class="crumbs" aria-label="Sayfa yolu"><ol><li><a href="/">Ana Sayfa</a></li><li aria-current="page">Ürünler</li></ol></nav>
    <h1>Ürünlerimiz</h1>
    <p class="lead">Pide ve lahmacun kutularından pizza kutularına, kolilerden baskılı kese kâğıtlarına kadar ${esc(ctx.cfg.sehir)}’da ürettiğimiz ambalajlar. Fiyat ve üretim seçenekleri için teklif alınız.</p>
  </div>
</section>
<section class="section section-tight">
  <div class="wrap">
    <nav class="filters" aria-label="Kategori filtresi"><ul>${chips}</ul></nav>
    <p class="filter-count" id="filtre-sonuc" role="status" aria-live="polite">${ctx.urunler.length} ürün listeleniyor</p>
    <div class="card-grid" id="urun-listesi">${ctx.urunler.map((u) => urunKarti(ctx, u, { h: "h2" })).join("")}</div>
    <div class="note-box">
      <p><strong>Aradığınız ürünü bulamadınız mı?</strong> İhtiyacınızı yazın; işletmenize uygun ambalajı birlikte belirleyelim.</p>
      ${ctaTeklif(ctx, { mesaj: `${ctx.selam}\nListede olmayan bir ürün için bilgi almak istiyorum.` })}
    </div>
  </div>
</section>`;
  return layout(ctx, {
    yol: "/urunler/",
    aktif: "urunler",
    baslik: "Ürünler – Pide Kutusu, Pizza Kutusu, Koli ve Kese Kâğıdı",
    aciklama: `${ctx.cfg.sehir}'da üretilen pide ve lahmacun kutuları, pizza kutuları, karton koli, baskılı kese kâğıdı, kraft çanta ve ambalaj kâğıtları. Teklif alın.`,
    govde,
  });
}

function ilgiliUrunler(ctx, u) {
  let list = (u.ilgili || []).map((s) => ctx.urunler.find((x) => x.slug === s)).filter(Boolean);
  if (!list.length) {
    const skor = (x) =>
      (x.kategori === u.kategori ? 10 : 0) + (x.kullanimAlanlari || []).filter((a) => (u.kullanimAlanlari || []).includes(a)).length;
    list = ctx.urunler.filter((x) => x.slug !== u.slug).sort((a, b) => skor(b) - skor(a));
  }
  return list.slice(0, 3);
}

function urunDetay(ctx, u) {
  const gs = gorseller(u);
  const galeri = `<div class="gallery" data-gallery>
    <div class="gallery-main">${media(gs[0], { eager: true, ad: u.ad })}</div>
    ${
      gs.length > 1
        ? `<div class="thumbs" role="group" aria-label="Ürün görselleri">${gs
            .map(
              (g, i) =>
                `<button type="button" class="thumb" data-src="${esc(g.src)}" data-alt="${esc(g.alt)}" aria-label="Görsel ${i + 1}: ${esc(g.alt)}"${i === 0 ? ' aria-current="true"' : ""}><img src="${esc(g.src)}" alt="" loading="lazy" decoding="async"></button>`
            )
            .join("")}</div>`
        : ""
    }
  </div>`;

  const oz = u.ozellikler || {};
  const ozRows = [
    ["Ölçü seçenekleri", oz.olcu],
    ["Malzeme", oz.malzeme],
    ["Baskı seçenekleri", oz.baski],
  ].filter(([, v]) => Array.isArray(v) ? v.length : v);
  const ozHtml = ozRows.length
    ? `<h2>Ürün seçenekleri</h2><dl class="specs">${ozRows
        .map(([k, v]) => `<div><dt>${k}</dt><dd>${(Array.isArray(v) ? v : [v]).map(esc).join(", ")}</dd></div>`)
        .join("")}</dl>`
    : "";

  const ilgili = ilgiliUrunler(ctx, u);
  const jsonld = [];
  if (ctx.siteUrl) {
    jsonld.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: ctx.siteUrl + "/" },
        { "@type": "ListItem", position: 2, name: "Ürünler", item: ctx.siteUrl + "/urunler/" },
        { "@type": "ListItem", position: 3, name: u.ad, item: `${ctx.siteUrl}/urunler/${u.slug}/` },
      ],
    });
  }

  const govde = `
<section class="section product">
  <div class="wrap">
    <nav class="crumbs" aria-label="Sayfa yolu"><ol><li><a href="/">Ana Sayfa</a></li><li><a href="/urunler/">Ürünler</a></li>${
      u.kat ? `<li><a href="/urunler/?kategori=${u.kat.slug}">${esc(u.kat.ad)}</a></li>` : ""
    }<li aria-current="page">${esc(u.ad)}</li></ol></nav>
    <div class="product-grid">
      ${galeri}
      <div class="product-info">
        <p class="eyebrow">${esc(u.kat ? u.kat.ad : "")}</p>
        <h1>${esc(u.ad)}</h1>
        <p class="lead">${esc(u.kisaAciklama)}</p>
        <p class="price-note">Fiyat ve üretim seçenekleri için teklif alınız.</p>
        <div class="actions">
          ${ctaTeklif(ctx, { mesaj: urunMesaj(ctx, u), yedekHref: "#teklif" })}
          <a class="btn btn-ghost" href="#teklif">Teklif formunu doldur</a>
        </div>
        ${ctx.il.telefon ? `<p class="call-line">${icon.tel} Telefonla bilgi için: <a href="tel:+${ctx.telNo || digits(ctx.il.telefon)}">${esc(ctx.il.telefon)}</a></p>` : ""}
      </div>
    </div>

    <div class="product-detail">
      <div class="prose">
        <h2>Ürün hakkında</h2>
        ${(u.aciklama || []).map((p) => `<p>${esc(p)}</p>`).join("")}
        ${(u.kullanimAlanlari || []).length ? `<h2>Kullanım alanları</h2><ul class="ticks">${u.kullanimAlanlari.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
        ${ozHtml}
        <p class="muted small">Ölçü, malzeme, baskı ve minimum adet bilgileri ürüne ve baskı türüne göre değişir; teklif sırasında netleştirilir.</p>
      </div>
      <div class="quote-card" id="teklif">
        <h2 class="quote-title">Bu ürün için teklif isteyin</h2>
        ${teklifFormu(ctx, { id: "teklif-urun", urun: u, baslik: true })}
      </div>
    </div>
  </div>
</section>
${
  ilgili.length
    ? `<section class="section soft" aria-labelledby="ilgili"><div class="wrap">${secHead({ h2: "İlgili ürünler", id: "ilgili" })}<div class="card-grid">${ilgili
        .map((x) => urunKarti(ctx, x))
        .join("")}</div></div></section>`
    : ""
}`;

  return layout(ctx, {
    yol: `/urunler/${u.slug}/`,
    aktif: "urunler",
    baslik: `${u.ad} – ${ctx.cfg.sehir}`,
    aciklama: `${u.kisaAciklama} ${ctx.cfg.sehir}'da üretim. Fiyat ve üretim seçenekleri için ${ctx.firma}'dan teklif alın.`,
    ogImage: gs[0] && gs[0].src,
    waMesaj: urunMesaj(ctx, u),
    jsonld,
    govde,
  });
}

function baskiSayfasi(ctx) {
  const baskiG = baskiGorseli(ctx);
  const uygun = ["pide-lahmacun-kutulari", "pizza-kutulari", "karton-koli-kutular", "kese-kagitlari", "ambalaj-sarma-kagitlari", "kraft-cantalar"]
    .map((s) => ctx.kats.find((k) => k.slug === s))
    .filter(Boolean);
  const govde = `
<section class="page-head dark">
  <div class="wrap split${baskiG ? "" : " split-solo"}">
    <div>
      <nav class="crumbs" aria-label="Sayfa yolu"><ol><li><a href="/">Ana Sayfa</a></li><li aria-current="page">Özel Baskılı Ambalaj</li></ol></nav>
      <h1>Markanızı Ambalajınıza Taşıyın.</h1>
      <p class="lead">İşletmenizin logosunu ve tasarımını uygun kutu, kese kâğıdı ve ambalaj kâğıtlarına basıyoruz. Paket servisten tezgâh satışına kadar markanız her ambalajda müşterinizle buluşur.</p>
      <div class="actions">${ctaTeklif(ctx, { mesaj: `${ctx.selam}\nÖzel baskılı ambalaj hakkında bilgi almak istiyorum.` })}</div>
    </div>
    ${baskiG ? `<div class="split-visual sheet sheet-dark">${crop}<img src="${esc(baskiG.src)}" alt="${esc(baskiG.alt)}" decoding="async"></div>` : ""}
  </div>
</section>

<section class="section" aria-labelledby="adimlar">
  <div class="wrap">
    ${secHead({ eyebrow: "Süreç", h2: "Dört adımda özel baskılı ambalaj", id: "adimlar" })}
    <ol class="steps">${BASKI_ADIMLARI.map(([a, b]) => `<li><h3>${a}</h3><p>${b}</p></li>`).join("")}</ol>
  </div>
</section>

<section class="section lowqty" aria-labelledby="dusuk-adet">
  <div class="wrap lowqty-inner">
    <div class="stamp" aria-hidden="true">DÜŞÜK<br>ADET</div>
    <div>
      <h2 id="dusuk-adet">Düşük adetli baskı seçenekleri</h2>
      <p>Özel baskılı ambalaja düşük adetlerle başlayabilirsiniz. Baskının ürüne uygunluğu ve minimum sipariş adedi ürün ve baskı türüne göre değişir; bu bilgiler teklif sırasında netleşir.</p>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="baskili-urunler">
  <div class="wrap">
    ${secHead({ eyebrow: "Ürünler", h2: "Hangi ürünlere baskı yapılabilir?", id: "baskili-urunler", p: "Baskı uygunluğu ürün bazında değerlendirilir. İncelemek istediğiniz ürün grubunu seçin." })}
    <ul class="pill-list">${uygun.map((k) => `<li><a href="/urunler/?kategori=${k.slug}">${esc(k.ad)} ${icon.arrow}</a></li>`).join("")}</ul>
  </div>
</section>

<section class="section kraft" id="teklif" aria-labelledby="teklif-baslik">
  <div class="wrap quote-wrap">
    <div class="quote-side">
      <p class="eyebrow">Teklif</p>
      <h2 id="teklif-baslik">Baskılı ambalaj için teklif alın</h2>
      <p>Ürünü, yaklaşık adedi ve varsa ölçüyü yazın. Logonuzu ${ctx.wa ? "açılan WhatsApp sohbetinde" : "teklif sürecinde"} bizimle paylaşabilirsiniz.</p>
      ${iletisimListesi(ctx)}
    </div>
    <div class="quote-card">${teklifFormu(ctx, { id: "teklif-baski" })}</div>
  </div>
</section>`;
  return layout(ctx, {
    yol: "/ozel-baskili-ambalaj/",
    aktif: "baski",
    baslik: "Özel Baskılı Ambalaj – Logolu Kutu ve Baskılı Kese Kâğıdı",
    aciklama: `Logonuzu pide kutusu, pizza kutusu, kese kâğıdı ve ambalaj kâğıtlarına basıyoruz. ${ctx.cfg.sehir}'da düşük adetli özel baskı seçenekleri için teklif alın.`,
    govde,
  });
}

function hakkimizdaSayfasi(ctx) {
  const c = ctx.cfg;
  const govde = `
<section class="page-head kraft">
  <div class="wrap">
    <nav class="crumbs" aria-label="Sayfa yolu"><ol><li><a href="/">Ana Sayfa</a></li><li aria-current="page">Hakkımızda</li></ol></nav>
    <h1>Hakkımızda</h1>
  </div>
</section>
<section class="section">
  <div class="wrap about">
    <div class="prose">
      <p>Bir pidecinin tezgâhındaki kutu, fırının rafındaki kese kâğıdı, mağazanın deposundaki koli… Çoğu zaman kimse dönüp bakmaz. Ama ürün müşteriye onların içinde gider. Biz ${c.kurulusYili} yılından beri ${esc(c.sehir)}’da tam olarak bunu üretiyoruz.</p>
      <p>${esc(ctx.firma)}’da koli, kutu, kâğıt ve kese kâğıdı kendi atölyemizde, kendi makinelerimizde üretiliyor. Makine parkurumuzu yıllar içinde adım adım büyüttük. Bugün daha fazla ürünü, daha fazla baskı seçeneğiyle kendi atölyemizde üretebiliyoruz.</p>
      <p>Müşterilerimiz ambalajı her gün kullanan işletmeler: pide ve lahmacun salonları, pizzacılar, restoranlar, kafeler, pastaneler, fırınlar ve perakende işletmeleri. Her birinin ihtiyacı farklı ama beklenti aynı: Ürün müşteriye sağlam, temiz ve düzgün ulaşmalı. Pide kutusunu da, kese kâğıdını da, koliyi de bu beklentiyi karşılayacak şekilde üretiyoruz.</p>
      <p>Logolu ambalaj birçok işletmeye büyük firmalara özgü bir şey gibi gelir. Öyle değil. Uygun ürünlerde düşük adetlerle de baskı yapıyoruz; ölçüyü, adedi ve tasarımı sizinle konuşarak netleştiriyoruz.</p>
      <p>${esc(c.sehir)}’daki atölyemizden ${esc(c.sehir)} ve çevre illerdeki işletmelere ambalaj ulaştırıyoruz. İhtiyacınızı bize yazmanız yeterli: Ürünü, ölçüyü ve adedi birlikte belirleyelim, teklifimizi size özel hazırlayalım.</p>
    </div>
    <aside class="values">
      <div><h2>${c.kurulusYili}</h2><p>${esc(c.sehir)}’da kuruluşumuzdan bu yana ambalaj üretiyoruz.</p></div>
      <div><h2>Kendi atölyemiz</h2><p>Koli, kutu, kâğıt ve kese kâğıdını kendi makinelerimizde üretiyoruz.</p></div>
      <div><h2>Logolu baskı</h2><p>Uygun ürünlerde düşük adetlerle işletmenize özel baskı.</p></div>
    </aside>
  </div>
</section>
<section class="section lowqty">
  <div class="wrap lowqty-inner">
    <div class="stamp stamp-logo" aria-hidden="true">${c.logo ? `<img src="${esc(c.logo)}" alt="" width="345" height="240">` : c.kurulusYili}</div>
    <div><h2>İşletmeniz için doğru ambalajı birlikte belirleyelim.</h2><p>Ürünleri inceleyin ya da ihtiyacınızı doğrudan bize yazın.</p></div>
    <div class="lowqty-cta actions"><a class="btn btn-dark" href="/urunler/">Ürünleri İncele</a>${ctaTeklif(ctx)}</div>
  </div>
</section>`;
  return layout(ctx, {
    yol: "/hakkimizda/",
    aktif: "hakkimizda",
    baslik: `Hakkımızda – ${c.kurulusYili}'den Bu Yana ${c.sehir}'da Ambalaj Üretimi`,
    aciklama: `${ctx.firma}, ${c.kurulusYili} yılında ${c.sehir}'da kuruldu. Koli, kutu, kâğıt ve kese kâğıdı üretimi ve işletmeye özel baskılı ambalaj çözümleri.`,
    govde,
  });
}

function iletisimSayfasi(ctx) {
  const liste = iletisimListesi(ctx);
  const govde = `
<section class="page-head kraft">
  <div class="wrap">
    <nav class="crumbs" aria-label="Sayfa yolu"><ol><li><a href="/">Ana Sayfa</a></li><li aria-current="page">İletişim ve Teklif</li></ol></nav>
    <h1>İletişim ve Teklif</h1>
    <p class="lead">Formu doldurun, talebiniz ${ctx.wa ? "WhatsApp'ta hazır mesaj olarak açılsın" : "düzenli bir mesaj olarak hazırlansın"}. Hizmet bölgemiz: ${esc(ctx.cfg.hizmetBolgesi)}.</p>
  </div>
</section>
<section class="section" id="teklif">
  <div class="wrap quote-wrap">
    <div class="quote-side">
      <h2>Bize ulaşın</h2>
      ${liste || `<p>İletişim bilgilerimiz yakında burada olacak. Teklif formunu kullanarak talebinizi hazırlayabilirsiniz.</p>`}
    </div>
    <div class="quote-card">
      <h2 class="quote-title">Teklif formu</h2>
      ${teklifFormu(ctx, { id: "teklif-iletisim" })}
    </div>
  </div>
</section>`;
  return layout(ctx, {
    yol: "/iletisim/",
    aktif: "iletisim",
    baslik: "İletişim ve Teklif",
    aciklama: `${ctx.firma} iletişim bilgileri ve teklif formu. ${ctx.cfg.sehir} ve çevre illerde koli, kutu ve kese kâğıdı için WhatsApp'tan teklif alın.`,
    jsonld: [isletmeJsonLd(ctx)],
    govde,
  });
}

function sayfa404(ctx) {
  return layout(ctx, {
    yol: "/404.html",
    baslik: "Sayfa bulunamadı",
    aciklama: "Aradığınız sayfa bulunamadı.",
    noindex: true,
    govde: `<section class="section page-404"><div class="wrap center">
      <p class="eyebrow">404</p><h1>Aradığınız sayfa bulunamadı.</h1>
      <p class="lead">Sayfa taşınmış ya da kaldırılmış olabilir.</p>
      <div class="actions center"><a class="btn btn-dark" href="/">Ana Sayfa</a><a class="btn btn-ghost" href="/urunler/">Ürünler</a></div>
    </div></section>`,
  });
}

// ---------------------------------------------------------------------
//  Derleme
// ---------------------------------------------------------------------
function write(rel, content) {
  const p = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

const hash = (p) => crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex").slice(0, 8);

function build({ sessiz = false } = {}) {
  const t0 = Date.now();
  const ctx = makeCtx(loadInputs());
  ctx.v = {
    css: hash(path.join(ROOT, "assets", "css", "site.css")),
    js: hash(path.join(ROOT, "assets", "js", "site.js")),
  };

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  fs.cpSync(path.join(ROOT, "assets"), path.join(DIST, "assets"), { recursive: true });
  if (fs.existsSync(path.join(ROOT, "public"))) {
    fs.cpSync(path.join(ROOT, "public"), DIST, {
      recursive: true,
      filter: (src) => !/BENIOKU\.txt$|\.gitkeep$/.test(src),
    });
  }


  const yollar = ["/", "/urunler/", "/ozel-baskili-ambalaj/", "/hakkimizda/", "/iletisim/"];
  write("index.html", anaSayfa(ctx));
  write("urunler/index.html", urunlerSayfasi(ctx));
  ctx.urunler.forEach((u) => {
    write(`urunler/${u.slug}/index.html`, urunDetay(ctx, u));
    yollar.push(`/urunler/${u.slug}/`);
  });
  write("ozel-baskili-ambalaj/index.html", baskiSayfasi(ctx));
  write("hakkimizda/index.html", hakkimizdaSayfasi(ctx));
  write("iletisim/index.html", iletisimSayfasi(ctx));
  write("404.html", sayfa404(ctx));

  const bugun = new Date().toISOString().slice(0, 10);
  if (ctx.siteUrl) {
    write(
      "sitemap.xml",
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${yollar
        .map((y) => `  <url><loc>${esc(ctx.siteUrl + y)}</loc><lastmod>${bugun}</lastmod></url>`)
        .join("\n")}\n</urlset>\n`
    );
  }
  write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /admin/\n${ctx.siteUrl ? `\nSitemap: ${ctx.siteUrl}/sitemap.xml\n` : ""}`);

  if (!sessiz) {
    console.log(`\n✔ Site derlendi → dist/  (${yollar.length} sayfa, ${Date.now() - t0} ms)`);
    if (ctx.uyarilar.length) {
      console.log(`\n⚠ Yayına çıkmadan önce tamamlanması gerekenler (${ctx.uyarilar.length}):`);
      ctx.uyarilar.forEach((u) => console.log("  • " + u));
    }
    console.log("");
  }
  return ctx;
}

// Derleme + büyük fotoğrafları küçültme (yayın derlemesi ve önizleme sunucusu bunu kullanır)
async function tamDerle(secenek) {
  const ctx = build(secenek);
  const { atlandi, kucultulen } = await gorselleriKucult(DIST);
  if (atlandi) console.log("ℹ Fotoğraf küçültme atlandı (sharp kurulu değil).\n");
  else if (kucultulen.length) {
    console.log(`✔ ${kucultulen.length} büyük fotoğraf yayın için küçültüldü:`);
    kucultulen.forEach((s) => console.log("  • " + s));
    console.log("");
  }
  return ctx;
}

module.exports = { build, tamDerle, ROOT, DIST };
if (require.main === module) {
  tamDerle().catch((e) => { console.error(e); process.exit(1); });
}
