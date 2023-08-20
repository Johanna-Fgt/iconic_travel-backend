// Get all formated dates between startDate and EndDate
const getDates = (startDate, endDate) => {
	let datesToCheckFromReq = [];
	let dif = new Date(endDate).getTime() - new Date(startDate).getTime();
	let daysNbr = dif / (1000 * 3600 * 24);
	for (let i = 0; i <= daysNbr; i++) {
		const date = new Date(startDate);
		const dateToCheck = date.setDate(date.getDate() + i);
		datesToCheckFromReq.push(new Date(dateToCheck).toLocaleDateString());
	}
	return datesToCheckFromReq;
};

module.exports = {
	getDates,
};
