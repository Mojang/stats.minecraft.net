var clients = [];
var canvas;
var context;
var maxCountDef = 50;
var maxCount = maxCountDef;
var terminator = [];

var offlineWarned = false;
var offline = function() {
  if (offlineMode || offlineWarned) return;
  offlineWarned = true;
  $('#live-notice').fadeOut(1000);
  $('#offline-notice').modal();
};

var spawn = function(x1, y1, x2, y2, startTime, time) {

  if (clients.length > maxCount) {
    return;
  }

  clients.push(new Client([x1, y1], [x2, y2], startTime, time));

};

window.requestAnimFrame = (function(c){
  return window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function(callback){
      window.setTimeout(callback, 1000 / 60);
  };
})();

var same = function(a, b) {
  var t = 30;
  return (a - b > -t && a - b < t);
};

var Bezier = function(start, end) {
  this.t = 0.0;
  this.delta = (0.005 + (400000 - (Math.pow((start[0] - end[0]),2) + Math.pow((start[1] - end[1]),2))) / 80000000) * ( Math.random() + 0.5);
  this.opacity = 0.25;
  this.points = [{x: start[0], y:start[1]}, {x: start[0] + (end[0] - [start[0]]) / 2, y: start[1] + (end[1] - [start[1]]) / 2}, {x:end[0], y:end[1]}];
  this.bezier = [];

  if (same(start[0], end[0]) && !same(start[1], end[1])) {
    // x is same-ish but not y so amp it horizontally
    this.amplitude = (start[0] - end[0]) * 1 + 30 * (start[0] >= end[0] ? 1 : -1);
    this.points[1].x = Math.max(start[0], end[0]) + this.amplitude;
  } else {
    this.amplitude = (start[1] - end[1]) * 1 + 30 * (start[1] < end[1] ? 1 : -1);
    this.amplitude = (end[1] - start[1]) * 1.5 + 30 * (start[1] < end[1] ? 1 : -1);
    this.points[1].y = Math.min(start[1], end[1]) + this.amplitude;
  }
};

Bezier.prototype = {
  update: function(i, a) {
    this.t += this.delta;
    // animate LIKE A BAWS
    if (this.t < 1) {
      // DON'T JUDGE ME! ;__;
      var cp = {x: this.points[0].x + ((this.points[1].x - this.points[0].x) * this.delta * (this.t / this.delta)), y: this.points[0].y + ((this.points[1].y - this.points[0].y) * this.delta * (this.t / this.delta))};
      var p1 = {x: this.points[1].x + ((this.points[2].x - this.points[1].x) * this.delta * (this.t / this.delta)), y: this.points[1].y + ((this.points[2].y - this.points[1].y) * this.delta * (this.t / this.delta))};
      this.bezier = [this.points[0], cp, {x: cp.x + ((p1.x - cp.x) * this.delta * (this.t / this.delta)), y: cp.y + ((p1.y - cp.y) * this.delta * (this.t / this.delta))}];
    } else if (this.t > 1.3 && this.opacity > 0) {
      this.opacity -= 0.01;
      if (this.opacity < 0) this.opacity = 0;
    } else if (this.t > 1.3) {
      a.splice(i, 1);
    }
  },

  draw: function() {
    context.beginPath();
    context.globalCompositeOperation = 'lighter';
    context.strokeStyle = "rgba(255,245,250," + this.opacity + ")";
    context.lineWidth=2;
    context.moveTo(this.bezier[0].x, this.bezier[0].y);
    context.quadraticCurveTo(this.bezier[1].x, this.bezier[1].y, this.bezier[2].x, this.bezier[2].y);
    context.stroke();
    context.globalCompositeOperation = 'source-over';
  }

};

