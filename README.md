# Fatih Ambalaj — Web Sitesi

Statik, hızlı ve SEO uyumlu bir site. Ek paket kurmanız gerekmez, yalnızca **Node.js 18+** yeterli.
Veritabanı, çerez ve takip kodu yoktur. Ziyaretçiler teklif taleplerini WhatsApp veya telefon üzerinden iletir.
Ürünler ve firma bilgileri **yönetim panelinden** (`/admin/`) düzenlenir.

## Çalıştırma

```bash
npm run panel
```
Siteyi **http://localhost:4321**, yönetim panelini **http://localhost:4321/admin/** adresinde açar. Panelde "Giriş"e basın (bilgisayarda şifre istenmez). Panelde kaydettiğiniz her değişiklik dosyalara yazılır ve site kendiliğinden yenilenir. İlk çalıştırmada panel sunucusu internetten bir kez indirilir.

```bash
npm run dev
```
Yalnızca siteyi açar (panel olmadan).

```bash
npm run build
```
Yayına hazır siteyi `dist/` klasörüne üretir. Komutun sonunda **yayın öncesi eksikler** listelenir.

## Yönetim paneli

Panelde şu bölümler var:

- **Ürünler:** Ürün ekleme, silme, gizleme (“Sitede göster”), sıralama, açıklamalar, kullanım alanları, ölçü/malzeme/baskı bilgileri ve fotoğraflar.
- **Ayarlar → Firma ve iletişim bilgileri:** Telefon, WhatsApp, adresler, harita bağlantıları, e-posta, Instagram, çalışma saatleri, alan adı, logo, ana sayfa ve özel baskı görselleri, "Üretimden" fotoğrafları.
- **Ayarlar → Kategoriler:** Kategori adları ve sırası.

Notlar:
- Boş bırakılan bilgiler sitede hiç gösterilmez, bozuk bağlantı oluşmaz.
- Ürün listesi paneldeki **Sıra** numarasına göre dizilir (küçük sayı önde).
- Yayındaki bir ürünün **Sayfa adresi**ni değiştirmeyin; paylaşılmış bağlantılar bozulur.
- Fotoğrafları yüklemeden önce küçültün: **1600 px genişlik, 400 KB altı**, ürünler için 4:3 yatay. Panel fotoğrafları olduğu gibi yükler; büyük dosyalar siteyi yavaşlatır ve derleme sırasında uyarı verilir. Telefonla çektiğiniz fotoğrafı squoosh.app gibi ücretsiz bir araçla WebP'ye çevirebilirsiniz.

### Paneli internette çalıştırma (bir kerelik kurulum)

Yayındaki panel, site dosyalarını GitHub'da tutar ve siteyi Netlify'da yayınlar. İkisi de bu boyuttaki bir site için ücretsizdir. Panele yalnızca GitHub deposuna yazma izni olan kişiler girebilir.

1. **GitHub** hesabı açın ve yeni bir **özel (private)** depo oluşturun. Bu klasörü o depoya yükleyin (`dist/`, `node_modules/` ve `gorseller-ham/` yüklenmez; `.gitignore` bunu sağlar).
2. `public/admin/config.yml` dosyasındaki `repo: KULLANICI-ADI/fatih-ambalaj` satırını kendi deponuzla değiştirin. Örn: `repo: fatihambalaj/web-sitesi`
3. **Netlify**'da “Add new site → Import an existing project → GitHub” ile depoyu seçin. Derleme ayarları `netlify.toml` dosyasından otomatik okunur.
4. GitHub'da **Settings → Developer settings → OAuth Apps → New OAuth App**:
   - Homepage URL: sitenizin adresi (örn. `https://www.fatihambalaj.com`)
   - Authorization callback URL: `https://api.netlify.com/auth/done`
   - Oluşan **Client ID** ve **Client Secret**'i not alın.
5. Netlify'da **Site configuration → Access & security → OAuth → Install provider → GitHub** seçip Client ID ve Secret'i girin.
6. `https://alanadiniz.com/admin/` adresine gidip **GitHub ile Giriş** yapın.

Bundan sonra panelde “Yayınla”ya bastığınızda değişiklik GitHub'a kaydedilir, Netlify siteyi 1–2 dakika içinde yeniden yayınlar. Başka birinin de panele girmesi için onu GitHub deposuna **collaborator** olarak ekleyin.

## Dosyalar (geliştirici için)

| Ne | Dosya |
| --- | --- |
| Firma ve iletişim bilgileri | `content/ayarlar.json` (panel: Ayarlar) |
| Ürünler | `content/urunler/*.json` (panel: Ürünler) |
| Kategoriler | `content/kategoriler.json` (panel: Ayarlar → Kategoriler) |
| Ürün fotoğrafları | `public/img/urunler/` |
| Üretim fotoğrafları | `public/img/uretim/` |
| Panel alanları ve ayarları | `public/admin/config.yml` |
| Sayfa metinleri (ana sayfa, hakkımızda vb.) | `scripts/build.js` → "SAYFALAR" bölümü |
| Renkler ve tasarım | `assets/css/site.css` (en üstteki `:root` değişkenleri) |

`site.config.js` ve `data/urunler.js` yalnızca `content/` klasöründeki dosyaları okuyup siteye hazırlar.

- Ham fotoğrafları `gorseller-ham/` klasörüne koyabilirsiniz; bu klasör siteye yüklenmez.
- Şu anki ürün görselleri size iletilen fotoğraflara Fatih Ambalaj logosu eklenerek hazırlandı (orijinaller `gorseller-ham/site/`). Bu fotoğrafların bir kısmı başka satıcıların sitelerinden alınmış olabilir; yayın sonrasında kendi çektiğiniz fotoğraflarla değiştirmeniz önerilir.

## Yayına alma
Önerilen yol yukarıdaki **GitHub + Netlify** kurulumudur; panel ancak böyle çalışır. Panel gerekmiyorsa `npm run build` ile üretilen `dist/` klasörünü herhangi bir statik hostinge (Cloudflare Pages, cPanel `public_html` vb.) yükleyebilirsiniz. Site alan adının köküne (`https://alanadiniz.com/`) yüklenmelidir.

## Yayından önce tamamlanması gerekenler
1. **Alan adı** (panel → Ayarlar → Site adresi): sitemap.xml, canonical adresler ve paylaşım önizlemeleri için gerekli
2. **E-posta** ve **Instagram** kullanıcı adı (varsa)
3. **Çalışma saatleri**ne kapanış saati ve Cumartesi bilgisi
4. Gerçek **üretim fotoğrafları** ("Üretimden" bölümü)
5. Ürün açıklamalarının doğruluğu; gerekirse ölçü/malzeme/baskı bilgileri
6. Yukarıdaki **panel kurulumu** (GitHub + Netlify)
7. Yayından sonra Google Search Console'a `https://alanadiniz.com/sitemap.xml` adresini ekleyin

> Test notu: `FA_TEST_WHATSAPP` / `FA_TEST_SITE_URL` ortam değişkenleri yalnızca geliştirme testleri içindir. Yayın derlemesinde kullanmayın.
