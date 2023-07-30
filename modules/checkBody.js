const checkBody = (body, props) =>
	props.length === Object.keys(body).length &&
	props.every((key) => !!body[`${key}`]);

//  Si chaque élément de celui-ci existe et que le nombre d’éléments est le bon, la fonction renverra true et sinon false.

module.exports = {
	checkBody,
};
