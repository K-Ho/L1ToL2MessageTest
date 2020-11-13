'use strict';

require('dotenv-safe').config();

const { gray } = require('chalk');

const runner = require('./src/runner');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
	const secs = 0;
	// eslint-disable-next-line
	// while (true) {
		await runner();
		// console.log(gray(`Sleeping ${secs}s...`));
		// await sleep(secs * 1000);
	// }
})();
