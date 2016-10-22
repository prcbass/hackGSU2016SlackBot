'use strict';

var InstructureBot = require('../lib/instructurebot');

var token = process.env.BOT_API_KEY;
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var instructureBot = new InstructureBot({
  token: token,
  dbPath: 'phony',
  name: 'lazaro'
});

instructureBot.run();
//instructureBot._welcomeMessage();