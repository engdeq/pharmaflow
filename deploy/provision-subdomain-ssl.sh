#!/usr/bin/env bash
# Issue/renew Let's Encrypt cert for one pharmacy subdomain after DNS A record exists.
# Usage: ./provision-subdomain-ssl.sh shafi
set -euo pipefail
SLUG="${1:-}"
BASE="${MEDAXIS_BASE_DOMAIN:-medaxis.dirshay.com}"
if [[ -z "$SLUG" ]]; then
  echo "Usage: $0 <slug>"
  exit 1
fi
HOST="${SLUG}.${BASE}"
echo "Provisioning SSL for ${HOST}"
certbot --nginx -d "$HOST" --non-interactive --agree-tos --register-unsafely-without-email --expand || \
  certbot --nginx -d "$HOST" -d "$BASE" --non-interactive --agree-tos --register-unsafely-without-email --expand
nginx -t && systemctl reload nginx
echo "OK https://${HOST}"
