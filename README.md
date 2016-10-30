# OnlineCourseManager

## Synopsis

OnlineCourseManager uses Slack API and Canvas LMS API to integrate new Slash Commands into a Slack team directory. These Slash Commands are intended to be used with Canvas, a learning management system used by the University of Florida, to query and grab course information to display directly into Slack. 

Devpost Page for this project - https://devpost.com/software/hackgsu2016slackbot <br>

Demo - https://youtu.be/aYrF68Zh-Sw <br>

## Slack Slash Commands

Here Slack Slash Commands you can use with OnlineCourseManager: <br>
####List course names you are registered to. Optionally filter by term (e.g. Spring16)<br>
<br>Format:
<br>`/courses [term]`
<br><br>Example:
<br>`/courses Spring16` 
<br><br>
####Search assignments by keyword or by due date. <br>
<br>Format:
<br>`/assignments [keyword], /assignment start [day/month/year] end [day/month/year]`<br>
<br><br>Example: 
<br> `/assignments math worksheet`<br>
`/assignments start 10/21/2016 end 10/31/2016`<br>
`/assignments start 10/21/2016`<br>
`/assignments end 10/31/2016 ` 
<br><br>
####Gets all upcoming events - tests, quizzes, and assignments.<br>
`/upcomingevents` 
<br><br> 
####Lists all course announcements for the past 7 days. <br>
`/announcements` 
<br><br>
####Gets user's profile information.<br>
`/profile` 
<br><br>
####List calendar events stored in Canvas given a course code (e.g. COP4600).
####Optionally show all calendar events or filter by a start and/or end date.<br>
``/calendar coursecode start [d/m/y] OR/AND end [d/m/y] OR allevents``<br>
<br>Example:
<br>`/calendar COP4600`<br>
`/calendar COP4600 start 10/21/2016 end 10/31/2016`<br>
`/calendar COP4600 start 10/21/2016`<br>
`/calendar COP4600 end 10/31/2016`<br>
`/calendar COP4600 allevents` 
<br><br>
####Shows list of commands and their purpose, if the user input is 'help'<br>
`/onlinecoursemanager [help]`<br>
<br>Example:
<br>`/onlinecoursemanager help`
<br>

## Motivation

This project was created in part of the HackGSU 2016 event from Oct 21 - Oct 23, 2016. We're three students from the University of Florida who dislike navigating our insitution's course manager website, Canvas, to display upcoming assignments and any announcements.

## Installation

1) Visit https://9df9971b.ngrok.io/ and click 'Add to Slack' to give OnlineCourseManager permission to integrate with your Slack team.

2) Login to your insitutions Canvas (Instructure) account. Go to Account -> Settings and generate 'New Access Token' under approved integration. Make note of the token.

3) Clone the repository. In the root of the repository, create a file named config.js and input this information:

```javascript
module.exports = {
  slackBotToken : 'YOUR-SLACK-BOT-TOKEN',
  canvasToken : 'YOUR-CANVAS-TOKEN',
  slackClientID : 'YOUR-SLACK-CLIENT-ID',
  slackClientSecret : 'YOUR-SLACK-CLIENT-SECRET',
  slackOauthState : 'hackGSU',
  redirectURI : 'SEE-STEP-5',
};
```

4) Install npm, ngrok, and node.js. Run ``npm install``

5) Run `node server.js` and `./ngrok http 8000` in separate terminals and note the https URL fto use for redirectURI.

## API Reference

Canvas LMS API - https://canvas.instructure.com/doc/api/ <br>
Slack API - https://api.slack.com/

## Contributors

Sebastian Hernandez - https://github.com/prcbass/ <br>
Emily Macon - https://github.com/emily-macon <br>
Julian Tolentino - https://github.com/juliantolentino <br>
