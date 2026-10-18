# FinFTech frontend - imagen Nginx
FROM nginx:1.27-alpine

# PÃƒÂ¡ginas generadas desde el diseÃƒÂ±o de Stitch y assets funcionales
COPY public/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
