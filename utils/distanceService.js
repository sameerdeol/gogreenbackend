const axios = require('axios');
require("dotenv").config();

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const distanceCustomerVendor = async (vendorLat, vendorLng, userLat, userLng) => {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${vendorLat},${vendorLng}&destination=${userLat},${userLng}&mode=driving&key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    const route = response.data.routes[0];

    if (!route) throw new Error("No route found");

    const distanceInMeters = route.legs[0].distance.value;
    const durationInSeconds = route.legs[0].duration.value;

    return {
      distance_km: (distanceInMeters / 1000).toFixed(2),
      duration_minutes: (durationInSeconds / 60).toFixed(1),
    };
  } catch (err) {
    throw new Error('Google Maps API error: ' + err.message);
  }
};

// Add async keyword here to fix syntax error
const getDistanceMatrix = async (vendorLat, vendorLng, riders) => {
  if (!riders.length) return [];

  const origins = `${vendorLat},${vendorLng}`;
  const destinations = riders.map(r => `${r.rider_lat},${r.rider_lng}`).join('|');

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=driving&key=${API_KEY}`;

  const response = await axios.get(url);
  const data = response.data;

  if (data.status !== 'OK') {
    throw new Error(`Google Distance Matrix API error: ${data.status}`);
  }

  const elements = data.rows[0].elements;

  const results = await Promise.all(
    riders.map(async (rider, index) => {
      const distance = elements[index]?.status === 'OK' ? elements[index].distance.value : null;

      let polyline = null;
      try {
        const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${rider.rider_lat},${rider.rider_lng}&destination=${vendorLat},${vendorLng}&mode=driving&key=${API_KEY}`;
        const directionsRes = await axios.get(directionsUrl);
        const route = directionsRes.data.routes[0];
        if (route?.overview_polyline?.points) {
          polyline = route.overview_polyline.points;
        }
      } catch (err) {
        console.error(`Directions API error for rider ${rider.rider_id || 'unknown'}:`, err.message);
      }

      return {
        rider,
        distance,
        polyline
      };
    })
  );

  return results;
};


module.exports = { distanceCustomerVendor, getDistanceMatrix };
