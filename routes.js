var path = require('path');
var controller = require('./controllers.js');


module.exports = function(app){
  app.get('/', controller.index);
  app.get('/lazaro', controller.lazaro);
  app.get('/emily', controller.hello);
  app.get('/myusername', controller.myusername);
  app.post('/mycanvascourses', controller.getCanvasCourses);
  app.post('/grades', controller.getCanvasGrades);
}
