var path = require('path');
var controller = require('./controllers.js');

module.exports = function(app){
  app.use('/?', controller.identifySlackOauth);
  app.post('/myusername', controller.myusername);
  app.post('/mycanvascourses', controller.getCanvasCourses);
  app.post('/assignments', controller.getCanvasAssign);
}
