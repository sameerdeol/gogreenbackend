const axios = require('axios');
const Location = require('../models/locationModel');

const getLatLngByPlaceName = async (req, res) => {
    try {
        const { place } = req.query;

        if (!place) {
            return res.status(400).json({ error: "Place is required" });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const encodedPlace = encodeURIComponent(place);

        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedPlace}&key=${apiKey}`;

        const response = await axios.get(url);
        const data = response.data;

        if (data.status !== "OK" || !data.results || data.results.length === 0) {
            return res.status(404).json({ error: "Place not found" });
        }

        // Limit the results to 20 places
        const results = data.results.slice(0, 20).map((result, index) => ({
            place: result.formatted_address,
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
        }));

        // Return the results as a JSON response
        res.json({
            results
        });
    } catch (error) {
        console.error("Error fetching coordinates:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const getPolyLines = (req, res) => {
    const { order_id } = req.params;
    
    if (!order_id) {
        return res.status(400).json({ error: "order_id is required" });
    }

    Location.getPolyline(order_id, (err, results) => {
        if (err) {
            console.error("DB error:", err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!results || results.length === 0) {
            return res.status(404).json({ success: false, message: 'Order polylines not found' });
        }

        // send first row (since order_id is unique)
        res.status(200).json({ success: true, data: results[0] });
    });
};


module.exports = { getPolyLines, getLatLngByPlaceName };
