'use strict';
var Client = require('node-rest-client').Client;
var client = new Client();

var util = require('util');
var path = require('path');
var fs = require('fs');
var mongoose = require('mongoose');
var Bot = require('slackbots');

var InstructureBot = function Constructor(settings){
  this.settings = settings;
  this.settings.name = this.settings.name || 'instructurebot';
  this.dbPath = settings.dbPath;
  this.canvasToken = settings.canvasToken;
  this.user = null;
  this.db = null;
};

util.inherits(InstructureBot, Bot);

InstructureBot.prototype._GET = function(str){
    client.get("https://ufl.instructure.com/api/v1/courses?access_token=" + this.canvasToken, function (data, response) {
        // parsed response body as js object
        console.log(data);
        // raw response
        console.log(response);
    });
}

InstructureBot.prototype.run = function(){
  InstructureBot.super_.call(this, this.settings);

  this.on('start', this._onStart);
  this.on('message', this._onMessage);
};

InstructureBot.prototype._onStart = function(){
  this._loadBotUser();
  //this._connectDb();
  //this._firstRunCheck();
  this._welcomeMessage();
  this._GET();
};

InstructureBot.prototype._loadBotUser = function(){
  var self = this;
  //console.log(this.users);
  this.user = this.users.filter(function(user){
    return user.name === self.name;
  })[0];
  //console.log(this.user);
};

//TODO: Work on design for db connectivity
InstructureBot.prototype._connectDb = function(){
  if(!fs.existsSync(this.dbPath)){
    console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
    process.exit(1);
  }

  mongoose.connect(this.dbPath);
  this.db = mongoose.connection;
};

//TODO: Create db schema first
InstructureBot.prototype._firstRunCheck = function(){
  var self = this;
};

InstructureBot.prototype._welcomeMessage = function(){
  console.log(this.channels[0].name);
  this.postMessageToChannel(this.channels[0].name, 'YOYOYO LAZARO IN THE HOUSE', {as_user: true});
};

InstructureBot.prototype._onMessage = function(message){
  if(this._isChatMessage(message) &&
    this._isChannelConversation(message) &&
    !this._isFromInstructureBot(message) &&
    this._isMentioningMe(message))
  {

    this._replyWithHello(message);
  }
};

InstructureBot.prototype._isChatMessage = function(message){
  console.log(message);
  console.log(message.type === 'message' && Boolean(message.text));
  return message.type === 'message' && Boolean(message.text);
};

InstructureBot.prototype._isChannelConversation = function(message){
  console.log(typeof message.channel === 'string' && message.channel[0] === 'C');
  return typeof message.channel === 'string' && message.channel[0] === 'C';
};

InstructureBot.prototype._isFromInstructureBot = function(message){
  return message.user === this.user.id;
};

InstructureBot.prototype._isMentioningMe = function(message){
  return message.text.toLowerCase().indexOf('lazaro') > -1 ||
    message.text.toLowerCase().indexOf(this.name) > -1;
};

InstructureBot.prototype._replyWithHello = function(originalMessage){
  var self = this;
  var channel = self._getChannelById(originalMessage.channel);
  this._GET("test");
};

InstructureBot.prototype._getChannelById = function(channelId){
  return this.channels.filter(function(item){
    return item.id === channelId;
  })[0];
};


module.exports = InstructureBot;
