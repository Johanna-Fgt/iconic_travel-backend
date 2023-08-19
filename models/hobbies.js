const mongoose = require('mongoose');

const hobbySchema = mongoose.Schema({
	hobby: String,
});

const Hobby = mongoose.model('hobbies', hobbySchema);

module.exports = Hobby;
