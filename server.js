var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');

var PORT = 8000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

require(path.resolve('./routes.js'))(app);



app.listen(PORT);

console.log("Listening on port: " + PORT);
