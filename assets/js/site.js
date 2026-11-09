// Fatih Ambalaj — menü, kategori filtresi, galeri ve WhatsApp teklif formu
(function () {
  "use strict";
  var body = document.body;
  var WA = body.getAttribute("data-wa") || "";
  var FIRMA = body.getAttribute("data-firma") || "Fatih Ambalaj";
  var EPOSTA = body.getAttribute("data-eposta") || "";
  var TEL = body.getAttribute("data-tel") || "";
  var TELNO = body.getAttribute("data-telno") || "";

  // ---------- Mobil menü ----------
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("site-menu");
  if (toggle && menu) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector(".sr").textContent = open ? "Menüyü kapat" : "Menüyü aç";
      menu.classList.toggle("open", open);
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) { setOpen(false); toggle.focus(); }
    });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("click", function (e) {
      if (menu.classList.contains("open") && !e.target.closest(".site-header")) setOpen(false);
    });
  }

  // ---------- Sabit WhatsApp butonu: form ve alt bilgi görünürken gizle ----------
  var yuzen = document.querySelector(".wa-float");
  if (yuzen && "IntersectionObserver" in window) {
    var gorunen = new Set();
    var io = new IntersectionObserver(function (girdiler) {
      girdiler.forEach(function (g) { if (g.isIntersecting) gorunen.add(g.target); else gorunen.delete(g.target); });
      yuzen.classList.toggle("is-hidden", gorunen.size > 0);
    });
    document.querySelectorAll(".quote-form, .site-footer, .lowqty-cta, .note-box").forEach(function (h) { io.observe(h); });
  }

  // ---------- Mobil alt çubuk: form alanına yazarken gizle (klavyenin üstünde alanı kapatmasın) ----------
  var bar = document.querySelector(".mobilbar");
  if (bar) {
    document.addEventListener("focusin", function (e) {
      if (e.target.matches("input, select, textarea")) bar.classList.add("is-hidden");
    });
    document.addEventListener("focusout", function () {
      setTimeout(function () {
        if (!document.activeElement || !document.activeElement.matches("input, select, textarea")) bar.classList.remove("is-hidden");
      }, 50);
    });
  }

  // ---------- Yükleme sahnesi: kaydırdıkça ürünler araca yüklenir ----------
  var yk = document.querySelector("[data-yukleme]");
  if (yk) (function () {
    var sahne = yk.querySelector(".yk-sahne");
    var arac = yk.querySelector(".yk-arac");
    var yukler = Array.prototype.slice.call(yk.querySelectorAll(".yk-yuk"));
    var adimlar = Array.prototype.slice.call(yk.querySelectorAll(".yk-adimlar li"));
    var cta = yk.querySelector(".yk-cta");
    // ?hareket=tam → işletim sisteminde "hareketi azalt" açık olsa da tam animasyonu göster (test için)
    var tamZorla = /[?&]hareket=tam\b/.test(location.search);
    var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    var azHareket = { get matches() { return mq.matches && !tamZorla; } };
    var L = null, hedef = 0, simdi = 0, calisiyor = false;
    var N = yukler.length;
    // her yükün göreli genişliği (araç genişliğine oranla) ve yükleme sırası (üstteki önce)
    var oran = [0.21, 0.24, 0.2, 0.2, 0.16, 0.17];
    var sira = [5, 4, 3, 2, 1, 0];
    document.documentElement.classList.add("js-yk");

    var kis = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    var yum = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
    var lerp = function (a, b, t) { return a + (b - a) * t; };

    function yerlesim() {
      var W = sahne.clientWidth, H = sahne.clientHeight, mobil = W < 700;
      var zemin = H * (mobil ? 0.74 : 0.84);
      yk.style.setProperty("--yk-zemin", (zemin / H) * 100 + "%");
      var vanW = mobil ? W * 0.86 : Math.min(W * 0.6, (H * 0.55) * 2, 980);
      var vanH = vanW / 2;
      var vanX = mobil ? W - vanW * 0.94 : W - vanW - Math.max(24, W * 0.04);
      var vanY = zemin - vanH * 0.985;
      arac.style.width = vanW + "px"; arac.style.height = vanH + "px";
      // Arka kapı noktası: aracın arka (sol) ucu, kasa ortası
      var kapi = { x: vanX + vanW * 0.06, y: vanY + vanH * 0.42 };
      // Yığın: aracın solundaki boşlukta 3-2-1 dizilim
      // Mobilde yığın aracın arka ucunun biraz gerisine taşar (aracın arkasında kalır)
      var alanSol = mobil ? 8 : Math.max(20, (W - 1200) / 2 + 24), alanSag = mobil ? vanX + vanW * 0.12 : vanX - 24;
      var boyut = yukler.map(function (img, i) {
        var w = Math.min(vanW * oran[i] * (mobil ? 1.2 : 1), (alanSag - alanSol) / (mobil ? 1.7 : 2.6));
        var h = w * ((img.naturalHeight || 3) / (img.naturalWidth || 4));
        return { w: w, h: h };
      });
      var satirlar = [[0, 1, 2], [3, 4], [5]], y = zemin, kon = [];
      satirlar.forEach(function (satir) {
        var genis = satir.reduce(function (t, i) { return t + boyut[i].w; }, 0);
        var bosluk = Math.max(4, ((alanSag - alanSol) - genis) / (satir.length + 1));
        var x = alanSol + bosluk * 0.6, enYuksek = 0;
        satir.forEach(function (i) {
          kon[i] = { x: x, y: y - boyut[i].h + 4 };
          x += boyut[i].w + bosluk * 0.5;
          enYuksek = Math.max(enYuksek, boyut[i].h);
        });
        y -= enYuksek * 0.78;
      });
      yukler.forEach(function (img, i) { img.style.width = boyut[i].w + "px"; img.style.height = boyut[i].h + "px"; });
      L = { W: W, H: H, vanW: vanW, vanH: vanH, vanX: vanX, vanY: vanY, kapi: kapi, kon: kon, boyut: boyut };
      yk.classList.add("hazir");
    }

    function ciz(p) {
      if (!L) return;
      // 0-0.08 giriş, 0.08-0.8 yükleme, 0.82-1 yola çıkış
      var yuklenen = 0;
      sira.forEach(function (i, k) {
        var bas = 0.08 + k * ((0.8 - 0.08 - 0.24) / (N - 1));
        var q = kis((p - bas) / 0.24, 0, 1);
        var b = L.boyut[i], s = L.kon[i];
        var tx = L.kapi.x - b.w * 0.5, ty = L.kapi.y - b.h * 0.55;
        var x = s.x, y = s.y, olcek = 1, gor = 1, don = 0;
        if (q > 0 && q < 0.2) { y = s.y - 26 * yum(q / 0.2); }
        else if (q >= 0.2 && q < 0.78) {
          var u = yum((q - 0.2) / 0.58);
          x = lerp(s.x, tx, u); y = lerp(s.y - 26, ty, u) - Math.sin(Math.PI * u) * L.vanH * 0.28; don = Math.sin(Math.PI * u) * -6;
        } else if (q >= 0.78) {
          var v = (q - 0.78) / 0.22;
          x = lerp(tx, tx + L.vanW * 0.22, v); y = ty + 6 * v; olcek = 1 - 0.18 * v; gor = q >= 1 ? 0 : 1;
          yuklenen += v;
        }
        if (azHareket.matches) { x = s.x; y = s.y; olcek = 1; don = 0; gor = q >= 0.5 ? 0 : 1; yuklenen += q >= 0.5 ? 1 : 0; }
        var img = yukler[i];
        img.classList.toggle("yolda", q > 0 && q < 1);
        img.style.opacity = gor;
        img.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" + don.toFixed(2) + "deg) scale(" + olcek.toFixed(3) + ")";
      });
      // Araç: her yükte hafifçe çöker, sonunda ileri gider
      var cik = azHareket.matches ? 0 : yum(kis((p - 0.82) / 0.18, 0, 1));
      var cokme = azHareket.matches ? 0 : (yuklenen / N) * 5;
      var sarsinti = Math.sin(cik * Math.PI) * 1.5;
      var ax = L.vanX + cik * L.W * 0.05;
      arac.style.transform = "translate3d(" + ax.toFixed(1) + "px," + (L.vanY + cokme - sarsinti).toFixed(1) + "px,0)";
      var aktif = p < 0.14 ? 0 : p < 0.8 ? 1 : 2;
      adimlar.forEach(function (li, i) { li.classList.toggle("aktif", i === aktif); li.classList.toggle("bitti", i < aktif); });
      if (cta) cta.classList.toggle("gorunur", p > 0.84);
    }

    function ilerleme() {
      var r = yk.getBoundingClientRect();
      var yol = yk.offsetHeight - sahne.offsetHeight;
      return yol > 0 ? kis(-r.top / yol, 0, 1) : 1;
    }
    function dongu() {
      simdi += (hedef - simdi) * (azHareket.matches ? 1 : 0.18);
      if (Math.abs(hedef - simdi) < 0.0005) simdi = hedef;
      ciz(simdi);
      if (simdi !== hedef) requestAnimationFrame(dongu); else calisiyor = false;
    }
    function kaydir() {
      hedef = ilerleme();
      if (!calisiyor) { calisiyor = true; requestAnimationFrame(dongu); }
    }
    function basla() {
      yk.classList.toggle("az-hareket", azHareket.matches);
      yerlesim();
      hedef = simdi = ilerleme(); ciz(simdi);
    }
    var yuklenmis = 0;
    yukler.concat([arac]).forEach(function (img) {
      img.loading = "eager";
      if (img.complete) yuklenmis++; else img.addEventListener("load", function () { if (++yuklenmis >= N + 1) basla(); });
    });
    if (yuklenmis >= N + 1) basla(); else basla();
    window.addEventListener("scroll", kaydir, { passive: true });
    window.addEventListener("resize", function () { yerlesim(); ciz(simdi); });
    if (mq.addEventListener) mq.addEventListener("change", basla);
  })();

  // ---------- Kategori filtresi (/urunler/) ----------
  var liste = document.getElementById("urun-listesi");
  if (liste) {
    var chips = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
    var kartlar = Array.prototype.slice.call(liste.querySelectorAll(".card"));
    var sonuc = document.getElementById("filtre-sonuc");
    var gecerli = chips.map(function (c) { return c.getAttribute("data-filter"); });
    var uygula = function (kat, guncelle) {
      if (gecerli.indexOf(kat) === -1) kat = "";
      var n = 0;
      kartlar.forEach(function (k) {
        var goster = !kat || k.getAttribute("data-kategori") === kat;
        k.hidden = !goster;
        if (goster) n++;
      });
      chips.forEach(function (c) {
        if (c.getAttribute("data-filter") === kat) c.setAttribute("aria-current", "true");
        else c.removeAttribute("aria-current");
      });
      var aktif = chips.filter(function (c) { return c.getAttribute("data-filter") === kat; })[0];
      if (sonuc) sonuc.textContent = kat ? aktif.textContent + ": " + n + " ürün" : n + " ürün listeleniyor";
      // Mobilde yatay kayan filtrede seçili kategoriyi görünür yap
      var kaydirici = aktif && aktif.closest("ul");
      if (kaydirici && kaydirici.scrollWidth > kaydirici.clientWidth) {
        var r = aktif.getBoundingClientRect(), rk = kaydirici.getBoundingClientRect();
        kaydirici.scrollLeft += r.left - rk.left - (rk.width - r.width) / 2;
      }
      if (guncelle && window.history.replaceState) {
        window.history.replaceState(null, "", kat ? "?kategori=" + kat : window.location.pathname);
      }
    };
    chips.forEach(function (c) {
      c.addEventListener("click", function (e) {
        e.preventDefault();
        uygula(c.getAttribute("data-filter"), true);
      });
    });
    uygula(new URLSearchParams(window.location.search).get("kategori") || "", false);
  }

  // ---------- Ürün galerisi ----------
  document.querySelectorAll("[data-gallery]").forEach(function (g) {
    var ana = g.querySelector(".gallery-main img");
    g.querySelectorAll(".thumb").forEach(function (t) {
      t.addEventListener("click", function () {
        ana.src = t.getAttribute("data-src");
        ana.alt = t.getAttribute("data-alt");
        g.querySelectorAll(".thumb").forEach(function (x) { x.removeAttribute("aria-current"); });
        t.setAttribute("aria-current", "true");
      });
    });
  });

  // ---------- Teklif formu → WhatsApp mesajı ----------
  var tekSatir = function (v) { return String(v || "").replace(/\s+/g, " ").trim(); };
  var cokSatir = function (v) {
    return String(v || "").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  };

  function mesajOlustur(d) {
    var satirlar = ["Merhaba, " + FIRMA + "'dan teklif almak istiyorum."];
    if (d.isletme) satirlar.push("İşletme: " + d.isletme);
    satirlar.push("İlgili kişi: " + d.ad);
    satirlar.push("Ürün: " + d.urun);
    satirlar.push("Adet: " + d.adet);
    if (d.olcu) satirlar.push("Ölçü: " + d.olcu);
    if (d.baski) satirlar.push("Baskı tercihi: " + d.baski);
    if (d.aciklama) satirlar.push("Açıklama: " + d.aciklama);
    return satirlar.join("\n");
  }

  function hataGoster(alan, mesaj) {
    var id = alan.getAttribute("aria-describedby") || "";
    var errId = id.split(" ").filter(function (x) { return /-err$/.test(x); })[0];
    var err = errId && document.getElementById(errId);
    if (mesaj) {
      alan.setAttribute("aria-invalid", "true");
      if (err) { err.textContent = mesaj; err.hidden = false; }
    } else {
      alan.removeAttribute("aria-invalid");
      if (err) { err.textContent = ""; err.hidden = true; }
    }
  }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text) e.textContent = text;
    return e;
  }

  document.querySelectorAll("[data-quote-form]").forEach(function (form) {
    var durum = form.querySelector(".form-status");
    var alanlar = {
      ad: form.elements.namedItem("ad"),
      urun: form.elements.namedItem("urun"),
      adet: form.elements.namedItem("adet"),
    };

    var kontrol = function (ad, sessiz) {
      var a = alanlar[ad];
      if (!a || a.type === "hidden") return true;
      var v = tekSatir(a.value);
      var m = "";
      if (ad === "ad") {
        if (!v) m = "Lütfen adınızı ve soyadınızı yazın.";
        else if (v.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "").length < 2) m = "Lütfen geçerli bir ad soyad yazın.";
      } else if (ad === "urun") {
        if (!v) m = "Lütfen bir ürün türü seçin.";
      } else if (ad === "adet") {
        if (!v) m = "Lütfen yaklaşık adet yazın.";
        else if (!/\d/.test(v)) m = "Adet bir sayı içermeli (örn. 1000 veya 500-1000).";
      }
      if (!sessiz || !m) hataGoster(a, m);
      return !m;
    };

    Object.keys(alanlar).forEach(function (k) {
      var a = alanlar[k];
      if (!a || a.type === "hidden") return;
      a.addEventListener(a.tagName === "SELECT" ? "change" : "blur", function () {
        if (a.getAttribute("aria-invalid") === "true" || tekSatir(a.value)) kontrol(k);
      });
      a.addEventListener("input", function () {
        if (a.getAttribute("aria-invalid") === "true") kontrol(k, true);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ilkHata = null;
      ["ad", "urun", "adet"].forEach(function (k) {
        if (!kontrol(k) && !ilkHata) ilkHata = alanlar[k];
      });
      if (ilkHata) { ilkHata.focus(); return; }

      var baski = form.querySelector('input[name="baski"]:checked');
      var d = {
        ad: tekSatir(alanlar.ad.value),
        isletme: tekSatir(form.elements.namedItem("isletme").value),
        urun: tekSatir(alanlar.urun.value),
        adet: tekSatir(alanlar.adet.value),
        olcu: tekSatir(form.elements.namedItem("olcu").value),
        baski: baski ? baski.value : "",
        aciklama: cokSatir(form.elements.namedItem("aciklama").value),
      };
      var mesaj = mesajOlustur(d);
      durum.innerHTML = "";
      durum.classList.remove("is-warn");

      if (WA) {
        var url = "https://wa.me/" + WA + "?text=" + encodeURIComponent(mesaj);
        window.open(url, "_blank", "noopener");
        durum.appendChild(el("p", {}, "")).appendChild(el("strong", {}, "Mesajınız WhatsApp'ta hazırlandı."));
        durum.appendChild(el("p", {}, "Talebinizin bize ulaşması için açılan WhatsApp sohbetinde mesajı göndermeniz gerekir."));
        var acts = durum.appendChild(el("div", { class: "actions" }));
        var link = acts.appendChild(el("a", { class: "btn btn-accent btn-sm", href: url, target: "_blank", rel: "noopener" }, "WhatsApp açılmadıysa tıklayın"));
        void link;
      } else {
        durum.classList.add("is-warn");
        durum.appendChild(el("p", {}, "")).appendChild(el("strong", {}, "Talep mesajınız hazır."));
        durum.appendChild(el("p", {}, "Aşağıdaki mesajı kopyalayıp bize iletebilirsiniz."));
        var ta = durum.appendChild(el("textarea", { rows: "7", readonly: "", "aria-label": "Hazırlanan mesaj" }));
        ta.value = mesaj;
        var acts2 = durum.appendChild(el("div", { class: "actions" }));
        var kopyala = acts2.appendChild(el("button", { type: "button", class: "btn btn-dark btn-sm" }, "Mesajı kopyala"));
        kopyala.addEventListener("click", function () {
          var bitti = function () { kopyala.textContent = "Kopyalandı"; };
          if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(mesaj).then(bitti, function () { ta.select(); });
          else { ta.select(); try { document.execCommand("copy"); bitti(); } catch (x) { /* seçili kalır */ } }
        });
        if (EPOSTA) {
          acts2.appendChild(el("a", {
            class: "btn btn-ghost btn-sm",
            href: "mailto:" + EPOSTA + "?subject=" + encodeURIComponent("Teklif talebi – " + d.urun) + "&body=" + encodeURIComponent(mesaj),
          }, "E-posta ile gönder"));
        }
        if (TEL) acts2.appendChild(el("a", { class: "btn btn-ghost btn-sm", href: "tel:+" + TELNO }, "Ara: " + TEL));
      }
      durum.hidden = false;
      durum.focus();
    });
  });
})();
