var Client = require('node-rest-client').Client;
var client = new Client();

exports.index = function(req, res){
  console.log(req);
  res.send('USING EXPRESS');
};

exports.lazaro = function(req, res){
  res.send('LAZARO HERE');
};

exports.hello = function(req, res){
  res.send('EMILY IS COOL');
};

exports.myusername = function(req, res){
  console.log(req.query);
  console.log(req.query.user_name);
  var username = req.query.user_name;
  res.json({
    "text": "Hi! Your username is: " + username
  });
};

exports.getCanvasCourses = function(req, res){
  //console.log(req.body);
  var canvasToken = req.body.text;
  var courses = "";

  client.get("https://ufl.instructure.com/api/v1/courses?access_token=" + canvasToken, function (data, response) {
        // parsed response body as js object
        //console.log(data);

        for(var course in data){
          var courseName = data[course].name;
          if(courseName !== undefined){
            console.log("COURSE: " + data[course].name + "\n");
            //courses.push(courseName);
            courses += courseName + ", ";
          }
        }

        res.json({
          'text': 'The following courses are registered in your canvas profile: ' + courses
        });



        // raw response
        //console.log(response);
  });
};

