# KİRVE AI değişiklik günlüğü

## v0.5.7 — yerel ilk kurulum sihirbazı

- Windows için `KIRVE-AI-KUR.bat`, macOS/Linux için `KIRVE-AI-KUR.sh` eklendi.
- İlk çalıştırmada OpenAI API anahtarını terminalde maskeli alıp `.env` dosyasına yazar.
- Uygulama parolası otomatik üretilebilir; oturum ve veri şifreleme anahtarları kriptografik rastgele oluşturulur.
- Var olan `.env` dosyasının üzerine yazılmaz; hassas değerler kaynak koduna veya tarayıcıya konmaz. Production preflight yerel `.env` dosyasını da yükler.
- Uygulama ve PWA sürümü 0.5.7 olarak güncellendi.

## v0.5.6 — production secret ayrıştırması

- Production'da uygulama parolası, oturum sırrı ve veri şifreleme anahtarının üç ayrı değer olması zorunlu hâle getirildi.
- Production başlangıcına zorunlu gizli değer preflight kontrolü eklendi.
