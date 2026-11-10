"""Turların SQLite'ta, dosyaların diskte saklanması."""

import json
import re
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from settings import ASSET_KINDS, DB_PATH, MEDIA_DIR

TOUR_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def ensure_dirs() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    for kind in ASSET_KINDS:
        (MEDIA_DIR / kind).mkdir(parents=True, exist_ok=True)
    (MEDIA_DIR / "previews").mkdir(parents=True, exist_ok=True)


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    ensure_dirs()
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tours (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                scene       TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            )
            """
        )


# ---------------------------------------------------------------- turlar

def new_tour_id() -> str:
    return "tour_" + uuid.uuid4().hex[:12]


def preview_path(tour_id: str) -> Path:
    return MEDIA_DIR / "previews" / f"{tour_id}.png"


def preview_url(tour_id: str) -> str | None:
    p = preview_path(tour_id)
    if not p.exists():
        return None
    # mtime'ı ekleyerek tarayıcı önbelleğini güncel tutuyoruz
    return f"/media/previews/{tour_id}.png?v={int(p.stat().st_mtime)}"


def _summary(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "preview_url": preview_url(row["id"]),
    }


def list_tours() -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, name, created_at, updated_at FROM tours ORDER BY updated_at DESC"
        ).fetchall()
    return [_summary(r) for r in rows]


def get_tour(tour_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM tours WHERE id = ?", (tour_id,)).fetchone()
    if not row:
        return None
    return {**_summary(row), "scene": json.loads(row["scene"])}


def create_tour(name: str, scene: dict, tour_id: str | None = None,
                created_at: str | None = None, updated_at: str | None = None) -> dict:
    tour_id = tour_id or new_tour_id()
    created = created_at or now_iso()
    updated = updated_at or created
    with connect() as conn:
        conn.execute(
            "INSERT INTO tours (id, name, scene, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (tour_id, name, json.dumps(scene, ensure_ascii=False), created, updated),
        )
    return get_tour(tour_id)


def update_tour(tour_id: str, name: str | None, scene: dict | None) -> dict | None:
    sets, params = ["updated_at = ?"], [now_iso()]
    if name is not None:
        sets.append("name = ?")
        params.append(name)
    if scene is not None:
        sets.append("scene = ?")
        params.append(json.dumps(scene, ensure_ascii=False))
    params.append(tour_id)
    with connect() as conn:
        cur = conn.execute(f"UPDATE tours SET {', '.join(sets)} WHERE id = ?", params)
        if cur.rowcount == 0:
            return None
    return get_tour(tour_id)


def delete_tour(tour_id: str) -> bool:
    with connect() as conn:
        cur = conn.execute("DELETE FROM tours WHERE id = ?", (tour_id,))
    preview_path(tour_id).unlink(missing_ok=True)
    return cur.rowcount > 0


def save_preview(tour_id: str, png_bytes: bytes) -> None:
    tmp = preview_path(tour_id).with_suffix(".tmp")
    tmp.write_bytes(png_bytes)
    tmp.replace(preview_path(tour_id))


# ---------------------------------------------------------------- dosyalar

_SAFE_CHARS = re.compile(r"[^A-Za-z0-9._-]+")


def safe_filename(original: str, ext: str) -> str:
    """Kullanıcının verdiği adı temizler ve çakışmayı önlemek için kısa bir ek koyar.
    Yol ayırıcıları atıldığı için '../' ile klasör dışına yazmak mümkün değildir."""
    stem = Path(original.replace("\\", "/").split("/")[-1]).stem
    stem = _SAFE_CHARS.sub("-", stem).strip("-.")[:60] or "dosya"
    return f"{stem}-{uuid.uuid4().hex[:6]}{ext}"


def asset_dir(kind: str) -> Path:
    return MEDIA_DIR / kind


def asset_url(kind: str, filename: str) -> str:
    return f"/media/{kind}/{filename}"


def list_assets(kind: str) -> list[dict]:
    exts = ASSET_KINDS[kind]["extensions"]
    files = [
        p for p in asset_dir(kind).iterdir()
        if p.is_file() and p.suffix.lower() in exts
    ]
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return [
        {"filename": p.name, "url": asset_url(kind, p.name), "size": p.stat().st_size}
        for p in files
    ]


def resolve_asset(kind: str, filename: str) -> Path | None:
    """Verilen ad gerçekten o klasörün içindeki bir dosyaysa yolunu döndürür."""
    base = asset_dir(kind).resolve()
    candidate = (base / filename).resolve()
    if candidate.parent != base or not candidate.is_file():
        return None
    return candidate
