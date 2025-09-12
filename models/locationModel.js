const db = require("../config/db");

const Location = {
    getCordinates: (order_id, callback) => {
        const sql = `select * from route_coordinates  where order_id = ?`;
        db.query(sql, [order_id], callback);
    }
};

module.exports = Location;
