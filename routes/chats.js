var express = require('express');
var router = express.Router();
const Pusher = require('pusher');
// MODELS
const ChatChannel = require('../models/chatChannels');
const User = require('../models/users');
// PUSHER
const pusher = new Pusher({
	appId: process.env.PUSHER_APPID,
	key: process.env.PUSHER_KEY,
	secret: process.env.PUSHER_SECRET,
	cluster: process.env.PUSHER_CLUSTER,
	useTLS: true,
});

/* PUT /:chatname/:username - join chat */
router.put('/:chatname/:username', async (req, res) => {
	await pusher.trigger(req.params.chatname, 'join', {
		username: req.params.username,
	});

	res.json({ result: true });
});

/* DELETE /:chatname/:username - leave chat */
router.delete('/:chatname/:username', async (req, res) => {
	await pusher.trigger(req.params.chatname, 'leave', {
		username: req.params.username,
	});

	res.json({ result: true });
});

/* POST /message - send message */
router.post('/message', async (req, res) => {
	const { text, username, chatname, createdAt } = req.body;
	await pusher.trigger(chatname, 'message', req.body);

	ChatChannel.updateOne(
		{ name: chatname },
		{ $push: { messages: { username, text, createdAt } } }
	).exec();

	res.json({ result: true });
});

/* GET /previousMessages/:chatname - previous messages from chat */
router.get('/previousMessages/:chatname', (req, res) => {
	ChatChannel.findOne({ name: req.params.chatname }).then((chat) => {
		res.json({
			result: true,
			messages: chat.messages,
		});
	});
});

/* GET /:token - User's chats  */
router.get(`/:token`, (req, res) => {
	User.findOne({ token: req.params.token })
		.populate({
			path: 'chatChannels',
			populate: [{ path: 'traveler' }, { path: 'host' }],
		})
		.then((user) => {
			if (user) {
				res.json({
					result: true,
					chats: user.chatChannels,
				});
			} else {
				res.json({
					result: false,
					error: 'No contact found',
				});
			}
		});
});

module.exports = router;
