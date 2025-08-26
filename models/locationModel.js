const db = require("../config/db");

const Location = {
    getPolyline: (order_id, callback) => {
        const sql = `select VC.polyline as vendor_customer_polyline,
                            RV.polyline as rider_vendor_polylines
                        from vendor_customer_polylines VC 
                        left join rider_vendor_polylines RV on VC.order_id = RV.order_id
                        where VC.order_id = ?`;
        db.query(sql, [order_id], callback);
    }
};

module.exports = Location;
