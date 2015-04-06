/* 
 * Display a force-directed graph with d3.js
 *
 * Scroll/Drag from http://bl.ocks.org/mbostock/6123708
 */
function force_graph() {
	var margin = {top: -5, right: -5, bottom: -5, left: -5},
		height = $(window).height(),
		width = $(window).width();

	var force = d3.layout.force()
		.size([width, height])
		.nodes(nodes)
		.links(links)
		.gravity(function(d){
			switch (d.type) {
				case 'start':
				case 'end':
					return -0.01;
					break;
				default:
					return 0.9;
					break;
			}
		})
		.distance(1)
		.charge(-3900)
		.chargeDistance(4200)
		.friction(0.9)
		.linkStrength(11);

	var zoom = d3.behavior.zoom()
		.translate([width/2,height/2])
		.scaleExtent([0.005, 2])
		.on("zoom", zoomed);

	var drag = d3.behavior.drag()
		.origin(function(d) { return d; })
		.on("dragstart", dragstarted)
		.on("drag", dragged)
		.on("dragend", dragended);

	var svg = d3.select(".d3-wrapper").append("svg")
		.attr("width", width)
		.attr("height", height)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.right + ")")
		.call(zoom.scale(0.031415926));

	//svg.call(zoom.scale(0.1));
	
	var rect = svg.append("rect")
		.attr("width", width)
		.attr("height", height)
		.style("fill", "none")
		.style("pointer-events", "all");

	var container = svg.append("g");

	force.start();

	var link = container.append("g")
		.attr("class", "links")
		.selectAll(".link")
		.data(links)
		.enter().append("line")
		.attr("class", "link")
		.style("marker-end", "url(#suit)");

	var node = container.append("g")
		.attr("class", "nodes")
		.selectAll(".node")
		.data(nodes)
		.enter().append("g")
		.attr("class", "node");
		//.call(drag);

	var node_rect = node.append('rect').each(function(d) {
		d.classes = 'node-rect ' + d.type;	
		d3.select(this).attr('class', 'node-rect')
			.attr('class', d.classes)
			.attr("width", 220)
			.attr("x", -110);
	});
	
	var textblocks = node.append("text")
		.attr("dx", 3)
		.attr("y", -57)
		.each(function(d) { 
			var el = d3.select(this),
				nr = d3.select(this.parentNode).selectAll('rect');
			makeTspans(d.text, el);


			var BBox = el.node().getBBox();
			d.textHeight = BBox.height;
			d.textWidth = BBox.width;
			el.attr("y", d.textHeight*(-0.5) - 7);
			nr.attr("y", d.textHeight*(-0.5) - 11);
			nr.attr("height", d.textHeight + 21);
		});

/*
	node.append("image")
		.attr("xlink:href", "https://github.com/favicon.ico")
		.attr("x", -8)
		.attr("y", -8)
		.attr("width", 16)
		.attr("height", 16);
*/

	force.on("tick", function() {
		link.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });

		node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
		node.each(collide(0.5, 150));
	});
	force.on("start", function() {
		$('.force-start').removeClass('active');
		$('.force-stop').addClass('active');
		svg.attr('class', '')
	});
	force.on("end", function() {
		//$('.force-start').addClass('active');
		$('.force-stop').removeClass('active');
		svg.attr('class', 'stopped');
	});

	d3.selectAll('.force-start').on('click', force.start);
	d3.selectAll('.force-stop').on('click', force.stop);
	
	svg.call(zoom.event);

	var linkedByIndex = {};
	links.forEach(function(d) {
		linkedByIndex[d.source.index + "," + d.target.index] = 1;
	});

	node.on("mouseover", function(d){           
		node.classed("node-active", function(o) {
			thisOpacity = isConnected(d, o) ? true : false;
			this.setAttribute('fill-opacity', thisOpacity);
			return thisOpacity;
		});

		link.classed("link-active", function(o) {
			return o.source === d || o.target === d ? true : false;
		});

		d3.select(this).classed("node-active", true);
	})
	.on("mouseout", function(d){
			node.classed("node-active", false);
			link.classed("link-active", false);
	});

	function isConnected(a, b) {
		return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index];
	}

	function zoomed() {
	  container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	}

	function dragstarted(d) {
	  d3.event.sourceEvent.stopPropagation();
	  d3.select(this).classed("dragging", true);
	  force.start();
	}

	function dragged(d) {
	  d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
	}

	function dragended(d) {
	  d3.select(this).classed("dragging", false);
	}

	function collide(alpha, radius) {
	  var quadtree = d3.geom.quadtree(nodes);
	  return function(d) {
		var rb = 2*radius,
			nx1 = d.x - rb,
			nx2 = d.x + rb,
			ny1 = d.y - rb,
			ny2 = d.y + rb;
		quadtree.visit(function(quad, x1, y1, x2, y2) {
		  if (quad.point && (quad.point !== d)) {
			var x = d.x - quad.point.x,
				y = d.y - quad.point.y,
				l = Math.sqrt(x * x + y * y);
			  if (l < rb) {
			  l = (l - rb) / l * alpha;
			  d.x -= x *= l;
			  d.y -= y *= l;
			  quad.point.x += x;
			  quad.point.y += y;
			}
		  }
		  return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
		});
	  };
	}

	svg.append("defs").selectAll("marker")
		.data(["suit", "licensing", "resolved"])
	  .enter().append("marker")
		.attr("id", function(d) { return d; })
		.attr("viewBox", "0 -5 10 10")
		.attr("refX", 20)
		.attr("refY", 0)
		.attr("markerWidth", 60)
		.attr("markerHeight", 60)
		.attr("orient", "auto")
	  .append("path")
		.attr("d", "M0,-5L10,0L0,5 L10,0 L0, -5");
}

// Helper function to break a string into lines for svg
function makeTspans(string, el) {
	var char_limit = 42,
		words = string.split(" ");

	el.text('');

	while (words.length > 0) {
		var line = '',
			reached = false;
		while (!reached && words.length > 0) {
			if (line === '' || (line.length + words[0].length + 1) < char_limit) {
				line += ' ' + words.shift();
			}
			else {
				reached = true;
			}
		}
		var tspan = el.append('tspan')
			.text(line)
			.attr("x", -103)
			.attr("dy", "1.35em");
	}
}