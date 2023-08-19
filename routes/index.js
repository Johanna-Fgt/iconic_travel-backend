var express = require('express');
var router = express.Router();
const API_KEY = process.env.MAP_API_KEY;

/* GET /:city */
router.get('/city/:city', async (req, res) => {
	const URL = `https://www.mapquestapi.com/geocoding/v1/address?key=${API_KEY}&location=${req.params.city}`;
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