var Client = function(pos, serverPos, startTime, time) {
  this.pos = pos;
  this.active = false;
  if (typeof time !== "undefined") {
    this.time = parseInt(time) + (Math.round(Math.random() * (parseInt(time) * 3)));
  } else {
    this.time = Math.round(Math.random() * 4000);
  }
  this.startTime = startTime;
  this.age = 0;
  this.size = 2 + Math.round(Math.random() * 3);
  this.proj = d3.geo.mercator()(this.pos);
  this.xy = [this.proj[0] * 1.5 - 368, this.proj[1] * 1.5 - 15];
  this.serverPos = serverPos;
  this.serverProj = d3.geo.mercator()(this.serverPos);
  this.serverXy = [this.serverProj[0] * 1.5 - 372, this.serverProj[1] * 1.5 - 15];
  if (!same(this.xy[0], this.serverXy[0]) && !same(this.xy[1], this.serverXy[1])) {
    this.line = new Bezier(this.xy, this.serverXy);
  } else {
    maxCount += 1;
  }
};

Client.prototype = {
  update: function(i, a) {
    this.age += 1;

    if (this.age > 300) {
      a.splice(i, 1);
      if (maxCount > maxCountDef) {
        maxCount -= 1;
      }
    }

    if (this.line) this.line.update(i, a);
  },

  draw: function() {
    context.fillStyle = "rgba(195,225,225,0.5)";
    context.fillRect(this.xy[0] - this.size / 2, this.xy[1] - this.size / 2, this.size, this.size);
    context.fillRect(this.serverXy[0] - this.size / 2, this.serverXy[1] - this.size / 2, this.size, this.size);
  },

  drawLine : function() {
    if (this.line) this.line.draw();
  }
};

var animate = function() {

  if (clients.length > 3000) {
    clients = clients.slice(0, 200);
  }

  clients.forEach(function(el, i, a){
    if(!el.active && (el.startTime + el.time) < (new Date()).getTime()) {
      el.active = true;
    }
    if (el.active) {
      el.update(i, a);
    }
  });

  context.clearRect(0, 0, canvas.width, canvas.height);

  clients.forEach(function(el) {
    if (!el.active)
      return;
    el.draw();
    el.drawLine();
  });
//  clients.forEach(function(el){el.drawLine();});

  drawTerminator();

  requestAnimFrame(function(){
    animate();
  });

};

var connect = function() {
  d3.select("#canvas-container")
    .append("canvas")
      .attr("id", "canvas")
      .attr("width", 750)
      .attr("height", 525);

  canvas = $('#canvas')[0];
  context = canvas.getContext('2d');

  try {
    var socket = io.connect("http://ec2-107-21-202-56.compute-1.amazonaws.com", {port : 9000});
    socket.on('connect', function() {
      log("Connected to data hose.");
    });
    socket.on('join', function(message){
      messageReceived(message);
    });
    socket.on('disconnect', function(){
      offline();
    });
  } catch (err) {
    offline();
  }
};

var dayOfTheYear = function(date) {
  var start = new Date(date.getFullYear(), 0, 0);
  var diff = date - start;
  var oneDay = 1000 * 60 * 60 * 24;
  var day = Math.floor(diff / oneDay);
  return day;
}

var getDaylightY = function(x) {
  var equinox = dayOfTheYear(new Date(0, 2, 20, 0, 0, 0, 0));
  var currentDay = dayOfTheYear(new Date());
  var offsetSin = ((365.25 - equinox + currentDay) % 365.25)/365.25;
  var offsetSinFactor = Math.sin(offsetSin * 2 * Math.PI * x);
  var offsetY = offsetSinFactor * 23.44;
  var offsetYmerc = Math.atan(Math.sinh(offsetY)) * (180 / Math.PI) / 90 + 1;
  return offsetYmerc;
}

var drawDaylight = function() {
  var xPoints = 24;
  var xDelta = context.canvas.width / xPoints;
  context.beginPath();
  context.globalCompositeOperation = 'source-over';
  context.strokeStyle = "rgba(255,255,0,1.0)";
  context.lineWidth=2;
  context.moveTo(0, getDaylightY(15/xPoints) * context.canvas.height / 2);
  for (var i = 0; i <= xPoints; i++) {
    var x = i + 15; // time to left
    if (x > 23)
      x -= 24;
    var y = getDaylightY(x/xPoints) * context.canvas.height / 2;
    log(i + ", " + y);
    context.lineTo(i * xDelta,  y);
  }
  context.stroke();
};

