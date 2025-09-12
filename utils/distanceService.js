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
        duration_minutes: (durationInSeconds / 60).toFixed(1)
      };

      cache.set(cacheKey, result);
      callback(null, result);
    })
    .catch(err => {
      callback(new Error('Google Maps API error: ' + err.message));
    });
}

function getDistanceMatrix(vendorLat, vendorLng, riders, customerLat, customerLng, callback) {
  if (!riders.length) return callback(null, []);

  const origins = riders.map(r => `${r.rider_lat},${r.rider_lng}`).join('|');
  const destination = `${vendorLat},${vendorLng}`;
  const matrixCacheKey = `matrix-${origins}-${destination}`;

  let matrixData = cache.get(matrixCacheKey);

  function processRiders(matrixData, vendorCustomerDistance) {
    const results = riders.map((rider, i) => {
      const riderToVendorDistance = matrixData[i]?.status === 'OK'
        ? matrixData[i].distance?.value || null
        : null;

      return {
        rider,
        distance_rider_to_vendor: riderToVendorDistance,
        vendor_to_customer_distance: vendorCustomerDistance
      };
    });

    callback(null, results);
  }

  function fetchVendorCustomerDistance(cb) {
    const vendorCustomerKey = `distance-${vendorLat},${vendorLng}-${customerLat},${customerLng}`;
    let distance = cache.get(vendorCustomerKey);

    if (distance) return cb(null, distance);

    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${vendorLat},${vendorLng}&destination=${customerLat},${customerLng}&mode=driving&key=${API_KEY}`;
    axios.get(directionsUrl)
      .then(directionsRes => {
        const route = directionsRes.data.routes[0];
        distance = route?.legs?.[0]?.distance?.value || null; // meters
        if (distance) cache.set(vendorCustomerKey, distance);
        cb(null, distance);
      })
      .catch(err => {
        console.error(`Directions API error (vendor→customer):`, err.message);
        cb(null, null);
      });
  }

  if (matrixData) {
    fetchVendorCustomerDistance((err, vendorCustomerDistance) => {
      if (err) return callback(err);
      processRiders(matrixData, vendorCustomerDistance);
    });
  } else {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destination}&mode=driving&key=${API_KEY}`;
    axios.get(url)
      .then(response => {
        const data = response.data;
        if (data.status !== 'OK') {
          return callback(new Error(`Google Distance Matrix API error: ${data.status}`));
        }
        matrixData = data.rows.map(row => row.elements[0]); // first destination (vendor)
        cache.set(matrixCacheKey, matrixData);

        fetchVendorCustomerDistance((err, vendorCustomerDistance) => {
          if (err) return callback(err);
          processRiders(matrixData, vendorCustomerDistance);
        });
      })
      .catch(err => callback(err));
  }
}

module.exports = { distanceCustomerVendor, getDistanceMatrix };
