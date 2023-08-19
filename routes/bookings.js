var express = require('express');
var router = express.Router();

const Booking = require('../models/bookings');
const User = require('../models/users');
const ChatChannel = require('../models/chatChannels');

/* POST /request - create a booking request */
router.post('/request', async (req, res) => {
	const {
		traveler,
		host,
		startDate,
		endDate,
		adultsNumber,
		childrenNumber,
		babiesNumber,
	} = req.body.travelDatas;

	//  Check if traveler has already request a booking to host or reverse
	const sameBookings = await Booking.find({ $and: [{ traveler }, { host }] });
	const reverseBookings = await Booking.find({
		$and: [{ traveler: host }, { host: traveler }],
	});

	const getDates = (startDate, endDate) => {
		let datesToCheckFromReq = [];
		let dif = new Date(endDate).getTime() - new Date(startDate).getTime();
		let daysNbr = dif / (1000 * 3600 * 24);
		for (let j = 0; j <= daysNbr; j++) {
			const result = new Date(startDate);
			const dateToCheck = result.setDate(result.getDate() + j);
			datesToCheckFromReq.push(new Date(dateToCheck).toLocaleDateString());
		}
		return datesToCheckFromReq;
	};

	// Dates to be checked
	const datesFromReq = getDates(startDate, endDate);

	// Check start date and end date interval
	if (sameBookings.length) {
		let datesToCheck = [];
		for (let i = 0; i < sameBookings.length; i++) {
			let dif =
				new Date(sameBookings[i].endDate).getTime() -
				new Date(sameBookings[i].startDate).getTime();
			let daysNbr = dif / (1000 * 3600 * 24);

			for (let j = 0; j <= daysNbr; j++) {
				const result = new Date(sameBookings[i].startDate);
				const dateToCheck = result.setDate(result.getDate() + j);
				datesToCheck.push(new Date(dateToCheck).toLocaleDateString());
			}
		}

		for (let i = 0; i < datesFromReq.length; i++) {
			if (datesToCheck.includes(datesFromReq[i])) {
				// dates not compatible
				res.json({
					result: false,
					error: 'Vous avez déjà demandé un travel sur ce créneau',
				});
				return;
			}
		}
	}

	// Check start date and end date interval
	if (reverseBookings.length) {
		let datesToCheck = [];
		for (let i = 0; i < reverseBookings.length; i++) {
			let dif =
				new Date(reverseBookings[i].endDate).getTime() -
				new Date(reverseBookings[i].startDate).getTime();
			let daysNbr = dif / (1000 * 3600 * 24);

			for (let j = 0; j <= daysNbr; j++) {
				const result = new Date(reverseBookings[i].startDate);
				const dateToCheck = result.setDate(result.getDate() + j);
				datesToCheck.push(new Date(dateToCheck).toLocaleDateString());
			}
		}

		for (let i = 0; i < datesFromReq.length; i++) {
			// dates not compatible
			if (datesToCheck.includes(datesFromReq[i])) {
				res.json({
					result: false,
					error: 'Cet host vous a déjà fait une demande sur ce créneau',
				});
				return;
			}
		}
	}

	const newBooking = new Booking({
		traveler,
		host,
		startDate,
		endDate,
		adultsNumber,
		childrenNumber,
		babiesNumber,
	});

	newBooking.save().then(async (data) => {
		// Verify if chatChannel does not already exist
		const chatExists = await ChatChannel.find().or([
			{ name: traveler + host },
			{ name: host + traveler },
		]);

		const travelerFound = await User.findById(traveler);
		const hostFound = await User.findById(host);

		travelerFound.bookings.push(data._id);
		hostFound.bookings.push(data._id);

		if (!chatExists.length) {
			const newChatChannel = new ChatChannel({
				host,
				traveler,
				name: traveler + host,
				messages: [],
				createdAt: new Date(),
			});

			newChatChannel.save().then(async (resp) => {
				travelerFound.chatChannels.push(resp._id);
				hostFound.chatChannels.push(resp._id);
				const newTraveler = await travelerFound.save();
				const newHost = await hostFound.save();

				if (!newTraveler || !newHost)
					return res
						.status(409)
						.json({ result: false, error: 'Can not add booking id to user' });

				res.json({
					result: true,
				});
			});
			return;
		}

		const newTraveler = await travelerFound.save();
		const newHost = await hostFound.save();

		if (!newTraveler || !newHost)
			return res
				.status(409)
				.json({ result: false, error: 'Can not add booking id to user' });

		res.json({
			result: true,
		});
	});
});

/* GET /:token - return user */
router.get('/:token', (req, res) => {
	User.findOne({ token: req.params.token })
		.populate({
			path: 'bookings',
			populate: [{ path: 'traveler' }, { path: 'host' }],
		})
		.then((userFound) => {
			res.json({
				result: true,
				user: userFound,
			});
		});
});

/* GET /exists/:traveler/:host - if exists returns bookings between two users*/
router.get(`/exists/:traveler/:host`, (req, res) => {
	Booking.findOne({
		traveler: req.params.traveler,
		host: req.params.host,
	}).then((data) => {
		if (data) {
			res.json({
				result: true,
				booking: data,
			});
		} else {
			res.json({
				result: false,
				error: 'Aucun contact trouvé',
			});
		}
	});
});

/* GET /traveler/:token - get user's chatchannels */
router.get(`/traveler/:token`, (req, res) => {
	User.findOne({ token: req.params.token })
		.populate('chatChannels')
		.then((data) => {
			if (data) {
				res.json({
					result: true,
					chats: data.chatChannels,
				});
			} else {
				res.json({
					result: false,
					error: 'Aucun contact trouvé',
				});
			}
		});
});

/* PATCH /update/:bookingId - update done */
router.patch('/update/:bookingId', (req, res) => {
	const { bookingId } = req.params;

	Booking.findByIdAndUpdate(bookingId, { status: 'Confirmé' }).exec();
	res.json({ result: true });
});

/* DELETE /delete/:bookingId - remove the booking using its id */
router.delete('/delete/:bookingId', async (req, res) => {
	const { bookingId } = req.params;
	const booking = await Booking.findById(bookingId);

	//delete user
	User.findByIdAndUpdate(booking.traveler, {
		$pull: { bookings: bookingId },
	}).exec();
	User.findByIdAndUpdate(booking.host, {
		$pull: { bookings: bookingId },
	}).exec();

	const traveler = await User.findById(booking.traveler);
	const host = await User.findById(booking.host);

	//delete booking
	await Booking.deleteOne({ _id: bookingId }).exec();

	// if other bookings exists
	const hostBookingsFound = await Booking.find({
		$and: [{ traveler: traveler._id }, { host: host._id }],
	});
	const travelerBookingsFound = await Booking.find({
		$and: [{ traveler: host._id }, { host: traveler._id }],
	});

	console.log('bookings trouvés 1 : ', hostBookingsFound);
	console.log('bookings trouvés 2 : ', travelerBookingsFound);

	//delete chatchannel
	if (hostBookingsFound.length === 0 && travelerBookingsFound.length === 0) {
		ChatChannel.findOneAndDelete({
			$and: [{ traveler: traveler._id }, { host: host._id }],
		}).then((resp) => {
			console.log('Chat supprimé : ', resp);
			User.findByIdAndUpdate(booking.traveler, {
				$pull: { chatChannels: resp._id },
			}).exec();
			User.findByIdAndUpdate(booking.host, {
				$pull: { chatChannels: resp._id },
			}).exec();
		});
	}
	res.json({ result: true });
});

module.exports = router;
