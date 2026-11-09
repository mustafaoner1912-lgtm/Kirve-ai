# iPhone'da KİRVE AI v0.5.7'i kurma

Bu paket kaynak kodudur. iPhone uygulaması, internette HTTPS üzerinden çalışan sunucuya Safari ile bağlanır.

## Gerekli hesaplar ve gizli bilgiler

Private GitHub repository, Render web service/persistent disk ve OpenAI API projesi gerekir. `OPENAI_API_KEY`, en az 16 karakter `APP_PASSWORD`, birbirinden farklı en az 32 karakter `SESSION_SECRET` ve `STORE_ENCRYPTION_KEY` yalnızca Render Environment alanına girilmelidir. Bunları sohbete gönderme.

## Kurulum

1. ZIP'i aç ve proje klasörünün içeriğini private GitHub deposunun köküne yükle (`render.yaml` kökte olmalı).
2. Render → **New → Blueprint** → GitHub deposunu seç.
3. Render servis ve `/var/data` kalıcı disk ayarını oluştursun.
4. Render Environment alanına `APP_PASSWORD` ve `OPENAI_API_KEY` değerlerini kendin gir; otomatik üretilen oturum ve şifreleme anahtarlarını parola kasana yedekle.
5. Deploy tamamlanınca `/health/ready` sayfasında `ok: true` gör.
6. iPhone Safari'de HTTPS adresini aç ve giriş yap.
7. Safari **Paylaş → Ana Ekrana Ekle**.

## Uygulama içinde

- Türkçe metin sohbeti ve web araştırması.
- Mikrofon düğmesiyle canlı konuşma (HTTPS ve iOS mikrofon izni gerekir).
- `+` ile desteklenen dosya/resim ekleme.
- Alanım sekmelerinde görevler, kalıcı hafıza ve sohbet geçmişi.
- Alanım → Yedek al ile şifreli yedek indirme.

## Henüz canlı test gerektirenler

Gerçek OpenAI API yanıtı, dosya sağlayıcısı, WebRTC mikrofon ve iPhone Ana Ekran kurulumu yayınlama ve gerçek cihaz testi gerektirir. Kaynak paketindeki testler canlı servis testi değildir.
