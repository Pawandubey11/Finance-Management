FROM nginx:1.27-alpine

LABEL maintainer="Pawan Dubey <pawandubey620438@iilm.edu>"
LABEL description="FinanceFlow Frontend (Nginx)"

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static frontend files
COPY index.html   /usr/share/nginx/html/index.html
COPY app.html     /usr/share/nginx/html/app.html
COPY styles.css   /usr/share/nginx/html/styles.css
COPY script.js    /usr/share/nginx/html/script.js

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1
