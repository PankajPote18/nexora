#!/usr/bin/env bash
# Nightly PRODUCTION backup: MySQL dump + app config, kept on the VPS.
#
# One-time setup (as root):
#   1. Credentials file, readable by root only (NOT in the repo, NOT in cron):
#        install -m 600 /dev/null /root/.clickbuz-backup.cnf
#        nano /root/.clickbuz-backup.cnf
#          [client]
#          user=clickbuz
#          password=<the DB password from backend/.env>
#          host=127.0.0.1
#          port=3306
#   2. Test once:   sudo bash /var/www/clickbuzz/deploy/backup-mysql.sh
#   3. Schedule:    sudo cp /var/www/clickbuzz/deploy/cron/clickbuzz /etc/cron.d/clickbuzz
#
# Only ever deletes files it created itself (clickbuzz-db-*.sql.gz /
# clickbuzz-config-*.tar.gz under $BACKUP_DIR) — never touches other backups
# such as /root/railway_before_aiven_restore.sql.
# Uploaded media lives on Bunny Storage, not on this server — nothing to copy.
set -euo pipefail
umask 077

DB_NAME="${DB_NAME:-clickbuzz-database}"
CNF="${CNF:-/root/.clickbuz-backup.cnf}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/clickbuzz}"
KEEP_DAYS="${KEEP_DAYS:-14}"
APP_DIR="${APP_DIR:-/var/www/clickbuzz}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

DB_FILE="$BACKUP_DIR/clickbuzz-db-$STAMP.sql.gz"
echo "[backup] dumping $DB_NAME -> $DB_FILE"
# --single-transaction: consistent InnoDB snapshot without locking tables.
mysqldump --defaults-extra-file="$CNF" \
    --single-transaction --quick --routines --triggers --events \
    --default-character-set=utf8mb4 --no-tablespaces \
    "$DB_NAME" | gzip -6 > "$DB_FILE.partial"
mv "$DB_FILE.partial" "$DB_FILE"
gzip -t "$DB_FILE"

CONFIG_FILE="$BACKUP_DIR/clickbuzz-config-$STAMP.tar.gz"
echo "[backup] config -> $CONFIG_FILE"
tar -czf "$CONFIG_FILE" --ignore-failed-read \
    "$APP_DIR/backend/.env" \
    "$APP_DIR/.env" \
    /etc/nginx/sites-available \
    /etc/rabbitmq \
    2>/dev/null || true

echo "[backup] pruning own backups older than $KEEP_DAYS days"
find "$BACKUP_DIR" -maxdepth 1 -type f \
    \( -name 'clickbuzz-db-*.sql.gz' -o -name 'clickbuzz-config-*.tar.gz' \) \
    -mtime +"$KEEP_DAYS" -delete

echo "[backup] done: $(du -h "$DB_FILE" | cut -f1) database dump"
