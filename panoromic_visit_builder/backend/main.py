from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import os

app = FastAPI()

origins = [
    "http://127.0.0.1:5500",# Frontend'in çalıştığı port
]

# Frontend ile Backend'in haberleşebilmesi için CORS ayarı (CORS Hatasını önler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Sadece belirtilen origin'lerden gelen isteklere izin ver
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# JSON dosyasını frontend'in içindeki assets klasörüne kaydetmek istiyoruz
# (Backend'in çalıştığı yere göre yolu ayarlıyoruz)
SAVE_DIR = "../frontend/assets/tourdata"
os.makedirs(SAVE_DIR, exist_ok=True) # Eğer assets klasörü yoksa otomatik oluşturur

@app.post("/api/save-map")
async def save_map(request: Request):
    # 1. Frontend'den gelen paketlenmiş veriyi yakala
    data = await request.json()
    tour_id = data.get("id")
    
    file_path = os.path.join(SAVE_DIR, "tour_data.json")
    
    # 2. Dosya varsa içindeki listeyi oku, yoksa boş bir liste oluştur
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                tours = json.load(f)
        except json.JSONDecodeError:
            tours = []
    else:
        tours = []
        
    # 3. Bu ID'ye sahip bir tur zaten var mı kontrol et (Güncelleme mantığı)
    existing_tour = next((t for t in tours if t.get("id") == tour_id), None)
    
    if existing_tour:
        # Varsa, eski kaydı silip yenisini (güncelini) listeye ekliyoruz
        tours.remove(existing_tour)
        tours.append(data)
        mesaj = f"'{data.get('name')}' başarıyla güncellendi!"
    else:
        # Yoksa, doğrudan listeye yeni bir tur olarak ekliyoruz
        tours.append(data)
        mesaj = f"'{data.get('name')}' yeni bir tur olarak kaydedildi!"
        
    # 4. Güncellenmiş listeyi tekrar dosyaya yaz
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(tours, f, ensure_ascii=False, indent=4)
        
    return {"mesaj": mesaj, "id": tour_id}

@app.get("/api/get-tours")
async def get_tours():
    file_path = os.path.join(SAVE_DIR, "tour_data.json")
    
    # Dosya varsa içindeki listeyi oku ve frontend'e gönder
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                tours = json.load(f)
                return tours
        except json.JSONDecodeError:
            return []
            
    # Dosya henüz yoksa boş liste gönder
    return []

@app.delete("/api/delete-tour/{tour_id}")
async def delete_tour(tour_id: str):
    file_path = os.path.join(SAVE_DIR, "tour_data.json")
    
    if not os.path.exists(file_path):
        return {"hata": "Dosya bulunamadı"}
        
    with open(file_path, "r", encoding="utf-8") as f:
        tours = json.load(f)
        
    # Silinmek istenen turu listeden filtreleyerek çıkarıyoruz
    guncel_turlar = [t for t in tours if t.get("id") != tour_id]
    
    # Eğer listede eksilme olduysa (yani tur bulunup silindiyse) dosyayı güncelliyoruz
    if len(tours) != len(guncel_turlar):
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(guncel_turlar, f, ensure_ascii=False, indent=4)
        return {"mesaj": "Tur başarıyla silindi!"}
        
    return {"hata": "Tur bulunamadı"}