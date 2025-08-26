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
        polyline: route.overview_polyline?.points || null
      };

      cache.set(cacheKey, result);
      callback(null, result);
    })
    .catch(err => {
      callback(new Error('Google Maps API error: ' + err.message));
    });
}

// Callback-based version of getDistanceMatrix
function getDistanceMatrix(vendorLat, vendorLng, riders, customerLat, customerLng, callback) {
  if (!riders.length) return callback(null, []);

  const origins = riders.map(r => `${r.rider_lat},${r.rider_lng}`).join('|');
  const destination = `${vendorLat},${vendorLng}`;
  const matrixCacheKey = `matrix-${origins}-${destination}`;

  let matrixData = cache.get(matrixCacheKey);

  // 🔹 Helper to pick shortest route
  function getShortestRoute(directionsData) {
    if (!directionsData.routes || !directionsData.routes.length) return null;

    let shortestRoute = null;
    let shortestDistance = Infinity;

    directionsData.routes.forEach(route => {
      const distance = route.legs?.[0]?.distance?.value || Infinity;
      if (distance < shortestDistance) {
        shortestDistance = distance;
        shortestRoute = route;
      }
    });

    return shortestRoute;
  }

  function fetchRiderVendorPolyline(rider, cb) {
    const riderVendorKey = `route-${rider.rider_lat},${rider.rider_lng}-${vendorLat},${vendorLng}`;
    let polyline = cache.get(riderVendorKey);

    if (polyline) return cb(null, polyline);

    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${rider.rider_lat},${rider.rider_lng}&destination=${vendorLat},${vendorLng}&mode=driving&alternatives=true&key=${API_KEY}`;
    axios.get(directionsUrl)
      .then(directionsRes => {
        const shortestRoute = getShortestRoute(directionsRes.data);
        polyline = shortestRoute?.overview_polyline?.points || null;
        if (polyline) cache.set(riderVendorKey, polyline);
        cb(null, polyline);
      })
      .catch(err => {
        console.error(`Directions API error (rider→vendor) for rider ${rider.user_id || 'unknown'}:`, err.message);
        cb(null, null);
      });
  }

  function fetchVendorCustomerPolylineAndDistance(cb) {
    const vendorCustomerKey = `route-${vendorLat},${vendorLng}-${customerLat},${customerLng}`;
    let polyline = cache.get(vendorCustomerKey);
    let distance = cache.get(`${vendorCustomerKey}-distance`);

    if (polyline && distance) return cb(null, { polyline, distance });

    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${vendorLat},${vendorLng}&destination=${customerLat},${customerLng}&mode=driving&alternatives=true&key=${API_KEY}`;
    axios.get(directionsUrl)
      .then(directionsRes => {
        const shortestRoute = getShortestRoute(directionsRes.data);
        polyline = shortestRoute?.overview_polyline?.points || null;
        distance = shortestRoute?.legs?.[0]?.distance?.value || null; // meters
        if (polyline) cache.set(vendorCustomerKey, polyline);
        if (distance) cache.set(`${vendorCustomerKey}-distance`, distance);
        cb(null, { polyline, distance });
      })
      .catch(err => {
        console.error(`Directions API error (vendor→customer):`, err.message);
        cb(null, { polyline: null, distance: null });
      });
  }

  function processRiders(matrixData, vendorCustomerPolyline, vendorCustomerDistance) {
    let results = [];
    let count = 0;

    riders.forEach((rider, i) => {
      let riderToVendorDistance = null;
      if (matrixData[i] && matrixData[i].status === 'OK') {
        riderToVendorDistance = matrixData[i].distance?.value || null;
      }

      fetchRiderVendorPolyline(rider, (err, riderVendorPolyline) => {
        results[i] = {
          rider,
          distance_rider_to_vendor: riderToVendorDistance,
          vendor_to_customer_distance: vendorCustomerDistance,
          riderVendorPolyline,
          vendorCustomerPolyline
        };
        count++;
        if (count === riders.length) {
          callback(null, results);
        }
      });
    });
  }

  if (matrixData) {
    fetchVendorCustomerPolylineAndDistance((err, { polyline, distance }) => {
      if (err) return callback(err);
      processRiders(matrixData, polyline, distance);
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

        fetchVendorCustomerPolylineAndDistance((err, { polyline, distance }) => {
          if (err) return callback(err);
          processRiders(matrixData, polyline, distance);
        });
      })
      .catch(err => callback(err));
  }
}




module.exports = { distanceCustomerVendor, getDistanceMatrix };
