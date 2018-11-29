// Author : Mehmet Altuntas 741294, Burak Iscier 761336
let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let date = require('date-and-time');
let ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
let mysql = require('mysql');
let VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');
let passwordHash = require('password-hash');
let helmet = require('helmet');
let fs = require('fs'); 
var session = require('cookie-session');
let port = process.env.PORT || 3000;

//security
app.disable('x-powered-by');
var expiryDate = new Date( Date.now() + 60 * 60 * 1000 ); // 1 hour
app.use(session({
  name: 'session',
  keys: ['key1', 'key2'],
  cookie: { secure: true,
            httpOnly: true,
            domain: 'http://jovial-swartz.eu-de.mybluemix.net',
            path: 'foo/bar',
            expires: expiryDate
          }
  })
);
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.use(helmet.hsts({
  maxAge: 5184000
}));



let toneAnalyzer = new ToneAnalyzerV3({
  version_date: '2017-09-21',
  username: 'aa9742c6-e129-45be-a628-d51f744e76af',
  password: 'QUzBsczCdB7S',
  url: 'https://gateway-fra.watsonplatform.net/tone-analyzer/api'
});

let visualRecognition = new VisualRecognitionV3({
  version: '2018-03-19',
  url: 'https://gateway.watsonplatform.net/visual-recognition/api',
  iam_apikey: '_G5ILAWnsfQbd3Dn1Ay2YnzAzCsQyWAaZmG6IIRFWoM-',
  use_unauthenticated: false
});

let con = mysql.createConnection({
  host: "sl-eu-fra-2-portal.5.dblayer.com",
  port: "18351",
  user: "admin",
  password: "e639c3fbee03bb9fe0b4febc945547e15e5b45815e3faae88dc",
  database: "compose"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected to Database!");
});
app.use(helmet());
app.use('/', express.static(__dirname + '/app'));
app.get('/', function (req, res) {
  res.redirect('https://' + req.headers.host + req.url);
});

let users = [];
let usernames = [];

/**
 * creates a connection with the client
 *
 * @param {*} socket
 * @returns
 */
