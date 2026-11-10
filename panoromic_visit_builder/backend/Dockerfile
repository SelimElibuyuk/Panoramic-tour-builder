FROM python:3.14-slim

# uv'nin resmi imajından tek dosya halinde uv/uvx binary'lerini alıyoruz,
# pip ile ayrıca kurmaya gerek yok.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Yollar dosya konumuna göre çözülür; kullanıcı verisi DATA_DIR (volume) altında tutulur.
WORKDIR /app
ENV DATA_DIR=/data

# 1. Adım: sadece bağımlılıkları kur (proje kodu henüz yok).
# Bu katman, sadece pyproject.toml/uv.lock değişmediği sürece
# tekrar build'lerde önbellekten gelir, hızlı olur.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# 2. Adım: proje kodunu kopyala (main.py, storage.py, settings.py ...) ve
# projenin kendisini de kur.
COPY . .
RUN uv sync --frozen --no-dev

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
