#!/bin/bash

# This script installs postgresql-client-17 on Ubuntu
# It adds the official PostgreSQL repository if needed.

set -e

echo "🔍 Checking operating system..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    CODENAME=$VERSION_CODENAME
else
    echo "❌ Cannot determine OS. This script is for Ubuntu/Debian."
    exit 1
fi

echo "   OS: $OS ($CODENAME)"

echo "📦 Installing prerequisites..."
apt-get update
apt-get install -y curl ca-certificates gnupg lsb-release

echo "🔑 Adding PostgreSQL signing key..."
install -d /usr/share/postgresql-common/pgdg
curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc

echo "📂 Adding PostgreSQL repository..."
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${CODENAME}-pgdg main" > /etc/apt/sources.list.d/pgdg.list

echo "🔄 Updating package lists..."
apt-get update

echo "⬇️  Installing postgresql-client-17..."
apt-get install -y postgresql-client-17

echo "✅ Installation complete!"
echo "   pg_dump version:"
pg_dump --version
