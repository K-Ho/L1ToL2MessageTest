'use strict';

require('dotenv-safe').config();

const { gray } = require('chalk');

const runner = require('./src/runner');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
	await runner();
})();
