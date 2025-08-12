const db = require("../config/db"); // adjust path if needed

function savePolylines(vendorId, customerId, vendorToCustomerPolyline, riderPolylines, callback) {
  // console.log("details",vendorId, customerId, vendorToCustomerPolyline, riderPolylines)
  // Step 1: Check if vendor → customer polyline exists
  const sqlVendorCustomerCheck = `
    SELECT id FROM vendor_customer_polylines 
    WHERE vendor_id = ? AND customer_id = ? LIMIT 1
  `;
  db.query(sqlVendorCustomerCheck, [vendorId, customerId], (err, vendorCustomerRows) => {
    if (err) {
      console.error("❌ Error checking vendor-customer polyline:", err);
      return callback(err);
    }

    function insertRiderPolylines(done) {
      let index = 0;

      function next() {
        if (index === riderPolylines.length) {
          console.log("✅ Polylines saved successfully");
          return done(null);
        }

        const rider = riderPolylines[index];
        const sqlRiderCheck = `
          SELECT id, polyline FROM rider_vendor_polylines 
          WHERE rider_id = ? AND vendor_id = ? LIMIT 1
        `;

        db.query(sqlRiderCheck, [rider.riderId, vendorId], (err, riderRows) => {
          if (err) {
            console.error("❌ Error checking rider-vendor polyline:", err);
            return done(err);
          }

          if (riderRows.length === 0) {
            // No record — insert new
            const sqlInsertRider = `
              INSERT INTO rider_vendor_polylines (rider_id, vendor_id, polyline) VALUES (?, ?, ?)
            `;
            db.query(sqlInsertRider, [rider.riderId, vendorId, rider.polyline], (err) => {
              if (err) {
                console.error("❌ Error inserting rider-vendor polyline:", err);
                return done(err);
              }
              index++;
              next();
            });
          } else {
            // Record exists — update if polyline is different
            const existingPolyline = riderRows[0].polyline;
            if (existingPolyline !== rider.polyline) {
              const sqlUpdateRider = `
                UPDATE rider_vendor_polylines 
                SET polyline = ? 
                WHERE id = ?
              `;
              db.query(sqlUpdateRider, [rider.polyline, riderRows[0].id], (err) => {
                if (err) {
                  console.error("❌ Error updating rider-vendor polyline:", err);
                  return done(err);
                }
                index++;
                next();
              });
            } else {
              // Same polyline — skip
              index++;
              next();
            }
          }
        });
      }

      next();
    }


    if (vendorCustomerRows.length === 0) {
      const sqlInsertVendorCustomer = `
        INSERT INTO vendor_customer_polylines (vendor_id, customer_id, polyline) VALUES (?, ?, ?)
      `;
      db.query(sqlInsertVendorCustomer, [vendorId, customerId, vendorToCustomerPolyline], (err) => {
        if (err) {
          console.error("❌ Error inserting vendor-customer polyline:", err);
          return callback(err);
        }
        // After insert, proceed to rider inserts
        insertRiderPolylines(callback);
      });
    } else {
      // Vendor-customer polyline already exists, just insert riders
      insertRiderPolylines(callback);
    }
  });
}

module.exports = savePolylines;