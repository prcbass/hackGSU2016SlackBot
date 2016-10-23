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

        res.redirect('/');
        //TODO: Do something with access token...
        //config.slackAccessToken = response.access_token;
      });
  }
  else{
    next();
  }
};

exports.myusername = function(req, res){
  console.log(req.query);
  console.log(req.query.user_name);
  var username = req.query.user_name;
  res.json({
    "text": "Hi! Your username is: " + username
  });
};

var createDateAtBeginningOfDay = function(month, day, year){
  var date = new Date();
  date.setMonth(month);
  date.setDate(day);
  date.setFullYear(year);
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
}

var createDateFromTerm = function(courseTerm){
  //TODO: index checking
  var year = courseTerm.substring(courseTerm.length-2, courseTerm.length);
  var term = courseTerm.substring(0, courseTerm.length-2).toLowerCase();
  console.log(term);

  //TODO: don't assume year is > 2000
  var dateYear = 2000 + parseInt(year);
  var termStartDate, termEndDate;
  
  //TODO: add summer AND don't use UF specific dates
  if(term === 'fall'){
    termStartDate = createDateAtBeginningOfDay(7, 22, dateYear); //August 22nd

    termEndDate = createDateAtBeginningOfDay(0, 4, dateYear + 1); //January 4th of following year
  }
  
  if(term === 'spring'){
    termStartDate = createDateAtBeginningOfDay(0, 4, dateYear);

    termEndDate = createDateAtBeginningOfDay(7, 22, dateYear);
  }

  return dateRangeObj = {
    termStartDate: termStartDate,
    termEndDate: termEndDate
  };
};

exports.getCanvasCourses = function(req, res){
  var dateObjToCompare;

  if(req.body.text){
    console.log(typeof req.body.text);
    console.log(req.body.text);
    var courseTerm = req.body.text;
    dateObjToCompare = createDateFromTerm(courseTerm);
  }

  client.get("https://ufl.instructure.com/api/v1/courses?per_page=100&access_token=" + config.canvasToken, function (data, response) {
        //console.log(data);
        var courses = [];

        for(var course in data){
          var courseName = data[course].name;

          if(req.body.text && courseName !== undefined){
            console.log(dateObjToCompare.termStartDate);
            console.log(dateObjToCompare.termEndDate);
            console.log(new Date(data[course].start_at));
            console.log(data[course].name);
            console.log('=================================');
            var courseStartDate = new Date(data[course].start_at);


            if(dateObjToCompare.termStartDate <= courseStartDate && 
              dateObjToCompare.termEndDate > courseStartDate)
            {
              courses.push({'title' : courseName});
            }
          }
          else if(courseName !== undefined){
            courses.push({'title' : courseName});
          }
        }

        var text;
        if(courses.length === 0){
          text = 'Sorry, no courses found for the specified criteria';
        }
        else{
          text = 'The following courses are registered in your Canvas™ profile:';
        }

        res.json({
          'text': text,
          'attachments' : courses
        });
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
