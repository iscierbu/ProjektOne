/* Author : Mehmet Altuntas 741294, Burak Iscier 761336 */
var groupchat = "";
var privatechats = [];
var privatenotif = [];
var private = "no";



$(function () {
  var socket = io();
  $('#dchat').hide();
  $('#fregist').hide();

  /**
 * reaction of login button
 * send username to server
 *
 * @param {*}
 * @returns false
 */
  $('#flogin').submit(function () {
    check = $('#u').val().split('<');
    if ($('#u').val().length > 0 && $('#u').val().split(' ').length<2 && $('#u').val()!=' ' && check.length<2) {
      socket.emit('login', [$('#u').val(),$('#p').val()]);
      return false;
    }else{
      alert('dont use whitespace and html tags');
    }
  });

  socket.on('loginsucc', function (msg) {
    $('#dlogin').hide();
    $('#dchat').show();
    $('#usrnme').html(msg[0]);
    if(msg[1] != null){
      console.log(msg[1]);
      $("#pic").attr("src", URL.createObjectURL(createFileBlob([msg[1],"profilpic",[msg[2]]])));
    }
    return false;
  });

  $('#fregist').submit(function () {
    var namReg = new RegExp(/^[a-zA-Z0-9].{4,20}$/);
   if ($('#nu').val().match(namReg) != null && $('#np').val().match(namReg) != null && $('#np').val() == $('#np2').val()){
      socket.emit('regist', [$('#nu').val(),$('#np').val(),$('#np2').val()]);
    }else{
      alert('Username or Password not correct');
    }
   return false;
  });

  socket.on('loginmessage', function (msg) {
    alert(msg);
  });

  socket.on('registmessage', function (msg) {
    alert(msg);
  });

  /**
  * reaction of send button
  * check if file is loaded or a message wrote
  * and check if /priv or /list is in the message
  *
  * @param {*}
  * @returns false
  */
  $('#fsend').submit(function () {
    // if file selected
    if ($('#fileInput')[0].files[0] != undefined) {
      if ($('#fileInput')[0].files[0].size > "5000000") {
        $('#fileInput').val("");
        alert('Please use a filesize < 5mb');
        return false;
      }
      var file = $('#fileInput')[0].files[0];
      file.name = $('#fileInput')[0].files[0].name;
      file.type = $('#fileInput')[0].files[0].type;
      var filecomplete = [file, $('#fileInput')[0].files[0].name, $('#fileInput')[0].files[0].type, "file"];
      $('#fileInput').val("");
      if (private === 'no') {
        socket.emit('chat message', filecomplete);
      } else {
        socket.emit('priv message', [$('#usrnme').text(), private, filecomplete]);
      }
    } else if($('#picInput')[0].files[0] != undefined){
      if ($('#picInput')[0].files[0].size > "1000000") {
        $('#picInput').val("");
        alert('Please use a filesize < 1mb and only jpg');
        return false;
      }else{
        socket.emit('newPicture',[$('#picInput')[0].files[0],$('#picInput')[0].files[0].type]);
        $('#picInput').val("");
      }
   }else if ($('#m').val().length < 1) {

    } else {
      $('#m').val($('#m').val().split("<").toString());
      $('#m').val($('#m').val().split(">").toString());
      var check = $('#m').val().split(":");
      if (check[0] === '/priv') {
        check[0] = $('#usrnme').text();
        socket.emit('priv message', check);
      } else if (private != 'no') {
        check = [$('#usrnme').text(), private, $('#m').val()];
        socket.emit('priv message', check);
      } else {
        socket.emit('chat message', $('#m').val());
      }
      $('#m').val('');
    }
    return false;
  });

  /**
 * get group message in an array
 * 0 = first Person
 * 1 = message or file
 * 2 = timestamp of message
 *
 * @param {*} msg
 * @returns
 */
  socket.on('chat message', function (msg) {
    if (private === 'no') {
      if (msg[0] === 'Login' || msg[0] === 'Logout') {
        $('#messages').append('<li style="color:red">' + msg[2] + " - " + msg[0] + ": " + msg[1] + '</li>');
      } else if (msg[1][3] === "file") {
        $('#messages').append('<li>' + msg[2] + ' - ' + msg[0] + ': <a href="' + URL.createObjectURL(createFileBlob(msg[1])) + '" target="_blank">' + msg[1][1] + '</a> </li>');
      }
      else {
        $('#messages').append('<li>' + msg[2] + " - " + msg[0] + ": " + msg[1] + '</li>');
      }
    } else {
      if (msg[0] === 'Login' || msg[0] === 'Logout') {
        groupchat = groupchat + '<li style="color:red">' + msg[2] + " - " + msg[0] + ": " + msg[1] + '</li>';
      } else if (msg[1][3] === "file") {
        groupchat = groupchat + '<li>' + msg[2] + ' - ' + msg[0] + ': <a href="' + URL.createObjectURL(createFileBlob(msg[1])) + '" target="_blank">' + msg[1][1] + '</a> </li>';
      } else {
        groupchat = groupchat + '<li>' + msg[2] + " - " + msg[0] + ": " + msg[1] + '</li>';
      }
    }
  });

  socket.on('changepic', function (msg) {
    console.log(msg[0]);

    $("#pic").attr("src", URL.createObjectURL(createFileBlob([msg[0],"profilpic",msg[1]])));
  });

  /**
   * get list of users as a message
   *
   * @param {*} msg
   * @returns
   */
  socket.on('list users', function (msg) {
    if (private === 'no') {
      $('#messages').append($('<li style="color:blue">').text(msg));
    } else {
      groupchat = groupchat + '<li style="color:blue">' + msg + '</li>';
    }
  });

  /**
 * get the online users in an array
 *
 * @param {*} msg
 * @returns
 */
  socket.on('online users', function (msg) {
    $("#groupmember").html("");
    msg.forEach(element => {
      $('#groupmember').append($('<li style="font-size:20px" id="' + element + '" onclick="privateChat(' + element + ')">').text(element));
    });
  });

  /**
   * get private message in an array
   * 0 = first person
   * 1 = second person
   * 2 = message or file
   * 3 = timestamp of message
   *
   * @param {*} msg
   * @returns
   */
  socket.on("priv message", function (msg) {
    var formatmsg = '<li>' + msg[3] + " - " + msg[0] + ": ";
    if (msg[2][3] === "file") {
      formatmsg = formatmsg + '<a href="' + URL.createObjectURL(createFileBlob(msg[2])) + '" target="_blank">' + msg[2][1] + '</a></li>';
    } else {
      formatmsg = formatmsg + msg[2] + '</li>';
    }
    //Check who write the message
    if (msg[0] != $('#usrnme').text()) {
      if (privatechats[msg[0]] === undefined) {
        privatenotif[msg[0]] = 1;
        privatechats[msg[0]] = ('<li> Privatechat with ' + msg[0] + formatmsg);
      } else {
        privatenotif[msg[0]] = ++privatenotif[msg[0]];
        privatechats[msg[0]] = privatechats[msg[0]] + formatmsg;
      }
      if (private === msg[0]) {
        $('#messages').html(privatechats[msg[0]]);
        privatenotif[msg[0]] = 0;
      }
    } else {
      privatechats[msg[1]] = privatechats[msg[1]] + formatmsg;
      if (private === msg[1]) {
        $('#messages').html(privatechats[msg[1]]);
      }
    }
    chatlist();
  });

  //logout
  $('#flogout').on('submit', function () {
    socket.emit('disconnect');
  });

});


