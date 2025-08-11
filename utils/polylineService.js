const db = require("../config/db"); // adjust path if needed

/**
 * Save polylines to database
 * @param {Number} vendorId 
 * @param {Number} customerId 
 * @param {String} vendorToCustomerPolyline 
 * @param {Array} riderPolylines [{ riderId, polyline }]
 */
async function savePolylines(vendorId, customerId, vendorToCustomerPolyline, riderPolylines) {
    try {
        // 1️⃣ Save Vendor → Customer only if not already stored
        const [vendorCustomerRows] = await db.query(
            `SELECT id FROM vendor_customer_polylines 
             WHERE vendor_id = ? AND customer_id = ? LIMIT 1`,
            [vendorId, customerId]
        );

        if (vendorCustomerRows.length === 0) {
            await db.query(
                `INSERT INTO vendor_customer_polylines (vendor_id, customer_id, polyline) VALUES (?, ?, ?)`,
                [vendorId, customerId, vendorToCustomerPolyline]
            );
        }

        // 2️⃣ Save Rider → Vendor (one per rider)
        for (const rider of riderPolylines) {
            const [riderRows] = await db.query(
                `SELECT id FROM rider_vendor_polylines 
                 WHERE rider_id = ? AND vendor_id = ? LIMIT 1`,
                [rider.riderId, vendorId]
            );

            if (riderRows.length === 0) {
                await db.query(
                    `INSERT INTO rider_vendor_polylines (rider_id, vendor_id, polyline) VALUES (?, ?, ?)`,
                    [rider.riderId, vendorId, rider.polyline]
                );
            }
        }

        console.log("✅ Polylines saved successfully");
    } catch (err) {
        console.error("❌ Error saving polylines:", err);
        throw err;
    }
}

module.exports = savePolylines;
