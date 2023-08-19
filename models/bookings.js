const mongoose = require('mongoose');

const bookingSchema = mongoose.Schema({
	traveler: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
	host: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
	done: { type: Boolean, default: false },
	startDate: Date,
	endDate: Date,
	status: { type: String, default: 'Demande en attente' },
	adultsNumber: Number,
	childrenNumber: Number,
	babiesNumber: Number,
});

const Booking = mongoose.model('bookings', bookingSchema);

module.exports = Booking;
