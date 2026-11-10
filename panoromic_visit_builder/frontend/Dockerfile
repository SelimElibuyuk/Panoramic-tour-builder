FROM nginx:1.27-alpine

# Frontend /app/ altında sunulur; /api ve /media istekleri backend'e aktarılır.
COPY panoromic_visit_builder/frontend /usr/share/nginx/html/app
COPY panoromic_visit_builder/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
