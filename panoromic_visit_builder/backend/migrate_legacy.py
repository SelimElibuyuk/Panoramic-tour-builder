"""Eski sürümün verilerini (frontend/assets/tourdata/tour_data.json ve
frontend/assets altına yüklenmiş dosyalar) yeni yapıya bir kez taşır.

Eski kayıtlar Konva sahnesinin tamamını (transformer'lar, seçim kutusu dahil)
ve 'http://127.0.0.1:8000/...' gibi sabit adresleri içeriyordu. Burada:
  * yalnızca içerik düğümleri alınır,
  * düğüm adları yeni şemaya çevrilir (room / hotspot / object),
  * dosya adresleri göreli '/media/...' adreslerine çevrilir.
"""

import json
import logging
import shutil
from datetime import datetime, timezone

import storage
from settings import DATA_DIR, LEGACY_ASSETS_DIR, MEDIA_DIR

log = logging.getLogger("migrate")

MARKER = DATA_DIR / ".legacy_migrated"
SCENE_VERSION = 2

URL_PREFIXES = [
    ("http://127.0.0.1:8000/panorama-assets/", "/media/panoramas/"),
    ("http://localhost:8000/panorama-assets/", "/media/panoramas/"),
    ("/panorama-assets/", "/media/panoramas/"),
    ("assets/panorama/", "/media/panoramas/"),
    ("http://127.0.0.1:8000/model-assets/", "/media/models/"),
    ("http://localhost:8000/model-assets/", "/media/models/"),
    ("/model-assets/", "/media/models/"),
    ("assets/3dmodels/", "/media/models/"),
]


def rewrite_url(url):
    if not isinstance(url, str):
        return url
    for old, new in URL_PREFIXES:
        if url.startswith(old):
            return new + url[len(old):]
    return url


def _convert_hotspot_group(node):
    attrs = dict(node.get("attrs", {}))
    attrs["name"] = "hotspot"
    children = []
    for ch in node.get("children", []):
        ca = dict(ch.get("attrs", {}))
        name = ca.get("name")
        if name in ("hotspot-obje", "panorama-hotspot-obje"):
            if "panorama" in ca:
                attrs["panorama"] = rewrite_url(ca.pop("panorama"))
            ca.update(name="hotspot-dot", fill="#111827", stroke="#ffffff", strokeWidth=2)
            ca.pop("id", None)
            children.append({"attrs": ca, "className": "Circle"})
        elif name == "hotspot-vision":
            scale = float(ca.pop("scaleX", 1) or 1)
            ca.pop("scaleY", None)
            ca["radius"] = round(float(ca.get("radius", 200)) * scale, 2)
            ca.update(name="hotspot-range", visible=False, listening=False)
            children.append({"attrs": ca, "className": "Circle"})
        # vision-cone vb. geçici düğümler atlanır
    attrs.setdefault("panorama", "/media/panoramas/panorama.jfif")
    attrs.setdefault("draggable", True)
    # Önce menzil, sonra nokta (nokta üstte kalsın)
    children.sort(key=lambda c: 0 if c["attrs"].get("name") == "hotspot-range" else 1)
    return {"attrs": attrs, "className": "Group", "children": children}


def convert_konva_stage(stage: dict) -> dict:
    layer_children = []
    layers = stage.get("children", []) if stage else []
    source = layers[0].get("children", []) if layers else []
    for node in source:
        cls = node.get("className")
        attrs = dict(node.get("attrs", {}))
        name = attrs.get("name")
        if cls == "Transformer" or not name:
            continue
        if name in ("secilebilir-obje", "kilitli-obje", "gruplanmis-parca"):
            attrs["locked"] = name == "kilitli-obje"
            attrs["draggable"] = not attrs["locked"]
            attrs["name"] = "room"
            layer_children.append({"attrs": attrs, "className": cls})
        elif name == "hotspot-group":
            layer_children.append(_convert_hotspot_group(node))
        elif name == "object-obje":
            attrs["name"] = "object"
            attrs["draggable"] = True
            if "modelUrl" in attrs:
                attrs["modelUrl"] = rewrite_url(attrs["modelUrl"])
            layer_children.append({"attrs": attrs, "className": cls})
    return {"version": SCENE_VERSION, "layer": {"attrs": {}, "className": "Layer", "children": layer_children}}


def _parse_legacy_date(text):
    for fmt in ("%d.%m.%Y %H:%M:%S", "%m/%d/%Y, %I:%M:%S %p", "%d/%m/%Y %H:%M:%S"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc).isoformat(timespec="seconds")
        except (TypeError, ValueError):
            continue
    return None


def _copy_tree_contents(src, dst):
    if not src.is_dir():
        return
    for item in src.iterdir():
        target = dst / item.name
        if target.exists():
            continue
        if item.is_dir():
            shutil.copytree(item, target)
        else:
            shutil.copy2(item, target)


def run() -> None:
    if MARKER.exists():
        return
    storage.ensure_dirs()

    # 1) Eski dosyaları medya klasörlerine kopyala (orijinaller yerinde kalır)
    _copy_tree_contents(LEGACY_ASSETS_DIR / "panorama", MEDIA_DIR / "panoramas")
    _copy_tree_contents(LEGACY_ASSETS_DIR / "3dmodels", MEDIA_DIR / "models")

    # 2) Turları veritabanına aktar
    legacy_json = LEGACY_ASSETS_DIR / "tourdata" / "tour_data.json"
    imported = 0
    if legacy_json.exists():
        try:
            tours = json.loads(legacy_json.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            tours = []
        for t in tours:
            tid = str(t.get("id") or "")
            if not storage.TOUR_ID_RE.match(tid) or storage.get_tour(tid):
                continue
            scene = convert_konva_stage(t.get("konva_data") or {})
            date = _parse_legacy_date(t.get("tarih"))
            storage.create_tour(t.get("name") or "İsimsiz tur", scene, tour_id=tid,
                                created_at=date, updated_at=date)
            old_preview = LEGACY_ASSETS_DIR / "tourdata" / "previews" / f"{tid}.png"
            if old_preview.exists():
                shutil.copy2(old_preview, storage.preview_path(tid))
            imported += 1

    MARKER.write_text(datetime.now(timezone.utc).isoformat(), encoding="utf-8")
    if imported:
        log.warning("Eski sürümden %d tur aktarıldı.", imported)
