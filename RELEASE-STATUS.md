# KİRVE AI v0.5.7 — release status

## Bu sürümde

- Windows ve macOS/Linux ilk kurulum başlatıcıları eklendi.
- İlk kurulum sihirbazı OpenAI API anahtarını terminalde maskeli alır; `.env` dosyasını özel dosya izinleriyle oluşturur.
- Uygulama parolası isteğe bağlı otomatik üretilir; oturum ve veri şifreleme sırları kriptografik rastgele oluşturulur.
- Var olan `.env` dosyası hiçbir zaman otomatik olarak üzerine yazılmaz.
- Uygulama ve PWA sürümü 0.5.7 olarak güncellendi.

## Yerel doğrulama

- `npm run check`: başarılı.
- `npm test`: test sayısı aşağıdaki son test çıktısına göre raporlanacaktır.
- Npm registry bu çalışma ortamında DNS `EAI_AGAIN` hatası verdi. Bu nedenle bağımlılıkları temiz kurmak, `package-lock.json` üretmek ve `npm audit` çalıştırmak burada mümkün olmadı. Windows/macOS/Linux kurulum betikleri, kullanıcının çevrimiçi bilgisayarında `npm install` çalıştırır.

## Canlıya çıkış için harici adımlar

- Private GitHub deposu ve Render servisi oluşturulmadı.
- Render'a OpenAI API anahtarı ve uygulama parolası girilmedi.
- Gerçek OpenAI metin yanıtı, dosya akışı, Realtime WebRTC ve iPhone Safari/PWA testi yapılmadı.

Bu nedenle sürüm kaynak ve test paketi olarak hazırlanmıştır; canlı servis olarak yayımlanmış değildir.
