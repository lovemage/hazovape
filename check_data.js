const { Pool } = require('pg');

const connectionString = "postgresql://postgres:XhXrPCFUPGcbiTXbJhyVBGSbWEqYoshA@metro.proxy.rlwy.net:32642/railway";

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query('SELECT id, flavors FROM order_items LIMIT 20');
        console.log("Checking first 20 order items flavors:");
        res.rows.forEach(row => {
            console.log(`ID: ${row.id}, Type: ${typeof row.flavors}, Value: ${row.flavors}`);
            if (row.flavors) {
                try {
                    const parsed = JSON.parse(row.flavors);
                    console.log(`   -> Parsed Type: ${typeof parsed}, Is Array: ${Array.isArray(parsed)}, Value:`, parsed);
                } catch (e) {
                    console.log(`   -> Parse Error: ${e.message}`);
                }
            }
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
