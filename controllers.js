var path = require('path');
var config = require(path.resolve('./config.js'));
var Client = require('node-rest-client').Client;
var striptags = require('striptags');
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


  client.get("https://ufl.instructure.com/api/v1/courses?access_token=" + config.canvasToken, function (data, response) {
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
  var searchTerm = req.body.text;
  var usingSearchTerm = true;
  var tokens = searchTerm.split(" ");
  var ids = [];
  var txt = "";
  var htmlURL;

  var start = new Date();
  var end = new Date("12/31/2100");

  res.status(200).json({
    'text': "Retrieving Assignments...\n"
  });

  if(tokens.length === 4) {
    if(tokens[0].toUpperCase() === "START") {
      usingSearchTerm = false;
      start = new Date(tokens[1]);
    }
    if(tokens[2].toUpperCase() === "END") {
      usingSearchTerm = false;
      end = new Date(tokens[3]);
      end.setSeconds(59);
      end.setMinutes(59);
      end.setHours(23);
    }
  }
  else if(tokens.length === 2) {
    if(tokens[0].toUpperCase() === "START") {
      usingSearchTerm = false;
      start = new Date(tokens[1]);
    }
    else if(tokens[0].toUpperCase() === "END") {
      usingSearchTerm = false;
      end = new Date(tokens[1]);
      end.setSeconds(59);
      end.setMinutes(59);
      end.setHours(23);
    }
  }

    client.get("https://ufl.instructure.com/api/v1/courses?enrollment_state=active&access_token=" + config.canvasToken, function (data, response) {
      for(var course in data){
        var courseID = data[course].id;
        if(courseID !== undefined) {
          ids.push(courseID);
        }
      }

      var count = 0;
      var second = function() {
        if(usingSearchTerm === true) {
          var htmlUrl = "https://ufl.instructure.com/api/v1/courses/"+ids[count]+"/assignments?search_term=" + searchTerm + "&access_token=" + config.canvasToken;
        }
        else {
          var htmlUrl = "https://ufl.instructure.com/api/v1/courses/"+ids[count]+"/assignments?bucket=future&access_token=" + config.canvasToken;
        }
        client.get(htmlUrl, function (data, response) {
          for(var course in data){
              if(course !== undefined && usingSearchTerm === true){
                txt += data[course].name + "\n" + data[course].html_url + "\nSubmitted: " + data[course].has_submitted_submissions + "\nDue: " + data[course].due_at + "\nPoints: " + data[course].points_possible + "\n\n";
              }
              else if(course !== undefined && usingSearchTerm === false) {
                var assignmentDate = new Date(data[course].due_at);
                console.log("assignment date: " + assignmentDate + ", Start: " + start + ", End: " + end);
                if(assignmentDate <= end && assignmentDate >= start) {
                  txt += data[course].name + "\n" + data[course].html_url + "\nSubmitted: " + data[course].has_submitted_submissions + "\nDue: " + data[course].due_at + "\nPoints: " + data[course].points_possible + "\n\n";
                }
              }
          }
          count++;
          if(count < ids.length) {
            second();
          }
          if(count === ids.length) {
            if(txt === "") {
              txt = "Sorry, no assignments found";
            }
            var args = {
              data: {text: txt},
              headers: {"Content-Type" : "application/json"}
            }
            client.post(responseURL, args, function(data, response) {});
          }
        });
      };
      second();
    });
};

exports.getCanvasEvents = function(req, res){
  var courses = [];
  client.get("https://ufl.instructure.com/api/v1/users/self/upcoming_events?enrollment_state=active&access_token=" + config.canvasToken, function (data, response) {

        for(var id in data){
          var assignmentName = data[id].title;
          var url = data[id].url;
          var description = data[id].description;
          var endAt = data[id].end_at;


          if(assignmentName !== undefined){
            console.log("EVENT: " + data[id].title + "\n");
            console.log("URL: " + data[id].url + "\n");
            console.log("DESCRIPTION: " + data[id].description + "\n");
            console.log("EVENT AT: " + data[id].endAt + "\n");

            obj = {
                  'title': "Event: " + assignmentName,
                  'text': "\n" + url + "\n Description: " + striptags(description) +
                  "\nEvent at: " + endAt +"\n"
            }
            courses.push(obj);

          }
        }

        res.json({
          'text': 'The following are upcoming: ',
          'attachments': courses
        });

  });
};

exports.getCanvasProfile = function(req, res){
  var info = [];
  client.get("https://ufl.instructure.com/api/v1/users/self/profile?access_token=" + config.canvasToken, function (data, response) {

        var name = data.short_name;
        var url = data.avatar_url;
        var email = data.login_id;

        if(name !== undefined){
          console.log("NAME: " + data.name + "\n");
          console.log("URL: " + data.avatar_url + "\n");
          console.log("EMAIL: " + data.login_id + "\n");

          obj = {
                'title': name,
                'text': "Email: " + email,
                'image_url' : url 
          }
          info.push(obj);

        }

        res.json({
          'text': 'User information: ',
          'attachments': info
        });

  });
};