// This isn't really too accurate, too tired ahoy!
var refreshTerminator = function() {
  var dayOfYear = dayOfTheYear(new Date());
  var dec = -23.5 * Math.cos(2 * Math.PI / 365 * (dayOfYear - 172));
  var tau = (new Date()).getHours() + ((new Date()).getMinutes() / 60);
  var k = Math.PI/180;
  var x0 = 0.5;
  var y0 = 0.5;
  var x, y;
  var longitude, tanLat, arctanLat;
  var steps = 100;

  terminator = [];
  terminator.push([-1, -1]);

  for (var i = -180; i < 180; i++) {
    longitude = i + (180 * tau / 12);
    tanLat = - Math.cos(longitude * k) / Math.tan(dec * k);
    arctanLat = Math.atan(tanLat) / k;

    // normalize to -1 .. 1
    y = (y0 - arctanLat) / 60; // arbitrary
    x = (x0 + i) / 150;

    // mercat
    y = Math.atan(Math.sinh(y)) / k / 90;

    // scale
    y *= context.canvas.height / 2;
    y += context.canvas.height / 2 + 70; // arbitrary
    x *= context.canvas.width / 2;
    x += context.canvas.width / 2;

    terminator.push([x, y]);
  }
  terminator.push([context.canvas.width + 1, -1]);
};

var drawTerminator = function() {
  context.beginPath();
  context.globalCompositeOperation = 'lighter';
  context.moveTo(-1, -1);
  context.strokeStyle = "rgba(170,220,255,0.20)";
  context.lineWidth=1;

  for (var i = 0; i < terminator.length; i++) {
    context.lineTo(terminator[i][0], terminator[i][1]);
  }

  context.lineTo(context.canvas.width + 1, -1);
  context.closePath();
  context.stroke();
  context.globalCompositeOperation = 'source-over';
}

var messageReceived = function(message) {
  var messagedAt = (new Date()).getTime();
  message.forEach(function(el, i, a) {
      var r = /^([\-\d\.]+), ([\-\d\.]+)\|([\-\d\.]+), ([\-\d\.]+)(\|(\d+))?/g;
      var m = r.exec(el);
      if (m[1] && m[2] && m[3] && m[4]) {
        spawn(m[2], m[1], m[4], m[3], messagedAt, m[6]);
      } else {
        log("Malformed data: " + el);
      }
  });
};

MockStream = function () {};
MockStream.data = [];
MockStream.index = 0;
MockStream.next = function() {
  MockStream.index += 1;
  if (MockStream.data.length >= MockStream.index) {
    var message = MockStream.data[MockStream.index];
    if (message) {
      messageReceived([message]);
    }
  } else {
    MockStream.index = 0; // restart
  }

  window.setTimeout(MockStream.next, Math.random() * 20 + 10);
};

$(document).ready(function() {

  $('a.scroll-to').click(function() {
    e.preventDefault();

    $.scrollTo( this.hash, 1500, { easing:'elasout' });
    return false;
  });

  $('.modal .close').click(function(e) {
    e.preventDefault();

    $(this).parent().fadeOut();
    $('#simplemodal-overlay').fadeOut();

    return false;
  });

  $('#count-select a').click(function(e) {
    e.preventDefault();

    var r = /#(\d+)$/;
    var count = r.exec(e.target.href)[1];
    if (!isNaN(parseInt(count))) {
      maxCountDef = parseInt(count);
      maxCount = maxCountDef;
    }

    return false;
  });

  if (offlineMode) {
    $('#live-notice').hide();
    $.getJSON('/public/joins.json', function(data) {
      MockStream.data = data;
      MockStream.next();
    });
  }

  $('#kaboom').hover(function(e) {
    var warn = $('<div></div>').attr('id', 'kaboom-warning').text("You're on your own").appendTo('#count-select');
    warn.animate({top: -35, opacity: 1});
  }, function(e) {
    $('#kaboom-warning').remove();
  });

  $('#play-mock-data').click(function(e) {
    e.preventDefault();

    $('.modal .close').trigger('click');
    $.getJSON('/public/joins.json', function(data) {
      MockStream.data = data;
      MockStream.next();
    });

    return false;
  });

  connect();

  refreshTerminator();
  window.setInterval(refreshTerminator, 60 * 1000);

  animate();
});
