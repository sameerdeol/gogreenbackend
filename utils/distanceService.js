const axios = require('axios');
require("dotenv").config();
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 }); // cache expires in 10 minutes

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const distanceCustomerVendor = async (vendorLat, vendorLng, userLat, userLng) => {
  const cacheKey = `distance-${vendorLat},${vendorLng}-${userLat},${userLng}`;
  const cached = cache.get(cacheKey);

  if (cached) return cached;

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${vendorLat},${vendorLng}&destination=${userLat},${userLng}&mode=driving&key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    const route = response.data.routes[0];

    if (!route) throw new Error("No route found");

    const distanceInMeters = route.legs[0].distance.value;
    const durationInSeconds = route.legs[0].duration.value;

    const result = {
      distance_km: (distanceInMeters / 1000).toFixed(2),
      duration_minutes: (durationInSeconds / 60).toFixed(1),
    };

    cache.set(cacheKey, result); // Save to cache
    return result;

  } catch (err) {
    throw new Error('Google Maps API error: ' + err.message);
  }
};

const getDistanceMatrix = async (vendorLat, vendorLng, riders) => {
  if (!riders.length) return [];

  const origins = `${vendorLat},${vendorLng}`;
  const destinations = riders.map(r => `${r.rider_lat},${r.rider_lng}`).join('|');
  const matrixCacheKey = `matrix-${origins}-${destinations}`;

  let matrixData = cache.get(matrixCacheKey);

  if (!matrixData) {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=driving&key=${API_KEY}`;
    const response = await axios.get(url);
    const data = response.data;

    if (data.status !== 'OK') {
      throw new Error(`Google Distance Matrix API error: ${data.status}`);
    }

    matrixData = data.rows[0].elements;
    cache.set(matrixCacheKey, matrixData);
  }

  const results = await Promise.all(
    riders.map(async (rider, index) => {
      const distance = matrixData[index]?.status === 'OK' ? matrixData[index].distance.value : null;

      const directionsCacheKey = `route-${rider.rider_lat},${rider.rider_lng}-${vendorLat},${vendorLng}`;
      let polyline = cache.get(directionsCacheKey);

      if (!polyline) {
        try {
          const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${rider.rider_lat},${rider.rider_lng}&destination=${vendorLat},${vendorLng}&mode=driving&key=${API_KEY}`;
          const directionsRes = await axios.get(directionsUrl);
          const route = directionsRes.data.routes[0];
          if (route?.overview_polyline?.points) {
            polyline = route.overview_polyline.points;
            cache.set(directionsCacheKey, polyline);
          }
        } catch (err) {
          console.error(`Directions API error for rider ${rider.rider_id || 'unknown'}:`, err.message);
        }
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
