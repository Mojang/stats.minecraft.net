var conn;
var servers = [];
var clients = [];
var canvas;
var context;
var maxCountDef = 50;
var maxCount = maxCountDef;


var offline = function() {
  log("service offline");
};

var spawn = function(x1, y1, x2, y2) {
  if (servers.length > 10) {
    servers.shift();
  }

  if (clients.length > maxCount) {
    return;
  }

  clients.push(new Client([x1, y1], [x2, y2]));

  // TEST
  //clients.push([x1, y1]);
  //servers.push([x2, y2]);

  /*var circle = svg.selectAll("circle")
    .data(data);

  circle.enter().append("circle")
    .attr("cy", function (d) {
      return d3.geo.mercator()(d)[1];
    })
    .attr("cx", function (d) {
      return d3.geo.mercator()(d)[0];
    })
    .attr("r", 1)
    .style("opacity", 0.5)
    .style("fill", "hotpink")
    .transition()
      .duration(2500)
      .attr("r", 5)
      .remove()
      .each("end", function() {
        data.shift();
        data.shift();
      });*/
  /*if (data.length > 18) {
          data.shift();
          data.shift();
        }
        var next = [m[4], m[3]];
        var next2 = [m[2], m[1]];
        data.push(next);
        data.push(next2);
        */
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
  this.opacity = 0.4;
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

var Client = function(pos, serverPos) {
  this.pos = pos;
  this.age = 0;
  this.size = 2 + Math.round(Math.random() * 3);
  this.proj = d3.geo.mercator()(this.pos);
  this.xy = [this.proj[0] * 1.5 - 372, this.proj[1] * 1.5 - 15];
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
      maxCount -= 1;
    }

    if (this.line) this.line.update(i, a);
  },

  draw: function() {
    context.fillStyle = "rgba(195,225,225,0.5)";
    context.fillRect(this.xy[0], this.xy[1], 4, 4);
    context.fillRect(this.serverXy[0], this.serverXy[1], this.size, this.size);
  },

  drawLine : function() {
    if (this.line) this.line.draw();
  }
};

var animate = function() {

  // update
  clients.forEach(function(el, i, a){el.update(i, a);});

  // clear
  context.clearRect(0, 0, canvas.width, canvas.height);

  // draw
  clients.forEach(function(el){el.draw();});
  clients.forEach(function(el){el.drawLine();});

  // request new frame
  requestAnimFrame(function(){
    animate();
  });

};

$(document).ready(function() {

  d3.select("div[role='main']")
    .append("div")
      .attr("id", "canvas-container")
    .append("canvas")
      .attr("id", "canvas")
      .attr("width", 750)
      .attr("height", 525);

  canvas = $('#canvas')[0];
  context = canvas.getContext('2d');

  if ($('html').is('.websockets')) {
    try {
      conn = new WebSocket("ws://ec2-50-16-7-248.compute-1.amazonaws.com:8000");
    } catch (err) {
      offline();
    }
    conn.onopen = function(event) {
      log("open");
    };
    conn.onerror = function(event) {
      offline();
    };
    conn.onclose = function(event) {
      offline();
    };
    conn.onmessage = function(event) {
      var message = event.data;
      var r = /^([\-\d\.]+), ([\-\d\.]+)\|([\-\d\.]+), ([\-\d\.]+)/g;
      var m = r.exec(message);
      if (m[1] && m[2] && m[3] && m[4]) {
        spawn(m[2], m[1], m[4], m[3]);
      } else {
        log("malformed data");
      }
    };

    animate();
  }
});
