// Author : Mehmet Altuntas 741294, Burak Iscier 761336
let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let date = require('date-and-time');
let fs = require('fs');
let port = process.env.PORT || 3000;

let users = [];
let usernames = [];
let unique = 0;

app.use('/', express.static(__dirname + '/app'));
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/app/index.html');
});

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
  socket.on('username', function (msg) {
    if (users[msg] != undefined) {
      msg = msg + unique++;
    }
    socket.name = msg;
    users[msg] = socket;
    usernames.push(msg);
    console.log(time() + ' ' + socket.name + ' is connected ');
    socket.emit('username', socket.name);
    io.emit('chat message', ['Login', socket.name, time()]);
    io.emit('online users', usernames);
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
        console.log(msg[0] + msg[1] + msg[2][1])
      } else {
        console.log(msg);
      }
      users[msg[1]].emit('priv message', [msg[0], msg[1], msg[2], time()]);
      users[msg[0]].emit('priv message', [msg[0], msg[1], msg[2], time()]);
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
      } else {
        console.log('Chat: ' + socket.name + ': ' + msg);
      }
      io.emit('chat message', [socket.name, msg, time()]);
    }
  });

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
