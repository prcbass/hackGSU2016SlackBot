'use strict';

var path = require('path');

var InstructureBot = require('../lib/instructurebot');
var config = require(path.resolve('./../config.js'));
var token = config.token;
var canvasToken = config.canvasToken;
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var instructureBot = new InstructureBot({
  token: token,
  canvasToken: canvasToken,
  dbPath: 'phony',
  name: 'lazaro'
});

instructureBot.run();
//instructureBot._welcomeMessage();
