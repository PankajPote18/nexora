#!/usr/bin/env bash
# Installs and secures RabbitMQ for the reminder pipeline on the PRODUCTION VPS
# (backend/queues/rabbitmq.js, jobs/reminder.cron.js, workers/reminder.worker.js).
#
#   sudo bash /var/www/clickbuzz/deploy/rabbitmq-setup.sh
#
# Safe to re-run. What it does:
#   - apt-installs rabbitmq-server (Ubuntu repo) and enables it at boot
#   - binds AMQP (5672) and Erlang distribution to 127.0.0.1 only
#   - creates vhost "clickbuz" and user "clickbuz" with a random password
#     (re-running rotates that password), and removes the default guest user
#   - writes RABBITMQ_URL into backend/.env (never prints the password)
# The app declares its own queues (reminder_queue, reminder_queue_failed —
# both durable) on first connect; nothing to pre-create here.
# Afterwards restart the backend so it reads the new RABBITMQ_URL:
#   pm2 restart clickbuzz-backend
set -euo pipefail

APP_ENV_FILE="${APP_ENV_FILE:-/var/www/clickbuzz/backend/.env}"
RMQ_USER="clickbuz"
RMQ_VHOST="clickbuz"

if [[ $EUID -ne 0 ]]; then echo "Run as root (sudo)." >&2; exit 1; fi
if [[ ! -f "$APP_ENV_FILE" ]]; then echo "Backend env file not found: $APP_ENV_FILE" >&2; exit 1; fi

echo "==> Installing rabbitmq-server"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq rabbitmq-server

echo "==> Binding RabbitMQ to localhost only"
install -d -m 755 /etc/rabbitmq
cat > /etc/rabbitmq/rabbitmq.conf <<'EOF'
# Managed by deploy/rabbitmq-setup.sh — private to this VPS.
listeners.tcp.default = 127.0.0.1:5672
loopback_users.guest = true
EOF
cat > /etc/rabbitmq/rabbitmq-env.conf <<'EOF'
# Managed by deploy/rabbitmq-setup.sh
NODE_IP_ADDRESS=127.0.0.1
ERL_EPMD_ADDRESS=127.0.0.1
SERVER_ADDITIONAL_ERL_ARGS="-kernel inet_dist_use_interface {127,0,0,1}"
EOF

systemctl enable rabbitmq-server
systemctl restart rabbitmq-server
rabbitmqctl -q await_startup --timeout 120

echo "==> Creating vhost/user"
RMQ_PASS="$(openssl rand -hex 24)"   # hex: no characters that need URL-encoding
rabbitmqctl -q list_vhosts | grep -qx "$RMQ_VHOST" || rabbitmqctl -q add_vhost "$RMQ_VHOST"
# Password via stdin, not argv, so it never shows up in `ps`.
if rabbitmqctl -q list_users | awk '{print $1}' | grep -qx "$RMQ_USER"; then
    printf '%s' "$RMQ_PASS" | rabbitmqctl -q change_password "$RMQ_USER"
else
    printf '%s' "$RMQ_PASS" | rabbitmqctl -q add_user "$RMQ_USER"
fi
rabbitmqctl -q set_permissions -p "$RMQ_VHOST" "$RMQ_USER" ".*" ".*" ".*"
rabbitmqctl -q list_users | awk '{print $1}' | grep -qx guest && rabbitmqctl -q delete_user guest || true

echo "==> Writing RABBITMQ_URL to $APP_ENV_FILE (backup: ${APP_ENV_FILE}.bak-rabbitmq)"
cp -p "$APP_ENV_FILE" "${APP_ENV_FILE}.bak-rabbitmq"
NEW_LINE="RABBITMQ_URL=amqp://${RMQ_USER}:${RMQ_PASS}@127.0.0.1:5672/${RMQ_VHOST}"
if grep -q '^RABBITMQ_URL=' "$APP_ENV_FILE"; then
    # Replace in place without echoing the value.
    awk -v line="$NEW_LINE" '/^RABBITMQ_URL=/{print line; next} {print}' "$APP_ENV_FILE" > "${APP_ENV_FILE}.tmp"
    cat "${APP_ENV_FILE}.tmp" > "$APP_ENV_FILE" && rm -f "${APP_ENV_FILE}.tmp"
else
    printf '\n%s\n' "$NEW_LINE" >> "$APP_ENV_FILE"
fi
chmod 600 "$APP_ENV_FILE" "${APP_ENV_FILE}.bak-rabbitmq"
unset RMQ_PASS NEW_LINE

echo "==> Listening sockets (expect 127.0.0.1 only):"
ss -ltnp | grep -E ':(5672|25672|15672)\b' || true
echo
echo "Done. Now run:  pm2 restart clickbuzz-backend"
echo "Then check:     pm2 logs clickbuzz-backend --lines 50 | grep -E 'rabbitmq|reminder'"
echo "Expect:         [rabbitmq] connected (amqp://clickbuz:***@127.0.0.1:5672/clickbuz)"
