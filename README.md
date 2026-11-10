# Panoramik Tur Oluşturucu

Bir mekânın kat planını çizip üzerine **360° panorama noktaları** ve **3D objeler**
yerleştirerek tarayıcıda gezilebilen sanal turlar hazırlamanızı sağlayan web uygulaması.
Hazırladığınız turu tek bir linkle paylaşabilirsiniz; izleyiciler hiçbir şey kurmadan
odalar arasında dolaşır, objelere tıklayıp bilgilerini okur.

---

## İçindekiler

1. [Neler yapabilirsiniz?](#neler-yapabilirsiniz)
2. [Kurulum ve çalıştırma](#kurulum-ve-çalıştırma)
3. [Arayüzü tanıyalım](#arayüzü-tanıyalım)
4. [5 dakikada ilk tur](#5-dakikada-ilk-tur)
5. [Odalar](#odalar)
6. [Panorama noktaları](#panorama-noktaları)
7. [3D objeler](#3d-objeler)
8. [Panorama görünümü ve küçük harita](#panorama-görünümü-ve-küçük-harita)
9. [Kütüphane: panorama ve model yükleme](#kütüphane-panorama-ve-model-yükleme)
10. [Kaydetme, açma ve paylaşma](#kaydetme-açma-ve-paylaşma)
11. [Önizleme ve paylaşım görünümü](#önizleme-ve-paylaşım-görünümü)
12. [Klavye ve fare kısayolları](#klavye-ve-fare-kısayolları)
13. [İpuçları](#ipuçları)
14. [Sorun giderme](#sorun-giderme)
15. [Geliştiriciler için](#geliştiriciler-için)

---

## Neler yapabilirsiniz?

| | |
| --- | --- |
| 🧱 **Kat planı çizimi** | Sürükleyerek dikdörtgen ve daire odalar çizin, birleştirin, kilitleyin, renklendirin. |
| 📍 **Panorama noktaları** | Haritaya noktalar koyup her birine bir 360° fotoğraf atayın. |
| 🚪 **Otomatik geçişler** | Bir noktanın görüş menzilindeki diğer noktalar panoramada tıklanabilir oklar olarak belirir. |
| 📦 **3D objeler** | `.glb` modelleri haritadaki konumlarına göre panoramaya yerleştirin; boyut ve açıyı canlı ayarlayın. |
| 📝 **Obje bilgileri** | Objelere biçimlendirilmiş açıklama yazın; izleyici modele tıklayınca okusun. |
| 🗺️ **Küçük harita** | Panoramada gezerken planı ve bakılan yönü sağ altta görün. |
| ↩️ **Geri al / yinele** | Yaptığınız her değişikliği geri alabilirsiniz. |
| 🔗 **Paylaşım** | Tek tıkla salt okunur bir izleme linki oluşturun. |

---

## Kurulum ve çalıştırma

### Seçenek A — Yerel (önerilen, tek komut)

Gereksinim: **Python 3.11+**

```bash
cd panoromic_visit_builder/backend
python -m venv venv
venv\Scripts\activate          # macOS / Linux: source venv/bin/activate
pip install "fastapi[standard]"
uvicorn main:app --reload
```

Tarayıcıda **<http://127.0.0.1:8000>** adresini açın. Arayüzü de backend sunduğu için
ayrı bir sunucuya (Live Server vb.) gerek yoktur.

> **uv kullanıyorsanız:** `uv run uvicorn main:app --reload` (pyproject Python 3.14 ister).
>
> **VS Code Live Server ile açarsanız** (5500 portu), uygulama API adresini otomatik
> olarak `http://127.0.0.1:8000` kabul eder; backend'in ayrıca çalışıyor olması gerekir.

### Seçenek B — Docker

```bash
docker compose up --build
```

Uygulama **<http://localhost:8080>** adresinde açılır. nginx arayüzü sunar ve `/api`,
`/media` isteklerini backend'e aktarır. Verileriniz `panoramic-data` adlı Docker
volume'ünde saklanır; konteyneri silseniz de kaybolmaz.

### İlk açılışta ne olur?

Uygulama `backend/data/` klasörünü oluşturur (veritabanı ve yüklenen dosyalar burada
durur). Projenin eski sürümünden kalma turlar varsa bunlar **bir kez** otomatik olarak
içe aktarılır (bkz. [Eski sürümden geçiş](#eski-sürümden-geçiş)).

---

## Arayüzü tanıyalım

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ◉ Tur adı   ● Kaydedilmedi        Yeni  Turlarım  Kaydet  Paylaş [▶ Önizle]│  ← Üst bar
├───────────┬──────────────────────────────────────────────┬───────────────┤
│ ODA ÇİZ   │                                              │ Özellikler    │
│ Dikdörtgen│                                              │ (seçili öğeye │
│ Daire     │            Kat planı (harita)                │  göre değişir)│
│ YERLEŞTİR │                                              │               │
│ Nokta     │                                              │               │
│ 3D obje   │                                              │ Çoğalt  Sil   │
│ DÜZEN     │                                              └───────────────┤
│ Geri İleri│                                                              │
│ Kısayollar│                                                              │
└───────────┴──────────────────────────────────────────────────────────────┘
```

- **Üst bar:** Turun adı (tıklayıp değiştirebilirsiniz), kayıt durumu ve ana işlemler.
  - `● Kaydedilmedi` (turuncu): kaydedilmemiş değişiklik var.
  - `Kaydedildi` (yeşil): her şey sunucuda.
- **Sol araç çubuğu:** Çizim ve yerleştirme araçları, geri al / yinele, kısayol özeti.
- **Harita:** 1200 × 800 px'lik, 10 px ızgaralı çalışma alanı.
- **Sağ panel (Özellikler):** Bir şey seçtiğinizde açılır; seçili öğenin ayarlarını içerir.

---

## 5 dakikada ilk tur

1. **Odayı çizin.** Soldan **Dikdörtgen**'e tıklayın (ya da `R`) ve haritada sürükleyin.
2. **Panorama noktası koyun.** **Panorama noktası**'na tıklayın (ya da `N`) ve odanın
   içinde fotoğrafın çekildiği yere tıklayın. Nokta gri görünür; henüz fotoğrafı yoktur.
3. **Fotoğraf atayın.** Sağ paneldeki **Panorama seç…** kutusuna tıklayın, açılan
   kütüphaneden bir fotoğraf seçin ya da **Dosya yükle** ile kendi 360° fotoğrafınızı ekleyin.
4. **İkinci bir nokta ekleyin** ve ona da fotoğraf atayın. İki noktanın birbirini
   görebilmesi için aralarındaki mesafe **Görüş menzili**nden küçük olmalı (gerekirse
   menzili büyütün).
5. **Bir 3D obje koyun.** **3D obje** (`O`) ile noktanın yakınına tıklayın. Model
   seçmezseniz varsayılan kutu kullanılır.
6. **Panoramayı açın.** Noktaya **çift tıklayın**. Diğer nokta bir ok, obje ise 3D model
   olarak görünür. Oka tıklayarak diğer noktaya geçin.
7. **Kaydedin.** Sol üstteki tur adını değiştirip **Kaydet**'e basın (`Ctrl+S`).
8. **Paylaşın.** **Paylaş** linki panoya kopyalar; bu linki açan herkes turu gezebilir.

---

## Odalar

### Çizim
| Araç | Nasıl kullanılır |
| --- | --- |
| **Dikdörtgen** (`R`) | Bir köşeden karşı köşeye sürükleyin. Sadece tıklarsanız 160×100 px'lik oda oluşur. |
| **Daire** (`C`) | Merkezden dışarı doğru sürükleyin. Sadece tıklarsanız 60 px yarıçaplı daire oluşur. |

- Çizim bitince araç kapanır ve yeni oda seçili gelir.
- Çizerken **sağ tık** veya **Esc** çizimi iptal eder.
- Tüm köşeler 10 px'lik ızgaraya oturur.

### Düzenleme
- **Taşıma:** Odayı sürükleyin (ızgaraya oturur) veya ok tuşlarıyla kaydırın (Shift ile 10 px).
- **Boyutlandırma:** Seçili odanın kenar ve köşe tutamaçlarını sürükleyin.
- **Döndürme:** Üstteki yuvarlak tutamacı çevirin; 0°/90°/180°/270°'ye yaklaşınca yapışır.
- **Renk:** Sağ paneldeki **Renk** kutusundan.
- **Kilitle / Kilidi aç:** Kilitli oda taşınamaz ve boyutlandırılamaz. Bitmiş planı yanlışlıkla
  bozmamak için kullanışlıdır. Kilitli oda yine seçilebilir, silinebilir veya kilidi açılabilir.

### Birleştirme
Birden fazla odayı tek bir şekle dönüştürür (örneğin L biçimli bir salon).

1. Odaları seçin: boş alanda **sürükleyerek kutu çizin** ya da **Shift + tık** ile tek tek ekleyin.
2. Sağ panelde **Odaları birleştir**'e tıklayın.

Birbirine değmeyen odalar birleştirilince ayrı parçalar olarak kalır; uygulama bunu
bildirir. Birleştirmeyi `Ctrl+Z` ile geri alabilirsiniz.

---

## Panorama noktaları

Her nokta, 360° fotoğrafın çekildiği yeri temsil eder.

### Nokta renkleri
| Renk | Anlamı |
| --- | --- |
| ⚪ Gri | Henüz panorama atanmamış |
| ⚫ Koyu | Panoraması var |
| 🟢 Yeşil | Turun **başlangıç noktası** |
| 🔵 Mavi | Şu an panoraması açık olan nokta |

### Ayarlar (sağ panel)
| Ayar | Açıklama |
| --- | --- |
| **Ad** | Haritada noktanın altında ve panoramadaki geçiş okunda görünür (ör. "Giriş", "Mutfak"). Boş bırakılırsa "Nokta 1, 2…" kullanılır. |
| **Panorama** | Bu noktada gösterilecek 360° fotoğraf. Tıklayınca kütüphane açılır. |
| **Görüş menzili** | 40–800 px. Bu yarıçapın içindeki **noktalar ok**, **objeler 3D model** olarak panoramada görünür. Nokta seçiliyken haritada kesikli mavi halka olarak görünür; halkanın köşe tutamaçlarından da büyütülüp küçültülebilir. |
| **Turun başlangıç noktası** | Önizleme ve paylaşım linki bu noktadan başlar. İlk eklenen nokta otomatik olarak başlangıç olur. |
| **Panoramayı aç** | Noktanın panoramasına geçer (noktaya çift tıklamakla aynı). |

### Hızlı ipuçları
- Art arda birkaç nokta koymak için tıklarken **Shift**'e basılı tutun; araç açık kalır.
- Nokta silinirse ve başlangıç noktasıysa, başlangıç otomatik olarak başka bir noktaya geçer.

---

## 3D objeler

Haritaya koyduğunuz her turuncu kare, panoramada bir 3D model olarak görünür.

### Ayarlar (sağ panel)
| Ayar | Aralık | Açıklama |
| --- | --- | --- |
| **Bilgiyi düzenle** | — | Obje adı ve biçimlendirilmiş açıklama (kalın, italik, altı çizili, yazı boyutu, listeler). İzleyici modele tıklayınca sağda açılan panelde görünür. |
| **Model** | — | Kütüphaneden `.glb` model seçin. Seçilmezse varsayılan kutu kullanılır. |
| **Boyut** | 0.05× – 5× | Modelin ölçeği. |
| **Yatay dönüş** | −180° – 180° | Modeli kendi dikey ekseni etrafında çevirir. |
| **Eğim** | −180° – 180° | Öne/arkaya yatırır. |
| **Yan yatma** | −180° – 180° | Sağa/sola yatırır. |
| **Dikey konum** | −30° – +25° | Modeli bakış açısında yukarı/aşağı taşır (zemine oturtmak ya da rafa koymak için). |
| **Ayarları sıfırla** | — | Boyut ve açıları varsayılana döndürür. |

### Canlı ayar
En rahat yöntem: objeyi menzilinde gören bir noktanın **panoramasını açın**, sonra
**panoramadaki modele tıklayın**. Obje seçilir ve kaydırıcıları oynattıkça model anında
değişir. Model ekranın dışına kayacak olursa kamera otomatik olarak ona döner.

### Modelin yeri nasıl belirlenir?
Modelin panoramadaki **yönü**, haritada noktadan objeye çizilen doğrunun yönüdür.
Haritada objeyi noktanın sağına koyarsanız panoramada da o tarafta görünür. Uzaklık
sabittir; büyüklüğü **Boyut** ile ayarlayın.

---

## Panorama görünümü ve küçük harita

Bir noktanın panoraması açıldığında:

- **Etrafa bakmak:** Fareyle sürükleyin; tekerlek ya da alt çubuktaki büyüteçlerle yakınlaşın.
  ⛶ düğmesi tam ekrana geçer.
- **Diğer noktaya geçmek:** Ok simgesine (altında noktanın adı yazar) tıklayın. Yeni
  panoramada aynı yöne bakarak açılırsınız; içeride yürüyormuşsunuz gibi.
- **Küçük harita (sağ alt):** Plan kadraja sığdırılarak gösterilir. **Sarı koni** şu an
  baktığınız yönü ve görüş genişliğini gösterir. Üzerine gelince büyür; haritadaki
  bir noktaya tıklayarak doğrudan oraya geçebilirsiniz.
- **Haritaya dönmek:** Sol üstteki **← Haritaya dön** ya da `Esc`.

Panorama açıkken harita yalnızca gezinme içindir; öğeler sürüklenemez.

---

## Kütüphane: panorama ve model yükleme

Kütüphane, bir noktanın **Panorama seç…** ya da bir objenin **Model** kutusuna
tıklayınca açılır.

| | Panoramalar | 3D modeller |
| --- | --- | --- |
| **Biçimler** | `.jpg` `.jpeg` `.png` `.webp` `.jfif` | `.glb` (tek dosya) |
| **En büyük boyut** | 60 MB | 150 MB |
| **Öneri** | Eşdikdörtgen (2:1 oranlı, ör. 6000×3000) 360° fotoğraf | Dokuları içine gömülü glTF Binary |

- **Yükleme:** **Dosya yükle** → dosyayı seçin. İlerleme çubuğu gösterilir; bitince dosya
  listede seçili olarak görünür.
- **Seçme:** Bir karta tıklayın. O an kullanılan dosya yeşil çerçeveyle işaretlidir.
- **Silme:** Kartın üzerine gelince sağ üstte çıkan **×**. Dosya açık turda kullanılıyorsa
  uyarı verilir. Silme kalıcıdır.
- Aynı adlı dosyalar birbirinin üstüne yazılmaz; her yüklemeye kısa bir ek verilir.

> **.gltf + ayrı dokular kullanıyorsanız** önce Blender ya da
> [gltf.report](https://gltf.report) gibi bir araçla tek dosyalık `.glb`'ye dönüştürün.

---

## Kaydetme, açma ve paylaşma

| İşlem | Nasıl |
| --- | --- |
| **Adlandırma** | Sol üstteki tur adına tıklayıp yazın, `Enter`. |
| **Kaydet** | **Kaydet** ya da `Ctrl+S`. İlk kayıtta tur oluşturulur, sonrakilerde güncellenir. Kayıtla birlikte bir önizleme görseli de üretilir. |
| **Turlarım** | Kayıtlı tüm turları önizleme görselleriyle listeler. Her kartta **Aç**, **Link** (paylaşım linkini kopyalar) ve **Sil** vardır. Açık olan tur "Açık" etiketiyle işaretlidir. |
| **Yeni** | Boş bir tura başlar. |
| **Paylaş** | Turu kaydeder ve paylaşım linkini panoya kopyalar. |

**Kaybetmemek için:**
- Kaydedilmemiş değişiklik varken **Yeni** ya da başka bir turu açmak onay ister.
- Sekmeyi kapatırken tarayıcı uyarır.
- Kaydedilmiş bir turda sayfayı yenilerseniz (adres `?edit=…` içerir) aynı tur yeniden açılır.

---

## Önizleme ve paylaşım görünümü

**▶ Önizle**, turu izleyicinin göreceği şekilde açar: panorama tam ekran, harita küçük
ve sağ altta, düzenleme araçları gizli.

- Tur **başlangıç noktasından** başlar. Builder'da bir panorama açıksa önizleme oradan başlar.
- **3D modele tıklamak**, objenin adını ve açıklamasını gösteren bilgi panelini açar.
- **✎ Düzenlemeye dön** ile builder'a dönülür.

**Paylaşım linki** (`…/app/?tour=<id>`) aynı görünümü açar, ancak düzenlemeye dönüş
düğmesi yoktur. Linki alan kişi turu sadece gezebilir.

> Paylaşılan link, sunucunun erişilebilir olduğu adreste çalışır. Yalnızca kendi
> bilgisayarınızda (`127.0.0.1`) çalıştırıyorsanız link de yalnızca sizde açılır.
> Başkalarıyla paylaşmak için uygulamayı ağdaki ya da internetteki bir sunucuda yayınlayın.

---

## Klavye ve fare kısayolları

### Klavye
| Kısayol | İşlev |
| --- | --- |
| `R` | Dikdörtgen oda aracı |
| `C` | Daire oda aracı |
| `N` | Panorama noktası aracı |
| `O` | 3D obje aracı |
| `Delete` / `Backspace` | Seçileni sil |
| `Ctrl + D` | Seçileni çoğalt |
| `Ctrl + Z` | Geri al |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Yinele |
| `Ctrl + S` | Kaydet |
| Ok tuşları | Seçileni 1 px kaydır (`Shift` ile 10 px) |
| `Esc` | Sırasıyla: aracı iptal et → seçimi bırak → panoramadan haritaya dön; açık pencereyi kapat |

Yazı alanlarındayken (tur adı, nokta adı vb.) kısayollar çalışmaz.

### Fare
| Hareket | İşlev |
| --- | --- |
| Tık | Öğeyi seç |
| `Shift` / `Ctrl` + tık | Seçime ekle / seçimden çıkar |
| Boş alanda sürükle | Kutu ile çoklu seçim |
| Öğeyi sürükle | Taşı |
| Noktaya çift tık | Panoramasını aç |
| Araç açıkken `Shift` + tık | Art arda nokta/obje ekle |
| Sağ tık (araç açıkken) | Aracı ve yarım kalan çizimi iptal et |
| Panoramada oka tık | O noktaya geç |
| Panoramada modele tık | Builder'da: objeyi seç · Önizlemede: bilgi panelini aç |

---

## İpuçları

- **Önce planı bitirin, sonra kilitleyin.** Odaları çizip birleştirdikten sonra
  kilitlerseniz nokta ve objeleri yerleştirirken planı yanlışlıkla bozmazsınız.
- **Noktaları fotoğrafın çekildiği yere koyun.** Yönlerin doğru çıkması için haritadaki
  konumlar gerçek çekim noktalarıyla uyumlu olmalı.
- **Menzili akıllıca ayarlayın.** Duvarla ayrılan iki odadaki noktaların birbirini
  "görmesini" istemiyorsanız menzili o mesafenin altında tutun.
- **Panoramanın kuzeyi:** Panorama ilk açıldığında haritada **yukarı** yöne bakılır.
  Fotoğraflarınızı çekerken başlangıç yönünü planın yukarısına denk getirirseniz oklar
  ve modeller fotoğraftaki kapı ve geçişlerle örtüşür.
- **Paylaşmadan önce önizleyin.** **▶ Önizle** ile tüm geçişleri bir kez gezin.

---

## Sorun giderme

| Belirti | Çözüm |
| --- | --- |
| *"Sunucuya bağlanılamadı. Backend çalışıyor mu?"* | Backend'i başlatın (`uvicorn main:app --reload`) ve sayfayı `http://127.0.0.1:8000` üzerinden açın. |
| Panoramada bir obje görünmüyor | Obje, açık noktanın **görüş menzili** içinde mi? Noktayı seçip halkaya bakın. Sonra modelin yönüne dönün; küçük haritadaki sarı koni yön bulmanıza yardımcı olur. |
| Panoramada diğer noktaya ok yok | Diğer noktanın **panoraması atanmış** mı (gri değil mi) ve menzilin içinde mi? |
| *"Önizleme için panoraması seçilmiş en az bir nokta gerekli."* | En az bir noktaya panorama atayın. |
| Model yüklenemiyor | Dosya gerçekten `.glb` mi? `.gltf` ise önce `.glb`'ye dönüştürün. |
| Panorama yamuk ya da gerilmiş görünüyor | Fotoğraf eşdikdörtgen (2:1) 360° biçimde olmalı. Normal geniş açı fotoğraflar uygun değildir. |
| Güncellemeden sonra arayüz garip davranıyor | Sayfayı bir kez `Ctrl + F5` ile yenileyin (eski dosyalar önbellekte kalmış olabilir). |
| Paylaşılan link başkasında açılmıyor | Uygulama sadece kendi bilgisayarınızda çalışıyor olabilir; [Önizleme ve paylaşım görünümü](#önizleme-ve-paylaşım-görünümü) bölümündeki nota bakın. |

---

## Geliştiriciler için

### Proje yapısı
```
panoromic_visit_builder/
├── backend/
│   ├── main.py            # FastAPI uç noktaları; /app altında arayüzü de sunar
│   ├── storage.py         # SQLite (turlar) + disk (dosyalar) işlemleri
│   ├── settings.py        # Yollar ve limitler (ortam değişkenleriyle değiştirilebilir)
│   ├── migrate_legacy.py  # Eski tour_data.json verisini bir kez içe aktarır
│   └── data/              # (git dışı) tours.db + media/{panoramas,models,previews}
└── frontend/
    ├── index.html, style.css
    ├── assets/            # Uygulamayla gelen varsayılanlar (ikon, örnek kutu modeli)
    └── js/
        ├── main.js        # Giriş noktası: modlar, kısayollar, açılış akışı
        ├── core/          # config, api istemcisi, durum, olay yolu, arayüz yardımcıları
        ├── editor/        # Konva sahnesi, varlıklar, seçim, araçlar, kayıt ve geçmiş
        ├── panels/        # Özellik paneli, kütüphane, turlar, obje bilgisi
        └── panorama/      # Photo Sphere Viewer gezinmesi + 3D model eklentisi
```

### Kullanılan teknolojiler
- **Backend:** Python, FastAPI, SQLite (standart kütüphane)
- **Frontend:** Derleme adımı olmayan ES modülleri;
  [Konva](https://konvajs.org) 9.3 (harita),
  [Photo Sphere Viewer](https://photo-sphere-viewer.js.org) 5.15 (panorama),
  [three.js](https://threejs.org) 0.185 (3D modeller),
  [Quill](https://quilljs.com) 2 (metin editörü),
  [PolyBool](https://github.com/velipso/polybooljs) (oda birleştirme).
  Tüm kütüphaneler CDN'den sabit sürümle yüklenir.

> Photo Sphere Viewer 5.15, three.js `^0.185` ile derlenmiştir. Sürüm yükseltirken
> `index.html` içindeki import map'te ikisini birlikte güncelleyin.

### Veri modeli
Bir tur, Konva içerik katmanının JSON'ı olarak saklanır (`scene.layer`). Üç düğüm türü vardır:

| Düğüm | Konva sınıfı | Özel alanlar |
| --- | --- | --- |
| `room` | Rect / Circle / Line | `locked` |
| `hotspot` | Group (`hotspot-range`, `hotspot-dot`) | `panorama`, `label`, `isStart` |
| `object` | Rect | `modelUrl`, `modelScale`, `modelRotX/Y/Z`, `modelPitch`, `objectName`, `objectDescription` |

Dosya adresleri göreli tutulur (`/media/panoramas/…`), böylece turlar sunucu adresinden bağımsızdır.

### API
| Yöntem | Yol | Açıklama |
| --- | --- | --- |
| GET | `/api/health` | Sağlık kontrolü |
| GET | `/api/tours` | Tur listesi (ad, tarihler, önizleme adresi) |
| GET | `/api/tours/{id}` | Tur ve sahnesi |
| POST | `/api/tours` | Yeni tur — `{ name, scene, preview? }` |
| PUT | `/api/tours/{id}` | Turu güncelle — alanların hepsi isteğe bağlı |
| DELETE | `/api/tours/{id}` | Turu ve önizlemesini sil |
| GET | `/api/assets/{panoramas\|models}` | Dosya listesi |
| POST | `/api/assets/{panoramas\|models}` | Dosya yükle (multipart, alan adı `file`) |
| DELETE | `/api/assets/{kind}/{filename}` | Dosya sil |

Etkileşimli API belgeleri: <http://127.0.0.1:8000/docs>

### Ortam değişkenleri
| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `DATA_DIR` | `backend/data` | Veritabanı ve yüklemelerin klasörü |
| `FRONTEND_DIR` | `frontend` | Backend'in `/app` altında sunacağı arayüz |
| `LEGACY_ASSETS_DIR` | `frontend/assets` | Eski sürüm verisinin aranacağı yer |
| `MAX_PANORAMA_MB` | `60` | Panorama yükleme sınırı |
| `MAX_MODEL_MB` | `150` | Model yükleme sınırı |
| `CORS_ORIGINS` | 5500 ve 8080 portları | Farklı adresten erişim izni (virgülle ayrılmış) |

### Yedekleme
Tüm kullanıcı verisi `DATA_DIR` içindedir: `tours.db` ve `media/` klasörü. Bu klasörü
kopyalamak tam yedek için yeterlidir. Docker'da `panoramic-data` volume'ünü yedekleyin.

### Eski sürümden geçiş
İlk açılışta `frontend/assets/tourdata/tour_data.json` içindeki turlar ve
`frontend/assets/{panorama,3dmodels}` altındaki dosyalar yeni yapıya **kopyalanır**
(orijinaller silinmez). Eski `http://127.0.0.1:8000/...` adresleri göreli `/media/...`
adreslerine çevrilir. İşlem `data/.legacy_migrated` dosyasıyla bir kez yapılır; tekrar
çalıştırmak için bu dosyayı silin.

### Bilinen sınırlamalar
- Kimlik doğrulama yok. Sunucuya erişebilen herkes tur ekleyip silebilir; uygulamayı
  internete açmadan önce bir giriş katmanı ekleyin.
- Harita alanı 1200 × 800 px'tir; yakınlaştırma ve kaydırma yoktur.
- İç içe geçmiş delikli şekiller birleştirilirken delik ayrı bir parça olarak çizilir.
- Eski sürümden aktarılan turların önizleme görselleri tur bir kez açılıp kaydedilince yenilenir.
