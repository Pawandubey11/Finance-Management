server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # ── Gzip compression ──────────────────────────────────────
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;
    gzip_min_length 1024;

    # ── Static frontend files ─────────────────────────────────
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma        "no-cache";
        add_header Expires       "0";
    }

    # Cache static assets aggressively
    location ~* \.(css|js|ico|png|jpg|jpeg|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    # ── API reverse proxy → backend container ─────────────────
    location /api/ {
        proxy_pass         http://backend:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;

        # CORS headers (backend also sets these; nginx adds as a safety net)
        add_header Access-Control-Allow-Origin  "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    # ── Health check endpoint ─────────────────────────────────
    location /health {
        proxy_pass http://backend:5000/health;
    }

    # ── Security headers ──────────────────────────────────────
    add_header X-Frame-Options       "SAMEORIGIN"    always;
    add_header X-Content-Type-Options "nosniff"       always;
    add_header Referrer-Policy        "same-origin"   always;
}
