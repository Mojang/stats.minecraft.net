var conn;
var svg;
var scale = 1.5;

var offline = function() {
  log("service offline");
};

var loadProjection = function() {
  var xy = d3.geo.mercator();
  var path = d3.geo.path().projection(xy);

  svg = d3.select("body")
    .append("svg:svg");

  svg.append("svg:g")
    .attr("transform", "scale(" + scale + ")")
    .attr("id", "regions");

  d3.json("/public/countries.geo.json", function(p_data) {
    log(p_data);
    d3.select("#regions")
      .selectAll("path")
        .data(p_data.features)
      .enter().append("svg:path")
        .attr("d", path);
  });
};

var redraw = function() {
  var circle = svg.selectAll("circle")
    .data(data);

  circle.enter().append("circle")
    .attr("cy", function (d) {
      return d3.geo.mercator()(d)[1] * scale;
    })
    .attr("cx", function (d) {
      return d3.geo.mercator()(d)[0] * scale;
    })
    .attr("r", 1)
    .style("fill", "hotpink");

  circle
    .attr("cy", function (d) {
      return d3.geo.mercator()(d)[1];
    })
    .attr("cx", function (d) {
      return d3.geo.mercator()(d)[0];
    });

};

var spawn = function(x1, y1, x2, y2) {
  if (data.length >= 2 && false) {
    data.shift();
    data.shift();
  }

  data.push([x1, y1]);
  data.push([x2, y2]);

  var circle = svg.selectAll("circle")
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
      });
  /*if (data.length > 18) {
          data.shift();
          data.shift();
        }
        var next = [m[4], m[3]];
        var next2 = [m[2], m[1]];
        data.push(next);
        data.push(next2);
        redraw();*/
};

var data = [];

$(document).ready(function() {

  loadProjection();

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
  }
});
