# Haxball Pro Arena - Multiplayer & ELO

Node.js, Express ve Socket.IO uzerine insa edilmis, gercek zamanli fizik motoruna ve ELO siralamasina sahip, tarayici tabanli cok oyunculu (multiplayer) futbol oyunu.

---

## Ozellikler

- Gercek Zamanli Fizik ve Ag Senkronizasyonu: Dusuk gecikmeli (low-latency) Socket.IO ile tum istemciler arasinda tam senkronize top ve oyuncu hareketleri.
- ELO Derecelendirme Sistemi: Oyuncularin galibiyet, maglubiyet, atilan gol ve guncel ELO puanlarini (`elo_ratings.json`) yerel olarak kaydeden ve canli siralamada gosteren sistem.
- Ozellestirilebilir Mac Kurallari:
  - Hedef Gol Sayisi (Orn: 3 Gol, 5 Gol)
  - Sure Limiti (Orn: 3 Dk, 5 Dk, Sinirsiz)
  - Bot (AI) Destegi (Ayrilan oyuncular veya tek kisi pratik yapmak icin)
- Takim ve Seyirci Sistemi: Kirmizi Takim, Mavi Takim ve Seyirci (Spectator) modlari.
- Yerel Ag (LAN / Wi-Fi) Destegi: Ayni Wi-Fi veya yerel agdaki diger bilgisayarlardan ve akilli telefonlardan IP adresi uzerinden dogrudan katilim.
- Canli Sohbet ve Bildirimler: Oyun ici mesajlasma ve gol anonslari.
- Modern Arayuz: Ozel karanlik tema, canli skor tablosu ve istatistik paneli.

---

## Dosya Yapisi

- `server.js`: Express HTTP sunucusu, Socket.IO baglantilari, mac dongusu ve ELO hesaplama mantigi.
- `package.json`: Proje bagimliliklari ve baslatma scriptleri.
- `elo_ratings.json`: Oyuncu ELO verilerinin saklandigi JSON veri dosyasi.
- `public/`:
  - `index.html`: Web arayuzu ve saha canvas bileseni.
  - `game.js`: Istemci tarafi cizim, klavye kontrolleri ve ag dinleyicileri.
  - `style.css`: Arayuz stilleri ve duyarlı yerlesim tasarimi.
- `start.bat`: Tek tikla bagimliliklari denetleyen ve oyunu baslatan Windows toplu islem dosyasi.

---

## Kurulum ve Calistirma

### Gereksinimler

- Node.js (v16 veya daha guncel bir surum)
- npm (Node Package Manager)

### Kurulum Adimlari

1. Repoyu bilgisayariniza klonlayin:
```bash
git clone https://github.com/srt1s/haxball-game.git
cd haxball-game
```

2. Gerekli bagimliliklari yukleyin:
```bash
npm install
```

3. Sunucuyu baslatin:
```bash
npm start
```
(Alternatif olarak: `node server.js` veya Windows uzerinde `start.bat` dosyasini calistirabilirsiniz.)

4. Tarayicinizda asagidaki adresi acin:
```text
http://localhost:3000
```

---

## Ayni Agdaki Diger Cihazlardan Baglanma

Sunucu basladiginda terminalde yerel IP adresiniz listelenecektir. Ayni Wi-Fi agina bagli diger bilgisayarlar veya telefonlar su formatta tarayicilarindan baglanabilir:
```text
http://<YEREL_IP_ADRESINIZ>:3000
```
(Ornegin: `http://192.168.1.35:3000`)

---

## Kontroller

- Hareket: `W`, `A`, `S`, `D` veya Yon Tuslari (Yukari, Sol, Asagi, Sag)
- Sut / Vurus: `Space (Bosluk)` veya `X`
- Takim Secimi: Arayuzdeki panelden Kirmizi, Mavi veya Seyirci butonlarina tiklayarak takiminizi degistirebilirsiniz.

---

## Lisans

Bu proje ISC lisansi ile lisanslanmistir.
