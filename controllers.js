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