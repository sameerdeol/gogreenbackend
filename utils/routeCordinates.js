// const db = require("../config/db"); // adjust path if needed

// function savePolylines(order_id, vendorId, customerId, vendorToCustomerPolyline, riderPolylines, callback) {
//   // Step 1: Check vendor → customer polyline by order
//   const sqlVendorCustomerCheck = `
//     SELECT id, polyline FROM vendor_customer_polylines 
//     WHERE order_id = ? AND vendor_id = ? AND customer_id = ? LIMIT 1
//   `;
//   db.query(sqlVendorCustomerCheck, [order_id, vendorId, customerId], (err, vendorCustomerRows) => {
//     if (err) {
//       console.error("❌ Error checking vendor-customer polyline:", err);
//       return callback(err);
//     }

//     function insertRiderPolylines(done) {
//       let index = 0;

//       function next() {
//         if (index === riderPolylines.length) {
//           console.log("✅ All rider polylines processed successfully");
//           return done(null);
//         }

//         const rider = riderPolylines[index];
//         const sqlRiderCheck = `
//           SELECT id, polyline FROM rider_vendor_polylines 
//           WHERE order_id = ? AND rider_id = ? AND vendor_id = ? LIMIT 1
//         `;

//         db.query(sqlRiderCheck, [order_id, rider.riderId, vendorId], (err, riderRows) => {
//           if (err) {
//             console.error("❌ Error checking rider-vendor polyline:", err);
//             return done(err);
//           }

//           if (riderRows.length === 0) {
//             // Insert new
//             const sqlInsertRider = `
//               INSERT INTO rider_vendor_polylines (order_id, rider_id, vendor_id, polyline) 
//               VALUES (?, ?, ?, ?)
//             `;
//             db.query(sqlInsertRider, [order_id, rider.riderId, vendorId, rider.polyline], (err) => {
//               if (err) {
//                 console.error("❌ Error inserting rider-vendor polyline:", err);
//                 return done(err);
//               }
//               index++;
//               next();
//             });
//           } else {
//             // Compare polyline → update if different
//             const existingPolyline = riderRows[0].polyline;
//             if (existingPolyline !== rider.polyline) {
//               const sqlUpdateRider = `
//                 UPDATE rider_vendor_polylines 
//                 SET polyline = ? 
//                 WHERE id = ?
//               `;
//               db.query(sqlUpdateRider, [rider.polyline, riderRows[0].id], (err) => {
//                 if (err) {
//                   console.error("❌ Error updating rider-vendor polyline:", err);
//                   return done(err);
//                 }
//                 index++;
//                 next();
//               });
//             } else {
//               // Same → skip
//               index++;
//               next();
//             }
//           }
//         });
//       }

//       next();
//     }

//     // Vendor → Customer
//     if (vendorCustomerRows.length === 0) {
//       const sqlInsertVendorCustomer = `
//         INSERT INTO vendor_customer_polylines (order_id, vendor_id, customer_id, polyline) 
//         VALUES (?, ?, ?, ?)
//       `;
//       db.query(sqlInsertVendorCustomer, [order_id, vendorId, customerId, vendorToCustomerPolyline], (err) => {
//         if (err) {
//           console.error("❌ Error inserting vendor-customer polyline:", err);
//           return callback(err);
//         }
//         insertRiderPolylines(callback);
//       });
//     } else {
//       // Compare polyline → update if different
//       const existingPolyline = vendorCustomerRows[0].polyline;
//       if (existingPolyline !== vendorToCustomerPolyline) {
//         const sqlUpdateVendorCustomer = `
//           UPDATE vendor_customer_polylines 
//           SET polyline = ? 
//           WHERE id = ?
//         `;
//         db.query(sqlUpdateVendorCustomer, [vendorToCustomerPolyline, vendorCustomerRows[0].id], (err) => {
//           if (err) {
//             console.error("❌ Error updating vendor-customer polyline:", err);
//             return callback(err);
//           }
//           insertRiderPolylines(callback);
//         });
//       } else {
//         // Same → skip
//         insertRiderPolylines(callback);
//       }
//     }
//   });
// }

// module.exports = savePolylines;
const db = require("../config/db");

function savePolylines(order_id, vendorId, customerId, vendorToCustomerPolyline, riderPolylines, callback) {
  // Step 1: Vendor → Customer (INSERT IGNORE)
  const sqlInsertVendorCustomer = `
    INSERT IGNORE INTO vendor_customer_polylines (order_id, vendor_id, customer_id, polyline) 
    VALUES (?, ?, ?, ?)
  `;
  
  db.query(sqlInsertVendorCustomer, [order_id, vendorId, customerId, vendorToCustomerPolyline], (err) => {
    if (err) {
      console.error("❌ Error inserting vendor-customer polyline:", err);
      return callback(err);
    }

    // Step 2: Rider → Vendor (UPSERT because location changes)
    function insertRiderPolylines(done) {
      let index = 0;

      function next() {
        if (index === riderPolylines.length) {
          console.log("✅ All rider polylines processed successfully");
          return done(null);
        }

        const rider = riderPolylines[index];

        const sqlInsertOrUpdateRider = `
          INSERT INTO rider_vendor_polylines (order_id, rider_id, vendor_id, polyline)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            polyline = VALUES(polyline),
            order_id = VALUES(order_id)
        `;

        db.query(sqlInsertOrUpdateRider, [order_id, rider.riderId, vendorId, rider.polyline], (err) => {
          if (err) {
            console.error("❌ Error inserting/updating rider-vendor polyline:", err);
            return done(err);
          }
          index++;
          next();
        });
      }

      next();
    }

    insertRiderPolylines(callback);
  });
}

function saveRouteCoordinates(order_id, vendorId, vendor_lng, vendor_lat, customerId, customerLat, customerLng, riderCoordinates, callback) {
    const values = riderCoordinates.map(r => [
        order_id,
        vendorId,
        vendor_lng,
        vendor_lat,
        customerId,
        r.riderId,
        r.rider_lat,
        r.rider_lng,
        customerLat,
        customerLng
    ]);

    const sql = `
        INSERT INTO route_coordinates 
        (order_id, vendor_id, vendor_lat, vendor_lng, customer_id, rider_id, rider_lat, rider_lng, customer_lat, customer_lng)
        VALUES ?
        ON DUPLICATE KEY UPDATE
            vendor_id = VALUES(vendor_id),
            vendor_lat = VALUES(vendor_lat),
            vendor_lng = VALUES(vendor_lng),
            customer_id = VALUES(customer_id),
            rider_id = VALUES(rider_id),
            rider_lat = VALUES(rider_lat),
            rider_lng = VALUES(rider_lng),
            customer_lat = VALUES(customer_lat),
            customer_lng = VALUES(customer_lng)
    `;

    db.query(sql, [values], (err, result) => {
        if (err) {
            console.error("❌ Error saving coordinates:", err);
            return callback(err);
        }
        callback(null, result);
    });
}



module.exports = {savePolylines, saveRouteCoordinates};