/**
 * create a blob from Uint8Array
 *
 * @param {*} file
 * @returns file
 */
function createFileBlob(file) {
  var file = new File([new Blob([new Uint8Array(file[0])])], file[1], { type: file[2] });
  return file;
}

/**
 *change to private chat
 *
 * @param {*} name
 */
function privateChat(name) {
  var orgname = "";
  if (name.textContent === undefined) {
    orgname = name[0].textContent;
  } else {
    orgname = name.textContent;
  }
  if ($('#usrnme').text() != orgname) {
    if (private === 'no') {
      groupchat = $('#messages').html();
    }
    private = orgname;
    if (privatechats[orgname] === undefined) {
      privatechats[orgname] = '<li> Privatechat with ' + private + '</li>';
    }
    privatenotif[orgname] = 0;
    $('#messages').html(privatechats[orgname]);
  }
  chatlist();
}

/**
 *change to groupchat
 *
 */
function groupChat() {
  if(private != 'no'){
    private = 'no';
    $('#messages').html(groupchat);
  }
}

/**
 *refresh the private list for the notifications
 *
 */
function chatlist() {
  $('#chatprivate').html("");
  var key;
  for (key in privatechats) {
    if (privatenotif[key] > 0) {
      $('#chatprivate').append($('<li  style="color:red;font-size:20px"" id="' + key + '" onclick="privateChat(' + key + ')">').text(key + " " + privatenotif[key]));
    } else {
      $('#chatprivate').append($('<li style="font-size:20px" id="' + key + '" onclick="privateChat(' + key + ')">').text(key));
    }
  }
};

function signIn(){
  $('#fregist').hide();
  $('#flogin').show();
}
function signUp(){
  $('#flogin').hide();
  $('#fregist').show();
}