io.on('connection', function (socket) {
/**
 * check if the username exists and send it back
 *
 * @param {*} msg
 * @returns
 */
  socket.on('login', function (msg) {
    con.query("SELECT * FROM users where (name = '"+msg[0]+"')", function (err, result, fields) {
      if (err || result.length<1){
        socket.emit('loginmessage',"Username or Password incorrect");
      }else{
        if(passwordHash.verify(msg[1], result[0].password)){
        if(users[msg[0]] == undefined){
        socket.name = msg[0];
        users[msg[0]] = socket;
        usernames.push(msg[0]);
        console.log(time() + ' ' + socket.name + ' is connected ');
        var temppic = result[0].imgtype;
        if(temppic != null){
          temppic = new Buffer(result[0].imgdata, 'base64');
        }
        socket.emit('loginsucc',[socket.name,temppic, result[0].imgtype]);
        io.emit('chat message', ['Login', socket.name, time()]);
        io.emit('online users', usernames);
      }
      
    }else{
      socket.emit('loginmessage',"Username or Password incorrect");
    }
  }
    });
  });

  socket.on('regist', function (msg) {
    var hash = passwordHash.generate(msg[1]);
    var sql = "INSERT INTO users (name, password) VALUES ('"+msg[0]+"', '"+hash+"')";
    con.query(sql, function (err, result) {
      if (err){
        socket.emit('registmessage',"Username already taken");
      }else{
        socket.emit('registmessage',"Registration successful");
      }
    });
  });

  socket.on('newPicture', function (msg) {
    fs.writeFile('./temp.jpg', msg[0], 'binary', function(err){
      if (err) throw err
      console.log('File saved.')
    var images_file= fs.createReadStream('./temp.jpg');
    var params = {
      images_file: images_file,
    };
    visualRecognition.detectFaces(params, function(err, response) {
      if (err) { 
        console.log(err);
      } else {
        //console.log(JSON.stringify(response, null, 2));
        console.log(response.images[0].faces);
        if(response.images[0].faces.length >0){
          var base64pic = new Buffer(msg[0]).toString('base64');
      var sql = "UPDATE users SET imgtype = '"+msg[1]+"'  WHERE name = '"+socket.name+"'";
      con.query(sql, function (err, result) {
        if (err){}
      });
      var sql = "UPDATE users SET imgdata = '"+ base64pic +"'  WHERE name = '"+socket.name+"'";
      con.query(sql, function (err, result) {
        if (err){
          console.log(err);
          socket.emit('registmessage',"Picture change failture");
        }else{
          socket.emit('registmessage',"Picture change successful");
          socket.emit('changepic', msg);
        }
      });
        }else{
          socket.emit('registmessage',"Face not recognized");
        }
      }
    });
  });
  });
/**
 * receive and send private messages and files in an array
 * 0 = first person
 * 1 = second person
 * 2 = message or file
 *
 * @param {*} msg
 * @returns
 */
  socket.on('priv message', function (msg) {
    if (users[msg[1]] != undefined) {
      if (msg[2][3] === "file") {
        console.log(msg[0] + msg[1] + msg[2][1]);
        users[msg[1]].emit('priv message', [msg[0], msg[1], msg[2], time()]);
        users[msg[0]].emit('priv message', [msg[0], msg[1], msg[2], time()]);
      } else {
        var toneParams = {
          'tone_input': {'text': msg[2]},
          'content_type': 'application/json'
        }
        toneAnalyzer.tone(toneParams, (err, response) => {
          var feeling ="";
          if (err) {
            console.log(err);
          } else{
            if(!(response.document_tone.tones[0] == null)){
              feeling = " ("+ response.document_tone.tones[0].tone_id+ ")";
            }
          }
          msg[2] = msg[2] + feeling;
          users[msg[1]].emit('priv message', [msg[0], msg[1], msg[2], time()]);
          users[msg[0]].emit('priv message', [msg[0], msg[1], msg[2], time()]);
        });
      }
    }
  });
  /**
 * receive and send group messages and files in an array
 * 0 = first person
 * 1 = message or file
 *
 * @param {*} msg
 * @returns
 */
  //
  socket.on('chat message', function (msg) {
    
    if (msg === "/list") {
      socket.emit('list users', usernames);
    } else {
      if (msg[3] === "file") {
        console.log('Chat: ' + socket.name + ': ' + msg[1]);
        io.emit('chat message', [socket.name, msg, time()]);
      } else {
        console.log('Chat: ' + socket.name + ': ' + msg);
        var toneParams = {
          'tone_input': {'text': msg},
          'content_type': 'application/json'
        }
        toneAnalyzer.tone(toneParams, (err, response) => {
          var feeling ="";
          if (err) {
            console.log(err);
          }else{
            if(!(response.document_tone.tones[0] == null)){
              feeling =  " ("+ response.document_tone.tones[0].tone_id+ ")";
            }
          }
          msg = msg + feeling;
          io.emit('chat message', [socket.name, msg, time()]);
        });
      }
    }
  });

  function detectFace(img) {
    
}

  /**
   * if the connection closed
   *
   * @param {*}
   * @returns
   */
  socket.on('disconnect', function () {
    if (users[socket.name] != undefined) {
      delete users[socket.name];
      usernames.splice(usernames.indexOf(socket.name), 1);
      console.log(time() + ' ' + socket.name + ' is disconnected ');
      io.emit('chat message', ['Logout', socket.name, time()]);
      io.emit('online users', usernames);
    }
  });


});


http.listen(port, function () {
  console.log(time() + ' MeBu is listening on localhost:3000');
});

/**
   * returns actual time with timecode for germany
   *
   * @param {*}
   * @returns date
   */
function time() {
  return date.format(new Date(), 'HH:mm:ss / DD.MM.YYYY', false);
}
