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
const db = require("../config/db"); // adjust path if needed

function savePolylines(order_id, vendorId, customerId, vendorToCustomerPolyline, riderPolylines, callback) {
  // Step 1: Vendor → Customer (still checking manually because uniqueness is per order)
  const sqlVendorCustomerCheck = `
    SELECT id, polyline FROM vendor_customer_polylines 
    WHERE order_id = ? AND vendor_id = ? AND customer_id = ? LIMIT 1
  `;
  db.query(sqlVendorCustomerCheck, [order_id, vendorId, customerId], (err, vendorCustomerRows) => {
    if (err) {
      console.error("❌ Error checking vendor-customer polyline:", err);
      return callback(err);
    }

    function insertRiderPolylines(done) {
      let index = 0;

      function next() {
        if (index === riderPolylines.length) {
          console.log("✅ All rider polylines processed successfully");
          return done(null);
        }

        const rider = riderPolylines[index];

        // UPSERT for rider-vendor polyline
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

    // Vendor → Customer
    if (vendorCustomerRows.length === 0) {
      const sqlInsertVendorCustomer = `
        INSERT INTO vendor_customer_polylines (order_id, vendor_id, customer_id, polyline) 
        VALUES (?, ?, ?, ?)
      `;
      db.query(sqlInsertVendorCustomer, [order_id, vendorId, customerId, vendorToCustomerPolyline], (err) => {
        if (err) {
          console.error("❌ Error inserting vendor-customer polyline:", err);
          return callback(err);
        }
        insertRiderPolylines(callback);
      });
    } else {
      // Compare polyline → update if different
      const existingPolyline = vendorCustomerRows[0].polyline;
      if (existingPolyline !== vendorToCustomerPolyline) {
        const sqlUpdateVendorCustomer = `
          UPDATE vendor_customer_polylines 
          SET polyline = ? 
          WHERE id = ?
        `;
        db.query(sqlUpdateVendorCustomer, [vendorToCustomerPolyline, vendorCustomerRows[0].id], (err) => {
          if (err) {
            console.error("❌ Error updating vendor-customer polyline:", err);
            return callback(err);
          }
          insertRiderPolylines(callback);
        });
      } else {
        // Same → skip
        insertRiderPolylines(callback);
      }
    }
  });
}

module.exports = savePolylines;
