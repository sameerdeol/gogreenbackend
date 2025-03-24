const db = require('../config/db');

const AppBanner = {
    create: (title, image, status, callback) => {
        const query = 'INSERT INTO app_banners (title, image_url, status) VALUES (?, ?, ?)';
        db.query(query, [title, image, status], callback);
    },

    findAll: (callback) => {
        db.query('SELECT * FROM app_banners', callback);
    },

    findById: (id, callback) => {
        db.query('SELECT * FROM app_banners WHERE id = ?', [id], callback);
    },

    update: (id, data, callback) => {
        const query = 'UPDATE app_banners SET title = ?, image_url = ?, status = ? WHERE id = ?';
        db.query(query, [data.title, data.image_url, data.status, id], callback);
    },

    delete: (id, callback) => {
        db.query('DELETE FROM app_banners WHERE id = ?', [id], callback);
    }
};

module.exports = AppBanner;
