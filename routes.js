var path = require('path');
var controller = require('./controllers.js');

module.exports = function(app){
  app.use('/?', controller.identifySlackOauth);
  app.get('/myusername', controller.myusername);
  app.post('/mycanvascourses', controller.getCanvasCourses);
  app.post('/assignments', controller.getCanvasAssign);
  app.post('/upcomingevents', controller.getCanvasEvents);
  app.post('/profile', controller.getCanvasProfile);
  app.post('/onlinecoursemanager', controller.onlineCourseManagerHelp);
  app.post('/calendar', controller.getCourseEvents);
  app.post('/announcements', controller.getCanvasAnnouncements);
}
