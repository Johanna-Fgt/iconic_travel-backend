const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
	username: String,
	text: String,
	createdAt: Date,
});

const chatChannelSchema = mongoose.Schema({
	host: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
	traveler: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
	name: String,
	messages: [messageSchema],
	createdAt: Date,
});

const ChatChannel = mongoose.model('chatChannels', chatChannelSchema);

module.exports = ChatChannel;
