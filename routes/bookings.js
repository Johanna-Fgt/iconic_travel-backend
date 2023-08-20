var express = require('express');
var router = express.Router();
// MODELS
const User = require('../models/users');
const Booking = require('../models/bookings');
const ChatChannel = require('../models/chatChannels');
// UTILS
const { getDates } = require('../modules/dates');

/* POST /request - create a booking request */
router.post('/request/:travelerToken/:hostEmail', async (req, res) => {
	const { travelerToken, hostEmail } = req.params;
	const { startDate, endDate, adultsNumber, childrenNumber, babiesNumber } =
		req.body;

	// Get ids
	const travelerFound = await User.findOne({ token: travelerToken });
	const hostFound = await User.findOne({
		email: { $regex: new RegExp(hostEmail, 'i') },
	});

	if (!travelerFound || !hostFound)
		return res.json({
			result: false,
			error: 'Aucun utilisateur trouvé',
		});

	const traveler = travelerFound._id;
	const host = hostFound._id;

	//  Check if traveler has already request a booking to host or reverse
	const travelBookings = await Booking.find({ $and: [{ traveler }, { host }] });
	const hostBookings = await Booking.find({
		$and: [{ traveler: host }, { host: traveler }],
	});
	const existingBookings = [...travelBookings, ...hostBookings];

	if (existingBookings.length) {
		// Dates to be checked
		const datesFromReq = getDates(startDate, endDate);

		// All already booked dates
		const bookingsDates = existingBookings
			?.map((b) => getDates(b.startDate, b.endDate))
			.reduce((a, b) => [...a, ...b]);

		// dates not compatible
		if (datesFromReq.some((d) => bookingsDates.includes(d)))
			return res.json({
				result: false,
				error: 'Vous avez déjà demandé un travel sur ce créneau',
			});
	}

	// create booking
	const newBooking = new Booking({
		traveler,
		host,
		startDate,
		endDate,
		adultsNumber,
		childrenNumber,
		babiesNumber,
	});

	const createdBooking = await newBooking.save();

	if (!createdBooking)
		return res.json({ result: false, error: 'Can not create new booking' });

	// save new booking for both traveler and host
	travelerFound.bookings.push(createdBooking._id);
	hostFound.bookings.push(createdBooking._id);

	const newTraveler = await travelerFound.save();
	const newHost = await hostFound.save();

	if (!newTraveler || !newHost)
		return res
			.status(409)
			.json({ result: false, error: 'Can not add booking id to user' });

	// Verify if chatChannel does not already exist
	const chatExists = await ChatChannel.find().or([
		{ name: traveler + host },
		{ name: host + traveler },
	]);

	if (!chatExists.length) {
		const newChatChannel = new ChatChannel({
			host,
			traveler,
			name: traveler + host,
			messages: [],
			createdAt: new Date(),
		});

		const createdChatChannel = await newChatChannel.save();

		if (!createdChatChannel)
			return res.json({ result: false, error: 'Can not create new chat' });

		// save new chat for both traveler and host
		newTraveler.chatChannels.push(createdChatChannel._id);
		newHost.chatChannels.push(createdChatChannel._id);

		const updatedNewTraveler = await travelerFound.save();
		const updatedNewHost = await hostFound.save();

		if (!updatedNewTraveler || !updatedNewHost)
			return res
				.status(409)
				.json({ result: false, error: 'Can not add chat id to user' });
	}

	res.json({
		result: true,
	});
});

/* GET /:token - return user */
router.get('/:token', (req, res) => {
	User.findOne({ token: req.params.token })
		.populate({
			path: 'bookings',
			populate: [{ path: 'traveler' }, { path: 'host' }],
		})
		.then((user) => {
			res.json({
				result: true,
				user,
			});
		});
});

/* PATCH /update/:bookingId - update done */
router.patch('/update/:bookingId', (req, res) => {
	const { bookingId } = req.params;

	Booking.findByIdAndUpdate(bookingId, { status: true }).exec();

	res.json({ result: true });
});

/* DELETE /delete/:bookingId - remove the booking and chat using its id */
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

	//delete chatchannel
	if (hostBookingsFound.length === 0 && travelerBookingsFound.length === 0) {
		ChatChannel.findOneAndDelete({
			$and: [{ traveler: traveler._id }, { host: host._id }],
		}).then((chat) => {
			User.findByIdAndUpdate(booking.traveler, {
				$pull: { chatChannels: chat._id },
			}).exec();

			User.findByIdAndUpdate(booking.host, {
				$pull: { chatChannels: chat._id },
			}).exec();
		});
	}
	res.json({ result: true });
});

module.exports = router;
