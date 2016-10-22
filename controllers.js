var path = require('path');
var config = require(path.resolve('./config.js'));
var Client = require('node-rest-client').Client;
var client = new Client();

exports.identifySlackOauth = function(req, res, next){
  if(Object.keys(req.query).length !== 0 &&
    Object.keys(req.query)[0] === 'code' &&
    Object.keys(req.query)[1] === 'state' &&
    req.query.state === config.slackOauthState)
  {
    var slackOauthCode = req.query.code;

    client.get('https://slack.com/api/oauth.access?client_id=' + 
      config.slackClientID + '&client_secret=' + 
      config.slackClientSecret + '&code=' + slackOauthCode +
      '&redirect_uri=' + config.redirectURI, function(response, err){

        //TODO: Do something with access token...
        //config.slackAccessToken = response.access_token;
      });
  }

  next();
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
  var canvasToken;
  if(req.body){
    canvasToken = req.body.text;
  }
  else{
    //maybe return JSON with error message?
    return res.end();
  }
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



        // raw response    //console.log(response);
  });
};

exports.getCanvasAssign = function(req, res){
  console.log(req.body);
  var responseURL = req.body.response_url;
  var ids = [];
  var txt = "";

  client.get("https://ufl.instructure.com/api/v1/courses?enrollment_state=active&access_token=" + config.canvasToken, function (data, response) {
        for(var course in data){
          var courseID = data[course].id;
          if(courseID !== undefined) {
            ids.push(courseID);
          }
        }

        var count = 0;
        res.status(200).json({
          'text': "Retrieving Assignments...\n"
        });
        var second = function() {
          console.log(count + " in loop");
          console.log("txt: " + txt);
          client.get("https://ufl.instructure.com/api/v1/courses/"+ids[count]+"/assignments?search_term=" + "preliminary" + "&access_token=" + config.canvasToken, function (data, response) {
            for(var course in data){
                if(course !== undefined){
                  txt += data[course].name + "\n" + data[course].html_url + "\nSubmitted: " + data[course].has_submitted_submissions + "\nDue: " + data[course].due_at + "\nPoints: " + data[course].points_possible + "\n\n";
                }
            }
            count++;
            if(count < ids.length) {
              second();
            }
            if(count === ids.length) {
              console.log("===========================================");
              var args = {
                data: {text: txt},
                headers: {"Content-Type" : "application/json"}
              }
              client.post(responseURL, args, function(data, response) {
                console.log(data);
                console.log("\n" + response);
              });
            }
          });
        };
        second();

    });
};
