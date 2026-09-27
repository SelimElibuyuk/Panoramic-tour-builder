FROM nginx:1.27-alpine

# JS dosyaları /panoromic_visit_builder/frontend/... diye MUTLAK yollarla
# import yapıyor. Bu yüzden nginx'in web kökü, projenin repo kökü olmalı
# (docker-compose.yml'deki context: . bunu sağlıyor).
COPY panoromic_visit_builder /usr/share/nginx/html/panoromic_visit_builder

COPY panoromic_visit_builder/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80