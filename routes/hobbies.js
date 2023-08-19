var express = require('express');
var router = express.Router();
// MODELS
const Hobby = require('../models/hobbies');
// UTILS
const { stringIsFilled } = require('../modules/validators');

/* POST / - add a new hobby if does not already exists in db*/
router.post('/new', async (req, res) => {
	const { hobby } = req.body;

	if (!stringIsFilled(hobby)) {
		return res.status(403).json({ result: false, error: 'Invalid entry' });
	}

	Hobby.findOne({ hobby }).then((data) => {
		if (data) return res.json({ result: false, error: 'Already exists' });
	});

	const newHobby = new Hobby({
		hobby,
	});

	const newHobbies = await newHobby.save();

	if (!newHobbies)
		return res
			.status(409)
			.json({ result: false, error: 'Can not add new hobby' });

	const hobbies = await Hobby.find();
	const hobbiesList = hobbies.map((el) => el.hobby);
	res.json({ result: true, hobbiesList });
});

/* GET / - return all hobbies*/
router.get('/', (req, res) => {
	Hobby.find().then((hobbies) =>
		res.json({ result: true, hobbiesList: hobbies.map((el) => el.hobby) })
	);
});

module.exports = router;
