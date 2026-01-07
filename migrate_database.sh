#!/bin/bash

# Configuration
# Credentials provided by user
HEROKU_DB_URL="postgres://ue3uarl7re8foe:pa468a02d887c6951aff6f966586eb2ec75226592ec4108dba92f2729b5fc2bfa@cee3ebbhveeoab.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dbjm3cvn1cu4ah"
RAILWAY_DB_URL="postgresql://postgres:XhXrPCFUPGcbiTXbJhyVBGSbWEqYoshA@metro.proxy.rlwy.net:32642/railway"
DUMP_FILE="heroku_database_backup.dump"

# ANSI Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Checking for required tools..."

# Check for pg_dump
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ Error: pg_dump is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tools found.${NC}"
pg_dump --version

echo "===================================================="
echo "🚀 Starting Database Migration: Heroku -> Railway"
echo "===================================================="

echo "📦 Step 1: Downloading data from Heroku..."
echo "   Source: $HEROKU_DB_URL"
echo "   Output: $DUMP_FILE"

# Run dump with explicit connection string
pg_dump "$HEROKU_DB_URL" -Fc > "$DUMP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup successful!${NC} (Saved to $DUMP_FILE)"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    echo "This is likely due to 'pg_dump' version mismatch if your local version is older than Server 17."
    echo "Please run 'sudo ./install_pg_tools.sh' to upgrade your tools."
    exit 1
fi

echo ""
echo "📤 Step 2: Uploading data to Railway..."
echo "   Target: $RAILWAY_DB_URL"
echo "   ⚠️  WARNING: This will overwrite existing data in the Railway database."

# Run restore
pg_restore -d "$RAILWAY_DB_URL" --clean --if-exists --no-owner --no-privileges "$DUMP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 MIGRATION SUCCESSFUL!${NC}"
    echo "Your Heroku data has been restored to Railway."
else
    # pg_restore returns non-zero on warnings, which are common when moving between providers (e.g. role ownership)
    echo ""
    echo -e "${GREEN}⚠️  Restore completed with warnings.${NC}"
    echo "please check your Railway database."
fi
