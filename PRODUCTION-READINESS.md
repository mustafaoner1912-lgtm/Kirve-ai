# KİRVE AI v0.5.7 — production readiness

Bu liste yalnızca KİRVE AI uygulamasının kurulumu ve canlıya alınması içindir.

## Kaynakta hazır

- [x] Windows ve macOS/Linux için yerel kurulum başlatıcıları ve maskeli API anahtarı sihirbazı

- [x] Node.js 22 uygulaması ve iPhone PWA
- [x] Tek kullanıcı oturumu, şifreli depo, imzalı oturum, CSRF/kaynak kontrolü ve hız sınırlaması
- [x] `/health` ve `/health/ready` sağlık uç noktaları
- [x] Render Blueprint ve kalıcı disk tanımı
- [x] GitHub Actions statik kontrol, test ve bağımlılık denetimi
- [x] Production preflight: gerekli sırların varlığı, uzunluğu ve tüm uygulama/oturum/şifreleme sırlarının birbirinden farklı olması
- [x] Production başlangıcında preflight zorunluluğu

## Dağıtım sonrası doğrulama kapıları

1. Private GitHub deposuna kaynak kodunu yükle.
2. Render Blueprint ile servisi oluştur ve build/deploy sonucunu doğrula.
3. Render Environment alanında `OPENAI_API_KEY` ve benzersiz `APP_PASSWORD` tanımla; üretilen `SESSION_SECRET` ve `STORE_ENCRYPTION_KEY` değerlerini güvenli kasada sakla.
4. GitHub Actions'ın başarılı olduğunu, Render build'in tamamlandığını ve `/health/ready` sonucunun `ok: true` olduğunu doğrula.
5. Giriş, yeni sohbet, geçmişi açma, hafıza kaydetme/arama/silme, görev oluşturma/tamamlama ve şifreli yedek indirmeyi test et.
6. Gerçek OpenAI metin yanıtını ve web arama kaynaklarını doğrula.
7. PDF/resim yükleme, sohbetle ilişkilendirme ve sağlayıcıdan silme akışını test et.
8. HTTPS üzerinde WebRTC mikrofon oturumunu test et.
9. iPhone Safari'de oturum, PWA ve Ana Ekrana Ekle davranışını doğrula.

## Yayın kabul kriteri

KİRVE AI ancak temiz bağımlılık kurulumu ve güvenlik denetimi, yeşil CI, başarılı Render dağıtımı, `/health/ready`, gerçek OpenAI yanıtı, dosya akışı ve WebRTC/iPhone testleri gözlemlendiğinde canlıya hazır sayılır.

## Güvenlik notları

- `.env`, API anahtarı, uygulama parolası, oturum sırrı veya şifreleme anahtarını Git'e yükleme.
- `STORE_ENCRYPTION_KEY` değişirse mevcut veriler okunamaz; anahtar değişimi için kontrollü migration gerekir.
- JSON dosya deposu tek instance içindir. Yüksek trafik veya çoklu instance için PostgreSQL ve paylaşımlı rate-limit deposuna geç.
