# KİRVE AI v0.5.7 — dağıtım kontrol listesi

## Yerel ilk kurulum

Windows için `KIRVE-AI-KUR.bat`, macOS/Linux için `./KIRVE-AI-KUR.sh` kullan. Kurulum sihirbazı OpenAI anahtarını maskeli alır ve yerel `.env` dosyasını oluşturur.

## Hosting gizli değerleri

- `OPENAI_API_KEY`: OpenAI Platform API anahtarı.
- `APP_PASSWORD`: benzersiz, en az 16 karakter uygulama parolası.
- `SESSION_SECRET`: rastgele en az 32 karakter.
- `STORE_ENCRYPTION_KEY`: `SESSION_SECRET` değerinden farklı, rastgele en az 32 karakter.

Bu değerleri yalnızca Render Environment alanına gir. API anahtarı veya sırları GitHub'a, ZIP'e, ekran görüntüsüne ya da sohbet mesajına yazma. Oturum ve veri anahtarlarının yedeğini parola kasasında tut.

## Render doğrulama

1. Blueprint ile Render web service ve `/var/data` kalıcı diskini oluştur.
2. Build ve deploy loglarını kontrol et. Production başlangıcı preflight kontrolünü otomatik çalıştırır.
3. `https://<servis-adı>.onrender.com/health` → `ok: true`, `version: 0.5.7`.
4. `https://<servis-adı>.onrender.com/health/ready` → `ok: true`, `storage: ready`.
5. `/login` ekranından uygulama parolasıyla giriş yap.
6. Metin sohbeti, web araştırması ve kaynak bağlantılarını doğrula.
7. Hafıza, görevler, sohbet geçmişi ve şifreli yedek indirmeyi test et.
8. PDF/fotoğraf yükleme, yanıtı, dosya silmeyi ve sohbet silmeyi test et.
9. HTTPS üzerinde mikrofon izni verip Realtime ses bağlantısını test et.
10. iPhone Safari → Paylaş → Ana Ekrana Ekle.

## Operasyon notları

- Persistent diskli servis tek instance ile çalışır. Çoklu instance için ortak veritabanı gerekir.
- `SESSION_SECRET` oturumları imzalar; `STORE_ENCRYPTION_KEY` uygulama deposunu şifreler. İkisini karıştırma veya değiştirme.
