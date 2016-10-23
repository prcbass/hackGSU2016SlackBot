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
  var username = req.query.user_name;
  res.json({
    "text": "Hi! Your username is: " + username
  });
};

exports.getCanvasAnnouncements = function(req, res){
  var ids = [];
  var courseNames = [];
  var responseURL = req.body.response_url;
  var txt = "";
  var attach = [];

  var lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  res.status(200).json({
    'text': "Retrieving announcements from the last 7 days...\n"
  });

  client.get("https://ufl.instructure.com/api/v1/courses?enrollment_state=active&access_token=" + config.canvasToken, function (data, response) {
    for(var course in data){
      var name = data[course].name;
      var courseID = data[course].id;
      if(courseID !== undefined && name !== undefined) {
        ids.push(courseID);
        courseNames.push(name);
      }
    }

    var count = 0;
    var announce = function(){
      client.get("https://ufl.instructure.com/api/v1/announcements?context_codes=course_" + ids[count] + "&access_token=" + config.canvasToken, function (data, response) {
        txt += "\n\n\n-------- " + courseNames[count] + " --------";
        for(var course in data){
          if(data[course] !== undefined){
            var posted = new Date(data[course].posted_at);
            if(posted.valueOf() >= lastWeek) {
              var pretext = courseNames[count];
              var title = data[course].title;
              var title_link = data[course].html_url;
              var footer = data[course].posted_at;
              var textBody = striptags(data[course].message);
              attach.push({
                "pretext": pretext,
                "title": title,
                "footer": footer,
                "title_link": title_link,
                "text": textBody
              });
            };
          }
        }
        count++;
        if(count === ids.length){
          if(attach === "") {
            attach = "\n\nSorry, no announcements found";
          }
          var args = {
            data: {"attachments": attach},
            headers: {"Content-Type" : "application/json"}
          }
          client.post(responseURL, args, function(data, response) {});
        }
        if(count < ids.length){
          announce();
        }
      });
    }
    announce();
  });
}

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
    var courseTerm = req.body.text;
    dateObjToCompare = createDateFromTerm(courseTerm);
  }

  client.get("https://ufl.instructure.com/api/v1/courses?per_page=100&access_token=" + config.canvasToken, function (data, response) {
    var courses = [];

    for(var course in data){
      var courseName = data[course].name;

      if(req.body.text && courseName !== undefined){
        //Leaving to ease identification of date errors
        // console.log(dateObjToCompare.termStartDate);
        // console.log(dateObjToCompare.termEndDate);
        // console.log(new Date(data[course].start_at));
        // console.log(data[course].name);
        // console.log('=================================');
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

exports.getCanvasProfile = function(req, res){
  var info = [];
  client.get("https://ufl.instructure.com/api/v1/users/self/profile?access_token=" + config.canvasToken, function (data, response) {

    var name = data.short_name;
    var url = data.avatar_url;
    var email = data.login_id;

    if(name !== undefined){
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

exports.getCanvasAssign = function(req, res){
  console.log(req.body);
  var responseURL = req.body.response_url;
  var searchTerm = req.body.text;
  var usingSearchTerm = true;
  var tokens = searchTerm.split(" ");
  var ids = [];
  var courseNames = [];
  var txt = [];
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
        var name = data[course].name;
        if(courseID !== undefined && name !== undefined) {
          ids.push(courseID);
          courseNames.push(name);
        }
      }

      var count = 0;
      var second = function() {
        if(usingSearchTerm === true) {
          var htmlUrl = "https://ufl.instructure.com/api/v1/courses/"+ids[count]+"/assignments?search_term=" + searchTerm + "&bucket=future&access_token=" + config.canvasToken;
        }
        else {
          var htmlUrl = "https://ufl.instructure.com/api/v1/courses/"+ids[count]+"/assignments?access_token=" + config.canvasToken;
        }
        client.get(htmlUrl, function (data, response) {
          for(var course in data){

            var pretext = courseNames[count];
            var textBody;
            var title = data[course].name;
            var title_link = data[course].html_url;
            if(data[course].has_submitted_submissions === true) {
              textBody = "Due: " + data[course].due_at + "  |  COMPLETE";
            }
            else {
              textBody = "Due: " + data[course].due_at + "  |  INCOMPLETE";
            }
            var footer = "Points: " + data[course].points_possible;

              if(course !== undefined && usingSearchTerm === true){
                txt.push({
                  "pretext": pretext,
                  "title": title,
                  "title_link": title_link,
                  "text": textBody,
                  "footer": footer
                });
              }
              else if(course !== undefined && usingSearchTerm === false) {
                var assignmentDate = new Date(data[course].due_at);
                console.log("assignment date: " + assignmentDate + ", Start: " + start + ", End: " + end);
                if(assignmentDate <= end && assignmentDate >= start) {
                  txt.push({
                    "pretext": pretext,
                    "title": title,
                    "title_link": title_link,
                    "text": textBody,
                    "footer": footer
                  });
                }
              }
          }
          count++;
          if(count < ids.length) {
            second();
          }
          if(count === ids.length) {
            if(txt.length === 0) {
              txt.push({
                "pretext": "Sorry, no assignments found"
              });
            }
            var args = {
              data: {"attachments": txt},
              headers: {"Content-Type" : "application/json"}
            }
            client.post(responseURL, args, function(data, response) {});
          }
        });
      };
      second();
    });
};

exports.getCanvasAnnouncements = function(req, res){
  var ids = [];
  var courseNames = [];
  var responseURL = req.body.response_url;
  var txt = "";
  var attach = [];

  var lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  res.status(200).json({
    'text': "Retrieving announcements from the last 7 days...\n"
  });

  client.get("https://ufl.instructure.com/api/v1/courses?enrollment_state=active&access_token=" + config.canvasToken, function (data, response) {
    for(var course in data){
      var name = data[course].name;
      var courseID = data[course].id;
      if(courseID !== undefined && name !== undefined) {
        ids.push(courseID);
        courseNames.push(name);
      }
    }

    var count = 0;
    var announce = function(){
      client.get("https://ufl.instructure.com/api/v1/announcements?context_codes=course_" + ids[count] + "&access_token=" + config.canvasToken, function (data, response) {
        txt += "\n\n\n-------- " + courseNames[count] + " --------";
        for(var course in data){
          if(data[course] !== undefined){
            var posted = new Date(data[course].posted_at);
            if(posted.valueOf() >= lastWeek) {
              var pretext = courseNames[count];
              var title = data[course].title;
              var title_link = data[course].html_url;
              var footer = data[course].posted_at;
              var textBody = striptags(data[course].message);
              attach.push({
                "pretext": pretext,
                "title": title,
                "footer": footer,
                "title_link": title_link,
                "text": textBody
              });
            };
          }
        }
        count++;
        if(count === ids.length){
          if(attach === "") {
            attach = "\n\nSorry, no announcements found";
          }
          var args = {
            data: {"attachments": attach},
            headers: {"Content-Type" : "application/json"}
          }
          client.post(responseURL, args, function(data, response) {});
        }
        if(count < ids.length){
          announce();
        }
      });
    }
    announce();
  });
};

exports.getCourseEvents = function(req, res){
  //coursename start [d/m/y] OR/AND end [d/m/y] OR allevents
  var params = req.body.text;
  var tokens = params.split(" ");
  var courseCode = tokens[0];
  var courseFound = false;
  var calendarEvents = [];

  console.log(courseCode);

  client.get("https://ufl.instructure.com/api/v1/courses?per_page=100&access_token=" + config.canvasToken, function (data, response) {
    for(var course in data){
      console.log(data[course]);
      console.log(data[course].course_code);
      console.log('===============================');
      if(data[course].course_code !== undefined){
        console.log(data[course].course_code.toLowerCase().indexOf(courseCode.toLowerCase()));
      }

      if(data[course].course_code !== undefined && 
         data[course].course_code.toLowerCase().indexOf(courseCode.toLowerCase()) > -1){

        courseFound = true;
        var courseContextCode = 'course_' + data[course].id;
        console.log(courseContextCode);

        //only coursecode was given, use today as default (from canvas API)
        if(tokens.length === 1){
          client.get('https://ufl.instructure.com/api/v1/calendar_events?per_page=100&contex_codes[]=' + courseContextCode + '&access_token=' + config.canvasToken, function(calData, response){

            for(event in calData){

              var calEventObj = {
                'title' : calData[event].title,
                'text' : 'Event URL: ' + calData[event].html_url + '\nEvent Start: ' + 
                new Date(calData[event].start_at) + '\nEvent End: ' + 
                new Date(calData[event].end_at) + '\nDescription: ' + striptags(calData[event].description)
              };

              calendarEvents.push(calEventObj);
            }

            var text;
            if(calendarEvents.length === 0){
              text = 'No calendar events found for \"' + courseCode + '\"'; 
            }
            else{
              text = 'Calendar Events for ' + courseCode;
            }

            res.json({
              'text': text,
              'attachments': calendarEvents
            });

          });
        }
        //only start was specified
        else if(tokens[1].toLowerCase() === 'start' && tokens.length === 3){
          var dateTokens = tokens[2].split('/');
          var month = dateTokens[0];
          var day = dateTokens[1];
          var year = dateTokens[3];

          //TODO: make this more robust
          if(year.length === 2){
            year = '20' + year;
          }

          var startDate = year + '-' + month + '-' + day;
          var endDate = year + '-' + month + '-' + (parseInt(day) + 1).toString();

          client.get('https://ufl.instructure.com/api/v1/calendar_events?per_page=100&contex_codes[]=' + courseContextCode + 
            '&start_date=' + startDate + '&end_date=' + endDate + '&access_token=' + config.canvasToken, function(calData, response){

            for(event in calData){

              var calEventObj = {
                'title' : calData[event].title,
                'text' : 'Event URL: ' + calData[event].html_url + '\nEvent Start: ' + 
                new Date(calData[event].start_at) + '\nEvent End: ' + 
                new Date(calData[event].end_at) + '\nDescription: ' + striptags(calData[event].description)
              };

              calendarEvents.push(calEventObj);
            }


            var text;
            if(calendarEvents.length === 0){
              text = 'No calendar events found for \"' + courseCode + '\" for the specified date range'; 
            }
            else{
              text = 'Calendar Events for ' + courseCode;
            }

            res.json({
              'text': text,
              'attachments': calendarEvents
            });
          });
        }
        //only end was specified
        else if(tokens[1].toLowerCase() === 'end' && tokens.length === 3){
          var dateTokens = tokens[2].split('/');
          var month = dateTokens[0];
          var day = dateTokens[1];
          var year = dateTokens[3];

          //TODO: make this more robust
          if(year.length === 2){
            year = '20' + year;
          }

          var endDate = year + '-' + month + '-' + day;
          var startDate = year + '-' + month + '-' + (parseInt(day) - 1).toString(); //TODO: works for all days except month boundaries

          client.get('https://ufl.instructure.com/api/v1/calendar_events?per_page=100&contex_codes[]=' + courseContextCode + 
            '&start_date=' + startDate + '&end_date=' + endDate + '&access_token=' + config.canvasToken, function(calData, response){

            for(event in calData){

              var calEventObj = {
                'title' : calData[event].title,
                'text' : 'Event URL: ' + calData[event].html_url + '\nEvent Start: ' + 
                new Date(calData[event].start_at) + '\nEvent End: ' + 
                new Date(calData[event].end_at) + '\nDescription: ' + striptags(calData[event].description)
              };

              calendarEvents.push(calEventObj);
            }

            var text;
            if(calendarEvents.length === 0){
              text = 'No calendar events found for \"' + courseCode + '\" for the specified date range'; 
            }
            else{
              text = 'Calendar Events for ' + courseCode;
            }

            res.json({
              'text': text,
              'attachments': calendarEvents
            });
          });
        }
        //both start and end were specified
        else if(tokens[1].toLowerCase() === 'start' && tokens[3].toLowerCase() === 'end' && tokens.length === 5){
          var startDateTokens = tokens[2].split('/');
          var endDateTokens = tokens[4].split('/');

          var startMonth = startDateTokens[0];
          var startDay = startDateTokens[1];
          var startYear = startDateTokens[2];

          if(startYear.length == 2){
            startYear = '20' + startYear;  
          }

          var endMonth = endDateTokens[0];
          var endDay = endDateTokens[1];
          var endYear = endDateTokens[2];

          if(endYear.length == 2){
            endYear = '20' + endYear;  
          }

          var startDate = startYear + '-' + startMonth + '-' + startDay;
          var endDate = endYear + '-' + endMonth + '-' + endDay;

          client.get('https://ufl.instructure.com/api/v1/calendar_events?per_page=100&contex_codes[]=' + courseContextCode + 
            '&start_date=' + startDate + '&end_date=' + endDate + '&access_token=' + config.canvasToken, function(calData, response){

            for(event in calData){

              var calEventObj = {
                'title' : calData[event].title,
                'text' : 'Event URL: ' + calData[event].html_url + '\nEvent Start: ' + 
                new Date(calData[event].start_at) + '\nEvent End: ' + 
                new Date(calData[event].end_at) + '\nDescription: ' + striptags(calData[event].description)
              };

              calendarEvents.push(calEventObj);
            }

            var text;
            if(calendarEvents.length === 0){
              text = 'No calendar events found for \"' + courseCode + '\" for the specified date range'; 
            }
            else{
              text = 'Calendar Events for ' + courseCode;
            }

            res.json({
              'text': text,
              'attachments': calendarEvents
            });
          });
        }
        //allevents specified
        else if(tokens[1].toLowerCase() === 'allevents' && tokens.length === 2){

          client.get('https://ufl.instructure.com/api/v1/calendar_events?per_page=100&contex_codes[]=' + courseContextCode + '&all_events=true&access_token=' + config.canvasToken, function(calData, response){

            for(event in calData){

              var calEventObj = {
                'title' : calData[event].title,
                'text' : 'Event URL: ' + calData[event].html_url + '\nEvent Start: ' + 
                new Date(calData[event].start_at) + '\nEvent End: ' + 
                new Date(calData[event].end_at) + '\nDescription: ' + striptags(calData[event].description)
              };

              calendarEvents.push(calEventObj);
            }

            var text;
            if(calendarEvents.length === 0){
              text = 'No calendar events found for \"' + courseCode + '\" for the specified date range'; 
            }
            else{
              text = 'Calendar Events for ' + courseCode;
            }

            res.json({
              'text': text,
              'attachments': calendarEvents
            });
          });
        }
        //input not valid, tell user
        else{
          return res.json({
            'text' : 'The options entered were not valid. Please use `\\onlinecoursemanager help` for more information.'
          });
        }
      }
    }

    if(!courseFound){
      return res.json({
        'text' : 'No course with the course code \"' + courseCode + '\" can be found.'
      });
    }
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
