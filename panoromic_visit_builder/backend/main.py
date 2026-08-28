from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import json
import os
import base64
import uuid

app = FastAPI()

origins = [
    "http://127.0.0.1:5500",
    "localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SAVE_DIR = "../frontend/assets/tourdata"
PREVIEW_DIR = os.path.join(SAVE_DIR, "previews")
os.makedirs(SAVE_DIR, exist_ok=True)
os.makedirs(PREVIEW_DIR, exist_ok=True)

# serve the previews folder as static files so the frontend can load them directly
app.mount("/previews", StaticFiles(directory=PREVIEW_DIR), name="previews")


def save_preview_image(tour_id: str, base64_data: str) -> str:
    """Decodes a base64 data URL and saves it as a PNG file. Returns the relative URL."""
    # base64_data looks like "data:image/png;base64,iVBORw0KG..."
    if "," in base64_data:
        header, encoded = base64_data.split(",", 1)
    else:
        encoded = base64_data

    image_bytes = base64.b64decode(encoded)
    file_name = f"{tour_id}.png"
    file_path = os.path.join(PREVIEW_DIR, file_name)

    with open(file_path, "wb") as f:
        f.write(image_bytes)

    return f"/previews/{file_name}"


@app.post("/api/save-map")
async def save_map(request: Request):
    data = await request.json()
    tour_id = data.get("id")

    # handle preview image, if the frontend sent one
    preview_image_data = data.pop("preview_image_base64", None)  # remove raw base64 before saving JSON
    if preview_image_data:
        preview_url = save_preview_image(tour_id, preview_image_data)
        data["preview_image"] = preview_url  # store just the URL/path in the JSON record

    file_path = os.path.join(SAVE_DIR, "tour_data.json")

    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                tours = json.load(f)
        except json.JSONDecodeError:
            tours = []
    else:
        tours = []

    existing_tour = next((t for t in tours if t.get("id") == tour_id), None)

    if existing_tour:
        # keep the old preview_image if this save didn't include a new one
        if "preview_image" not in data and "preview_image" in existing_tour:
            data["preview_image"] = existing_tour["preview_image"]
        tours.remove(existing_tour)
        tours.append(data)
        mesaj = f"'{data.get('name')}' başarıyla güncellendi!"
    else:
        tours.append(data)
        mesaj = f"'{data.get('name')}' yeni bir tur olarak kaydedildi!"

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(tours, f, ensure_ascii=False, indent=4)

    return {"mesaj": mesaj, "id": tour_id}


@app.get("/api/get-tours")
async def get_tours():
    file_path = os.path.join(SAVE_DIR, "tour_data.json")

    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                tours = json.load(f)
                return tours
        except json.JSONDecodeError:
            return []

    return []


@app.delete("/api/delete-tour/{tour_id}")
async def delete_tour(tour_id: str):
    file_path = os.path.join(SAVE_DIR, "tour_data.json")

    if not os.path.exists(file_path):
        return {"hata": "Dosya bulunamadı"}

    with open(file_path, "r", encoding="utf-8") as f:
        tours = json.load(f)

    guncel_turlar = [t for t in tours if t.get("id") != tour_id]

    if len(tours) != len(guncel_turlar):
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(guncel_turlar, f, ensure_ascii=False, indent=4)

        # also clean up the preview image file
        preview_path = os.path.join(PREVIEW_DIR, f"{tour_id}.png")
        if os.path.exists(preview_path):
            os.remove(preview_path)

        return {"mesaj": "Tur başarıyla silindi!"}

    return {"hata": "Tur bulunamadı"}