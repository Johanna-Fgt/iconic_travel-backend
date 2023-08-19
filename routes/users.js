var express = require('express');
var router = express.Router();
// MODELS
const User = require('../models/users');
// UTILS
const { checkBody } = require('../modules/checkBody');
// AUTHENTICATION
const uid2 = require('uid2');
const bcrypt = require('bcrypt');
// FILES UPLOAD
const uniqid = require('uniqid');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

/* POST /signup*/
router.post('/signup', async (req, res) => {
	const {
		firstname,
		lastname,
		dateOfBirth,
		email,
		password,
		description,
		avatarUrl,
		city,
		spokenLanguages,
		hobbies,
	} = req.body;

	// Check if the user has not already been registered
	User.findOne({ email: { $regex: new RegExp(email, 'i') } }).then((data) => {
		if (data === null) {
			const hash = bcrypt.hashSync(password, 10);

			const newUser = new User({
				firstname,
				lastname,
				dateOfBirth,
				email,
				password: hash,
				token: uid2(32),
				avatarUrl,
				description,
				city,
				spokenLanguages,
				hobbies,
			});

			newUser.save().then((data) => {
				res.json({ result: true, data });
			});
		} else {
			// User already exists in database
			res.status(409).json({ result: false, error: 'Already have an account' });
		}
	});
});

/* POST /upload */
router.post('/upload', async (req, res) => {
	// save avatar in temporary folder
	const photoPath = `./tmp/${uniqid()}.jpg`;
	const resultMove = await req.files.avatar.mv(photoPath);

	if (!resultMove) {
		// upload avatar to cloudinary and remove from temporary folder
		const resultCloudinary = await cloudinary.uploader.upload(photoPath);
		fs.unlinkSync(photoPath);

		res.json({ result: true, url: resultCloudinary.secure_url });
	} else {
		res.json({ result: false, error: resultMove });
	}
});

/* POST /signin*/
router.post('/signin', (req, res) => {
	const { email, password } = req.body;
	if (!checkBody(req.body, ['email', 'password'])) {
		res.status(403).json({ result: false, error: 'Missing or empty fields' });
		return;
	}

	User.findOne({ email: { $regex: new RegExp(email, 'i') } }).then((data) => {
		if (data && bcrypt.compareSync(password, data.password)) {
			res.json({ result: true, data });
		} else {
			res
				.status(404)
				.json({ result: false, error: 'User not found or wrong password' });
		}
	});
});

/* GET / - return all users */
router.get('/', (req, res) => {
	User.find().then((data) => {
		if (data) {
			const filteredData = data.map((user) => ({
				firstname: user.firstname,
				lastname: user.lastname,
				email: user.email,
				dateOfBirth: user.dateOfBirth,
				avatarUrl: user.avatarUrl,
				description: user.description,
				city: user.city,
				spokenLanguages: user.spokenLanguages,
				hobbies: user.hobbies,
				canHost: user.canHost,
				travels: user.travels,
			}));

			res.json({ result: true, data: filteredData });
		} else {
			res.status(404).json({ result: false, error: 'No user' });
		}
	});
});

/* GET /:token - get some usefull user's datas */
router.get('/:token', (req, res) => {
	User.findOne({ token: req.params.token }).then((data) => {
		if (data) {
			res.json({ result: true, data });
		} else {
			res.json({ result: false, error: 'User not found' });
		}
	});
});

/* PUT /hosting/:token - update only canHost property*/
router.put('/hosting/:token', async (req, res) => {
	const user = await User.findOne({ token: req.params.token });

	user.canHost = !user.canHost;

	const newUser = await user.save();

	if (!newUser)
		return res
			.status(409)
			.json({ result: false, error: 'Can not update hosting property' });

	res.json({ result: true, canHost: newUser.canHost });
});

/* PUT /password/:token - update only password property*/
router.put('/password/:token', async (req, res) => {
	const { password } = req.body;
	const user = await User.findOne({ token: req.params.token });

	user.password = bcrypt.hashSync(password, 10);

	const newUser = await user.save();

	if (!newUser)
		return res
			.status(409)
			.json({ result: false, error: 'Can not update password' });

	res.json({ result: true });
});

/* PUT /update/:token - update all */
router.put('/update/:token', async (req, res) => {
	const user = await User.findOne({ token: req.params.token });
	const keys = Object.keys(req.body);

	keys.forEach((key) => {
		user[key] = req.body[key];
	});

	const newUser = await user.save();

	if (!newUser)
		return res
			.status(409)
			.json({ result: false, error: 'Can not update user' });

	res.json({ result: true, data: newUser });
});

/* PUT /hosting/:token - update only canHost property*/
router.put('/booking/:token/:bookingId', async (req, res) => {
	const user = await User.findOne({ token: req.params.token });

	if (user.bookings.includes(req.params.bookingId)) {
		res.json({
			result: false,
			error: 'Booking déjà enregistré !',
		});
	} else {
		user.bookings.push(req.params.bookingId);

		const newUser = await user.save();

		if (!newUser)
			return res
				.status(409)
				.json({ result: false, error: 'Can not add booking id' });

		res.json({ result: true, canHost: newUser.canHost });
	}
});

/* DELETE /delete/:token - remove all data from user in db */
router.delete('/delete/:token', (req, res) => {
	// DELETE USER FROM DB
	User.deleteOne({ token: req.params.token }).then((deletedDoc) => {
		if (deletedDoc.deletedCount > 0) {
			res.json({ result: true });
		} else {
			res.json({ result: false });
		}
	});
});

/* DELETE /deletepicture/:token - remove avatar from cloudinary */
router.delete('/deletepicture/:token', (req, res) => {
	const regex = /\/v\d+\/([^/]+)\.\w{3,4}$/;

	User.findOne({ token: req.params.token }).then((user) => {
		if (user) {
			const publicId = user.avatarUrl.match(regex);

			// check that publicId is not the default one before removing from cloudinary
			publicId !== 'ezulphnetoa65bodxzwn' &&
				cloudinary.api
					.delete_resources([publicId[1]], {
						type: 'upload',
						resource_type: 'image',
					})
					.then(console.log);

			res.json({ result: true });
		} else {
			res.json({ result: false, error: 'User not found' });
		}
	});
});

router.get('/getId/:token/:email', (req, res) => {
	User.findOne({ token: req.params.token }).then((user) => {
		if (user) {
			User.findOne({ email: req.params.email }).then((userFound) => {
				if (userFound) {
					res.json({
						result: true,
						hostId: userFound._id,
						travelerId: user._id,
					});
				} else {
					res.json({
						result: false,
						error: 'Aucun utilisateur trouvé',
					});
				}
			});
		} else {
			res.json({ result: false, error: 'Invalid token' });
		}
	});
});

module.exports = router;
