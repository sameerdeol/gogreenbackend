const axios = require('axios');
require("dotenv").config();
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 }); // cache expires in 10 minutes

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

function distanceCustomerVendor(vendorLat, vendorLng, userLat, userLng, callback) {
  const cacheKey = `distance-${vendorLat},${vendorLng}-${userLat},${userLng}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return process.nextTick(() => callback(null, cached));
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${vendorLat},${vendorLng}&destination=${userLat},${userLng}&mode=driving&key=${API_KEY}`;

  axios.get(url)
    .then(response => {
      const route = response.data.routes[0];

      if (!route) {
        return callback(new Error("No route found"));
      }

      const distanceInMeters = route.legs[0].distance.value;
      const durationInSeconds = route.legs[0].duration.value;

      const result = {
        distance_km: (distanceInMeters / 1000).toFixed(2),
        duration_minutes: (durationInSeconds / 60).toFixed(1),
      };

      cache.set(cacheKey, result);
      callback(null, result);
    })
    .catch(err => {
      callback(new Error('Google Maps API error: ' + err.message));
    });
}

const getDistanceMatrix = async (vendorLat, vendorLng, riders, customerLat, customerLng) => {
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

      // Rider → Vendor polyline
      const riderVendorKey = `route-${rider.rider_lat},${rider.rider_lng}-${vendorLat},${vendorLng}`;
      let riderVendorPolyline = cache.get(riderVendorKey);
      if (!riderVendorPolyline) {
        try {
          const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${rider.rider_lat},${rider.rider_lng}&destination=${vendorLat},${vendorLng}&mode=driving&key=${API_KEY}`;
          const directionsRes = await axios.get(directionsUrl);
          const route = directionsRes.data.routes[0];
          if (route?.overview_polyline?.points) {
            riderVendorPolyline = route.overview_polyline.points;
            cache.set(riderVendorKey, riderVendorPolyline);
          }
        } catch (err) {
          console.error(`Directions API error (rider→vendor) for rider ${rider.user_id || 'unknown'}:`, err.message);
        }
      }

      // Vendor → Customer polyline
      const vendorCustomerKey = `route-${vendorLat},${vendorLng}-${customerLat},${customerLng}`;
      let vendorCustomerPolyline = cache.get(vendorCustomerKey);
      if (!vendorCustomerPolyline) {
        try {
          const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${vendorLat},${vendorLng}&destination=${customerLat},${customerLng}&mode=driving&key=${API_KEY}`;
          const directionsRes = await axios.get(directionsUrl);
          const route = directionsRes.data.routes[0];
          if (route?.overview_polyline?.points) {
            vendorCustomerPolyline = route.overview_polyline.points;
            cache.set(vendorCustomerKey, vendorCustomerPolyline);
          }
        } catch (err) {
          console.error(`Directions API error (vendor→customer):`, err.message);
        }
      }

      return {
        rider,
        distance,
        riderVendorPolyline,
        vendorCustomerPolyline
      };
    })
  );

  return results;
};


module.exports = { distanceCustomerVendor, getDistanceMatrix };
