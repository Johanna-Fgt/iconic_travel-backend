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
router.post('/signup', (req, res) => {
	const { firstname, lastname, dateOfBirth, email, password } = req.body;

	if (
		!checkBody(req.body, [
			'firstname',
			'lastname',
			'dateOfBirth',
			'email',
			'password',
		])
	) {
		res.status(403).json({ result: false, error: 'Missing or empty fields' });
		return;
	}

	//https://www.reactnativeschool.com/how-to-upload-images-from-react-native

	// 	const photoPath = `./tmp/${uniqid()}.jpg`;
	// 	const resultMove = await req.files.photoFromFront.mv(photoPath);

	// 	if (!resultMove) {
	// 		const resultCloudinary = await cloudinary.uploader.upload(photoPath);

	// 		fs.unlinkSync(photoPath);
	// 		res.json({ result: true, url: resultCloudinary.secure_url });
	// 	} else {
	// 		res.json({ result: false, error: resultMove });
	// 	}

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
			});

			newUser.save().then((newDoc) => {
				res.json({ result: true, token: newDoc.token });
			});
		} else {
			// User already exists in database
			res.status(409).json({ result: false, error: 'Already have an account' });
		}
	});
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
			res.json({ result: true, token: data.token });
		} else {
			res
				.status(404)
				.json({ result: false, error: 'User not found or wrong password' });
		}
	});
});

/* GET /:token - get some usefull user's datas ? DUE TO REDUX PERSIST MIGHT BE USELESS */
router.get('/:token', (req, res) => {
	User.findOne({ token: req.params.token }).then((data) => {
		if (data) {
			res.json({ result: true, data }); //TODO : CHOSE DATA TO RETURN
		} else {
			res.json({ result: false, error: 'User not found' });
		}
	});
});

/* PUT /update/:token - update only some datas ? how to filter well ? */
router.put('/update/:token', async (req, res) => {
	// TODO : USING UPDATEONE(FILTER, PROPERTY TO UPDATE)
});

/* DELETE /delete/:token - remove all data from user in db/cloudinary/pusher ? */
router.delete('/delete/:token', (req, res) => {
	const regex = /\/v\d+\/([^/]+)\.\w{3,4}$/;

	//TODO : DELETE FOREIGN KEY OR NOT ?

	//TODO : DELETE PICTURE FROM CLOUDINARY
	User.findOne({ token: req.params.token }).then((data) => {
		if (data) {
			const publicId = data.avatar.match(regex);

			// check that publicId is not the default one before removing from cloudinary
			publicId !== 'cld-sample' &&
				cloudinary.uploader.destroy(publicId, (result) => console.log(result));
		} else {
			res.json({ result: false, error: 'User not found' });
		}
	});

	// DELETE USER FROM DB
	User.deleteOne({ token: req.params.token }).then((deletedDoc) => {
		if (deletedDoc.deletedCount > 0) {
			res.json({ result: true });
		} else {
			res.json({ result: false });
		}
	});
});

module.exports = router;
