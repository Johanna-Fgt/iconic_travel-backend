var express = require('express');
var router = express.Router();
// UTILS
const { stringIsFilled } = require('../modules/validators');
// API
const API_KEY = process.env.MAP_API_KEY;

/* GET /:city */
router.get('/city/:city', async (req, res) => {
	const { city } = req.params;

	if (!stringIsFilled(city)) {
		return res.status(403).json({ result: false, error: 'Invalid entry' });
	}

	const URL = `https://www.mapquestapi.com/geocoding/v1/address?key=${API_KEY}&location=${city}`;
	const response = await fetch(URL);
	const items = await response.json();
	const detailedCities = items.results[0].locations;

	const suggestions = detailedCities.map((city, i) => ({
		id: i,
		title: `${city.adminArea5}, ${city.adminArea4}`,
		name: city.adminArea5,
		latitude: city.displayLatLng.lat,
		longitude: city.displayLatLng.lng,
	}));

	res.json({ result: true, suggestions });
});

module.exports = router;
