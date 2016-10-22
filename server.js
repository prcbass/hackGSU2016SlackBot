var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

require(path.resolve('./routes.js'))(app);

app.use('/', express.static(__dirname + '/public'));

app.listen(8000, function(){
  console.log('Node server is listening!');
});