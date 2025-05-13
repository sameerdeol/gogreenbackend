const axios = require('axios');

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

module.exports = { getLatLngByPlaceName };
