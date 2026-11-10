"""Uygulama ayarları. Tüm yollar bu dosyanın konumuna göre çözülür,
böylece sunucu hangi klasörden başlatılırsa başlatılsın aynı çalışır.
Ortam değişkenleriyle (Docker vb.) geçersiz kılınabilir."""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent

# Kullanıcı verisi (veritabanı + yüklenen dosyalar) kaynak koddan ayrı tutulur.
DATA_DIR = Path(os.environ.get("DATA_DIR", BACKEND_DIR / "data")).resolve()
MEDIA_DIR = DATA_DIR / "media"
DB_PATH = DATA_DIR / "tours.db"

# Frontend'i backend'den de sunabilmek için (tek komutla geliştirme).
FRONTEND_DIR = Path(os.environ.get("FRONTEND_DIR", PROJECT_DIR / "frontend")).resolve()

# Eski sürümün verileri (tour_data.json + frontend/assets altındaki yüklemeler).
# İlk açılışta bir kez yeni yapıya taşınır.
LEGACY_ASSETS_DIR = Path(os.environ.get("LEGACY_ASSETS_DIR", FRONTEND_DIR / "assets")).resolve()

# Varlık türleri: klasör adı, izin verilen uzantılar, azami boyut (MB)
ASSET_KINDS = {
    "panoramas": {
        "extensions": {".jpg", ".jpeg", ".png", ".webp", ".jfif"},
        "max_mb": int(os.environ.get("MAX_PANORAMA_MB", 60)),
    },
    "models": {
        "extensions": {".glb"},
        "max_mb": int(os.environ.get("MAX_MODEL_MB", 150)),
    },
}

MAX_PREVIEW_BYTES = 3 * 1024 * 1024

# Ayrı bir origin'den (ör. VS Code Live Server) erişilecekse izin verilenler.
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ORIGINS",
        "http://127.0.0.1:5500,http://localhost:5500,http://localhost:8080,http://127.0.0.1:8080",
    ).split(",")
    if o.strip()
]
