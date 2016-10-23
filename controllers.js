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

exports.onlineCourseManagerHelp = function(req, res){
  var body = req.body.text;
  var n = body.search(/help/i);
  if(n > -1){
    var info = [];


    obj1 = {
          'color': "4183D7",
          'text': "`/courses [term]`\nExample: `/courses Spring16`",
          'title': "List course names you are registered to. Optionally filter by term (e.g. Spring16)",
          'mrkdwn_in' : ["text"]
    }
    obj2 = {
          'color': "4183D7",
          'text': '`/assignments [keyword], /assignment start [day/month/year] end [day/month/year]`\nExample: `/assignments math worksheet`\nExample: `/assignments start 10/21/2016 end 10/31/2016`\nExample: `/assignments start 10/21/2016`\nExample: `/assignments end 10/31/2016`',
          'title': "Search assignments by keyword or by due date.",
          'mrkdwn_in' : ["text"]
    }
    obj3 = {
          'color': "4183D7",
          'text': '`/upcomingevents`',
          'title': "Gets all upcoming events - tests, quizzes, and assignments.",
           'mrkdwn_in' : ["text"]
    }
    obj4 = {
          'color': "4183D7",
          'text': '`/announcements`',
          'title': "Lists all course announcements for the past 7 days.",
          'mrkdwn_in' : ["text"]

    }
    obj5 = {
          'color': "4183D7",
          'text': '`/profile`',
          'title': "Gets user's profile information.",
          'mrkdwn_in' : ["text"]
    }
    obj6 = {
          'color': "4183D7",
          'text': '`/calendar coursecode start [d/m/y] OR/AND end [d/m/y] OR allevents`\nExample: `/calendar COP4600`\nExample: `/calendar COP4600 start 10/21/2016 end 10/31/2016`\nExample: `/calendar COP4600 start 10/21/2016`\nExample: `/calendar COP4600 end 10/31/2016`\nExample: `/calendar COP4600 allevents`',
          'title': "List calendar events stored in Canvas given a course code (e.g. COP4600). Optionally show all calendar events or filter by a start and/or end date.",
          'mrkdwn_in' : ["text"]
    }
    obj7 = {
          'color': "4183D7",
          'text': '`/onlinecoursemanager [help]`\nExample: `/onlinecoursemanager help`',
          'title': "Shows list of commands and their purpose, if the user input is 'help'",
          'mrkdwn_in' : ["text"]
    }

    info.push(obj1);
    info.push(obj2);
    info.push(obj3);
    info.push(obj4);
    info.push(obj5);
    info.push(obj6);
    info.push(obj7);

    res.json({
      'text': 'Here are the commands you can use with OnlineCourseManager.',
      'attachments': info
    });
  }
  else{
    var info = [];
    obj = {
          'text': "Use '/onlinecoursemanager help' to see all the commands of this bot."
    }
    info.push(obj);
    res.json({
      'attachments': info
    });
  }

};
