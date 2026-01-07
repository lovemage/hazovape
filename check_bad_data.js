const { Pool } = require('pg');

const connectionString = "postgresql://postgres:XhXrPCFUPGcbiTXbJhyVBGSbWEqYoshA@metro.proxy.rlwy.net:32642/railway";

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        // Check for flavors that don't look like JSON arrays (start with [)
        // Note: We check for flavors that are NOT NULL and don't start with [
        const res = await pool.query("SELECT id, flavors FROM order_items WHERE flavors IS NOT NULL AND TRIM(flavors) NOT LIKE '[%'");

        console.log(`Found ${res.rows.length} potentially bad rows.`);

        res.rows.forEach(row => {
            console.log(`ID: ${row.id}, Value: ${row.flavors}`);
        });

        // Also check for rows where JSON parsing might result in non-array
        const res2 = await pool.query("SELECT id, flavors FROM order_items LIMIT 1000");
        console.log("Deep checking 1000 rows...");
        let badCount = 0;
        res2.rows.forEach(row => {
            if (row.flavors) {
                try {
                    const parsed = JSON.parse(row.flavors);
                    if (!Array.isArray(parsed)) {
                        console.log(`[NON-ARRAY] ID: ${row.id}, Value: ${row.flavors}, Parsed type: ${typeof parsed}`);
                        badCount++;
                    }
                } catch (e) {
                    // Syntax error - this would crash backend, but good to know
                    console.log(`[SYNTAX ERROR] ID: ${row.id}, Value: ${row.flavors}, Error: ${e.message}`);
                    badCount++;
                }
            }
        });
        console.log(`Deep check found ${badCount} bad rows.`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
