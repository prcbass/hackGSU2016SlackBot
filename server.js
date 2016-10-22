var express = require('express');
var app = express();
var path = require('path');

require(path.resolve('./routes.js'))(app);


app.listen(8000);