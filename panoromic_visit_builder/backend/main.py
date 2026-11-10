"""Panoramik Tur Oluşturucu - API

Çalıştırma (backend klasöründen):
    uvicorn main:app --reload
Ardından tarayıcıda http://127.0.0.1:8000 adresini açın; frontend de buradan sunulur.
"""

import base64
import binascii
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, Path as PathParam, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import migrate_legacy
import storage
from settings import ASSET_KINDS, CORS_ORIGINS, FRONTEND_DIR, MAX_PREVIEW_BYTES, MEDIA_DIR

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
GLB_MAGIC = b"glTF"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    storage.init_db()
    migrate_legacy.run()
    yield


app = FastAPI(title="Panoramik Tur Oluşturucu", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- modeller

class TourIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    scene: dict
    preview: str | None = None  # "data:image/png;base64,..."


class TourPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    scene: dict | None = None
    preview: str | None = None


TourId = Annotated[str, PathParam(pattern=storage.TOUR_ID_RE.pattern)]


def _validate_scene(scene: dict) -> None:
    layer = scene.get("layer") if isinstance(scene, dict) else None
    if not isinstance(layer, dict) or layer.get("className") != "Layer":
        raise HTTPException(422, "Geçersiz sahne verisi.")


def _decode_preview(data_url: str | None) -> bytes | None:
    """Önizlemeyi kayıttan ÖNCE doğrular; hatalıysa tur hiç değişmez."""
    if not data_url:
        return None
    encoded = data_url.split(",", 1)[1] if "," in data_url else data_url
    try:
        png = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(422, "Önizleme görseli çözümlenemedi.")
    if len(png) > MAX_PREVIEW_BYTES or not png.startswith(PNG_MAGIC):
        raise HTTPException(422, "Önizleme görseli geçersiz.")
    return png


# ---------------------------------------------------------------- turlar

@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/tours")
def list_tours():
    return storage.list_tours()


@app.get("/api/tours/{tour_id}")
def get_tour(tour_id: TourId):
    tour = storage.get_tour(tour_id)
    if not tour:
        raise HTTPException(404, "Tur bulunamadı.")
    return tour


@app.post("/api/tours", status_code=201)
def create_tour(body: TourIn):
    _validate_scene(body.scene)
    preview = _decode_preview(body.preview)
    tour = storage.create_tour(body.name.strip(), body.scene)
    if preview:
        storage.save_preview(tour["id"], preview)
    return storage.get_tour(tour["id"])


@app.put("/api/tours/{tour_id}")
def update_tour(body: TourPatch, tour_id: TourId):
    if body.scene is not None:
        _validate_scene(body.scene)
    preview = _decode_preview(body.preview)
    name = body.name.strip() if body.name else None
    tour = storage.update_tour(tour_id, name, body.scene)
    if not tour:
        raise HTTPException(404, "Tur bulunamadı.")
    if preview:
        storage.save_preview(tour_id, preview)
    return storage.get_tour(tour_id)


@app.delete("/api/tours/{tour_id}", status_code=204)
def delete_tour(tour_id: TourId):
    if not storage.delete_tour(tour_id):
        raise HTTPException(404, "Tur bulunamadı.")


# ---------------------------------------------------------------- dosyalar

def _check_kind(kind: str) -> dict:
    cfg = ASSET_KINDS.get(kind)
    if not cfg:
        raise HTTPException(404, "Bilinmeyen dosya türü.")
    return cfg


@app.get("/api/assets/{kind}")
def list_assets(kind: str):
    _check_kind(kind)
    return storage.list_assets(kind)


@app.post("/api/assets/{kind}", status_code=201)
def upload_asset(kind: str, file: UploadFile = File(...)):
    cfg = _check_kind(kind)
    original = file.filename or "dosya"
    ext = "." + original.rsplit(".", 1)[-1].lower() if "." in original else ""
    if ext not in cfg["extensions"]:
        allowed = ", ".join(sorted(cfg["extensions"]))
        raise HTTPException(415, f"Desteklenmeyen dosya uzantısı. İzin verilenler: {allowed}")

    filename = storage.safe_filename(original, ext)
    target = storage.asset_dir(kind) / filename
    tmp = target.with_suffix(target.suffix + ".part")
    limit = cfg["max_mb"] * 1024 * 1024
    written = 0
    head = b""
    try:
        with tmp.open("wb") as out:
            while chunk := file.file.read(1024 * 1024):
                if not head:
                    head = chunk[:8]
                written += len(chunk)
                if written > limit:
                    raise HTTPException(413, f"Dosya çok büyük (en fazla {cfg['max_mb']} MB).")
                out.write(chunk)
        if written == 0:
            raise HTTPException(422, "Dosya boş.")
        if kind == "models" and not head.startswith(GLB_MAGIC):
            raise HTTPException(415, "Bu dosya geçerli bir .glb modeli değil.")
        tmp.replace(target)
    finally:
        tmp.unlink(missing_ok=True)

    return {"filename": filename, "url": storage.asset_url(kind, filename), "size": written}


@app.delete("/api/assets/{kind}/{filename}", status_code=204)
def delete_asset(kind: str, filename: str):
    _check_kind(kind)
    path = storage.resolve_asset(kind, filename)
    if not path:
        raise HTTPException(404, "Dosya bulunamadı.")
    path.unlink()


# ---------------------------------------------------------------- statik

storage.ensure_dirs()
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

if FRONTEND_DIR.is_dir():
    app.mount("/app", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

    @app.middleware("http")
    async def revalidate_frontend(request, call_next):
        # JS modülleri güncellendiğinde tarayıcı eski sürümleri karıştırmasın
        response = await call_next(request)
        if request.url.path.startswith("/app"):
            response.headers["Cache-Control"] = "no-cache"
        return response

    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse("/app/")
