const isNumber = (num) => typeof num === 'number';

const isString = (data) => typeof data === 'string';

const isDate = (date) => new Date(date) instanceof Date;

// check if type is string and data is not made of spaces
const stringIsFilled = (data) => isString(data) && data.trim().length > 0;

// check if all values of and array type is string and data is not made of spaces
const stringsAreNotFilled = (dataArray) =>
	dataArray.some((data) => !isString(data) || data.trim().length <= 0);

const EMAIL_REGEX =
	/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const emailIsValid = (email) => EMAIL_REGEX.test(email);

// check if received object contain all expected properties
const checkBody = (body, props) =>
	props.length === Object.keys(body).length &&
	props.every((key) => !!body[`${key}`]);

// check if property from received object as the same type than model property
const ckeckTypes = (body, model, key) => typeof model[key] === typeof body[key];

module.exports = {
	isNumber,
	isString,
	isDate,
	stringIsFilled,
	stringsAreNotFilled,
	checkBody,
	ckeckTypes,
	emailIsValid,
};
