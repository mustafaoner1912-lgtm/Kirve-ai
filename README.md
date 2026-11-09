# KİRVE AI v0.5.7 — kişisel yapay zekâ asistanı

Türkçe sohbet, web araştırması, kalıcı sohbet geçmişi, şifreli hafıza, görev takibi, dosya inceleme ve WebRTC canlı ses için tek kullanıcılı PWA + Node.js sunucusu.

## Özellikler

- iPhone Safari için mobil PWA ve Ana Ekrana Ekle.
- GPT-6 Astra + Responses API, yerleşik web araması ve kaynak bağlantıları.
- AES-256-GCM ile şifrelenmiş sohbet, hafıza ve görev deposu.
- PDF, Office, metin, tablo, kod ve resim dosyalarını sohbetle ilişkilendirerek yükleme; dosya boyutu 10 MB, sohbet başına 20 ve uygulama toplamında 100 dosya sınırı.
- Realtime API WebRTC canlı ses; standart OpenAI API anahtarı yalnızca sunucuda tutulur.
- Şifreli yedek indirme: **Alanım → Yedek al**. Geri yükleme için aynı `STORE_ENCRYPTION_KEY` gerekir; anahtarı yedek dosyasından ayrı sakla.
- Uygulama içi görevler, açık talimatla hafıza kaydı ve sohbet geçmişini yönetme.

## Güvenlik

- Production'da `__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict` oturum çerezi ve yedi günlük imzalı oturum.
- Çıkışta sunucu tarafı oturum epoch'u artırılır.
- Değişiklik yapan isteklerde aynı kaynak `Origin`/`Referer` kontrolü; eksik başlıkta ret.
- Production uygulama parolası en az 16 karakter; oturum ve veri şifreleme sırları farklı ve en az 32 karakter.
- Helmet güvenlik başlıkları, no-index, API yanıtlarında `no-store`, istek kimliği ve hız sınırlaması.
- Atomik AES-256-GCM depo yazımı, dosya imza kontrolü ve şifreli yedek.
- Service worker yalnızca statik uygulama kabuğunu önbelleğe alır; API yanıtlarını önbelleğe almaz.

## Yerel ilk kurulum (Windows / iPhone hazırlığı)

Gereksinim Node.js 22 veya üstü ve internet bağlantısıdır. OpenAI API kullanımı için OpenAI Platform API anahtarı gerekir; ChatGPT aboneliği API kredisi yerine geçmez.

**Windows:** ZIP'i bir klasöre çıkar ve `KIRVE-AI-KUR.bat` dosyasına çift tıkla. Betik bağımlılıkları yükler, ilk kurulumda API anahtarını terminalde maskeli ister, uygulama parolasını üretir ve sunucuyu başlatır.

**macOS/Linux:** Terminalde proje klasörüne girip `./KIRVE-AI-KUR.sh` çalıştır.

İlk kurulumda otomatik üretilen uygulama parolasını güvenli bir yere kaydet. `.env` dosyası yerel sırları içerir; paylaşma veya GitHub'a yükleme. `STORE_ENCRYPTION_KEY` kaybolursa şifreli kayıtlar açılamaz. Sunucu başladıktan sonra `http://localhost:3000/login` adresini aç.

Var olan `.env` dosyası kurulum betiği tarafından asla otomatik olarak üzerine yazılmaz. Ayarları değiştirmek için dosyayı elle ve dikkatle düzenle.

## Otomatik kalite kontrolü

GitHub Actions; Node.js 22 üzerinde temiz bağımlılık kurulumu, statik kontroller, testler ve yüksek önem seviyeli üretim bağımlılığı denetimi yapar.

Yerel hızlı kontroller: `npm run check` ve `npm test`. Tam bağımlılık kurulumu ve `npm audit` için npm registry erişimi gerekir. Kurulum betiği çevrimiçi npm erişimi olan bilgisayarda `npm install` çalıştırır.

## Render ile yayınlama

1. Bu klasörün içeriğini private GitHub deposunun köküne koy.
2. Render'da **New → Blueprint** ile depoyu bağla.
3. `render.yaml`, web servisini ve `/var/data` kalıcı diskini yapılandırır.
4. Render Environment alanına `APP_PASSWORD` ve `OPENAI_API_KEY` değerlerini kendin gir. `SESSION_SECRET` ve `STORE_ENCRYPTION_KEY` otomatik üretilir; bunları parola kasanda yedekle.
5. Production başlangıcı `npm run start:production` ile gizli değerleri kontrol eder; eksik veya örnek değer varsa sunucu başlamaz.
6. `/health/ready` endpoint'inin `ok: true` döndürdüğünü doğrula.
7. HTTPS adresini iPhone Safari'de aç, giriş yap ve **Paylaş → Ana Ekrana Ekle**.

Kalıcı diskli servis tek instance olarak çalışmalıdır. Çoklu instance için paylaşımlı veritabanı ve rate-limit deposuna geçilmelidir. Şifreleme anahtarını değiştirmek eski veriyi okunamaz yapar.

## Canlı doğrulama sınırı

Kaynak kodu kontrolleri ve testler canlı servis doğrulaması değildir. Gerçek OpenAI yanıtı, dosya yükleme/silme, WebRTC mikrofonu, HTTPS yayını ve iPhone Ana Ekran kurulumu ancak dağıtım ve gerçek cihaz testiyle doğrulanabilir.
