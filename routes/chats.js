var express = require('express');
var router = express.Router();
const Pusher = require('pusher');
const ChatChannel = require('../models/chatChannels');

const User = require('../models/users');
const pusher = new Pusher({
	appId: process.env.PUSHER_APPID,
	key: process.env.PUSHER_KEY,
	secret: process.env.PUSHER_SECRET,
	cluster: process.env.PUSHER_CLUSTER,
	useTLS: true,
});

// Join chat
router.put('/:chatname/:username', async (req, res) => {
	await pusher.trigger(req.params.chatname, 'join', {
		username: req.params.username,
	});

	res.json({ result: true });
});

// Leave chat
router.delete('/:chatname/:username', async (req, res) => {
	await pusher.trigger(req.params.chatname, 'leave', {
		username: req.params.username,
	});

	res.json({ result: true });
});

// Send message
router.post('/message', async (req, res) => {
	const { text, username, chatname, createdAt } = req.body;
	await pusher.trigger(chatname, 'message', req.body);

	ChatChannel.updateOne(
		{ name: chatname },
		{ $push: { messages: { username, text, createdAt } } }
	).exec();

	res.json({ result: true });
});

router.get('/previousMessages/:chatname', (req, res) => {
	ChatChannel.findOne({ name: req.params.chatname }).then((resp) => {
		res.json({
			result: true,
			messages: resp.messages,
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

module.exports = router;
