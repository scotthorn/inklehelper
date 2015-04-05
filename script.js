var original_json, original_parse, working_parse, data, pageNumHolder,
	loaded = false,
	data_only = false,
	images = [],
	image_url_map = {},
	pages = [], 
	flags = {}, 
	flags_raw = [],
	nodes = [],
	links = [],
	body = $('body'),
	content = $('#content')
	json_form = $('#json-form').html(),
	d3_wrapper = $('#d3-wrapper').html(),
	status_menu = Handlebars.compile($('#status-menu').html()),
	page_list = Handlebars.compile($('#page-list').html()),
	flag_list = Handlebars.compile($('#flag-list').html()),
	image_list = Handlebars.compile($('#image-list').html()),
	save_display = Handlebars.compile($('#save-display').html());

// Import JSON from textarea
function importJson() {
	textarea = $('#json');
	var text = textarea.val()
	if (text === '') {
		alert('Welp. That textarea is still empty.');
		return;
	}
	// If it's a url
	if (text.substring(0,4) == 'http') {
		jsonFromURL(text);
	}
	else {
		processJson(text);
	}
}
function jsonFromURL(url) {
	$.getJSON(url, function(json){
		processJson(json);
	})
}
function processJson(json) {
	if (!IsJsonString(json)) {
		alert('Dat JSON is wack, yo.');
		return;
	}
	original_json = json;
	original_parse = $.parseJSON(original_json);
	working_parse = $.parseJSON(original_json);

	if (typeof working_parse != 'object') {
		alert('I was expecting an object.');
		return;
	}

	if ('data' in working_parse) {
		if (!('stitches' in working_parse.data)) {
			alert('I do not see your stitches.');
			return;
		}
		data = working_parse.data

	}
	else if ('stitches' in working_parse) {
		data_only = true;
		data = working_parse;
	}
	else {
		alert('I do not see your stitches.');
		return;
	}

	// To build the link array for d3, we'll need a temporary map 
	// and set of links using stitch names
	var stitch_names = {};
	var stitch_links = [];

	// For each stitch in the story
	$.each(data.stitches, function(name, stitch){
		var node = {
			id: name, 
			text: stitch.content[0], 
			// Defaults
			type: 'end'
		};

		// For each of the objects in the stitch content array
		$.each(stitch.content, function(j, item){
			// The first item is always the displayed text.
			if (j===0) return;

			// These six indicators will either be the only property or indicate a link
			$.each(['image','divert','flagName','pageNum','pageLabel','linkPath'], function(k, key){
				if (key in item) switch (key) {
					case 'image':
						if (item.image in image_url_map) {
							image_url_map[item.image].uses++;
						}
						else {
							images.push({image:item.image, uses:1});
							image_url_map[item.image] = images[images.length - 1];
						}
						node.image = item.image
						return;
						break;
					case 'divert':
						stitch_links.push({source: name, target: item.divert, value:2});
						node.type = 'paragraph';
						return;
						break;
					case 'linkPath':
						node.type = 'paragraph';
						var link_node = {
							id: name + '_choice_' + j, 
							text: item.option,
							ifConditions: item.ifConditions,
							notIfConditions: item.notIfConditions,
							type: 'fork'
						};
						stitch_links.push({source: name, target: link_node.id, value:1});
						if (item.linkPath != null) {
							stitch_links.push({source: link_node.id, target: item.linkPath, value:1});
						}
						else {
							link_node.type = 'loose';
						}
						stitch_names[link_node.id] = nodes.length;
						nodes.push(link_node);
						return;
						break;
					case 'flagName':
						flags_raw.push(item.flagName);
						importFlag(item.flagName);
						return;
						break;
					case 'pageNum':
						if (item.pageNum != -1) {
							pageNumHolder = item.pageNum;
							node.pageNum = item.pageNum;
						}
						return;
						break;
					case 'pageLabel':
						if (item.pageLabel != '') {
							pages[pageNumHolder] = {
								stitch: name,
								pageLabel: item.pageLabel
							};
							node.pageLabel = item.pageLabel
						}
						return;
						break;
				}
			});
		});
		// End foreach stitch property
		if (name == data.initial) {
			node.type = 'start';
		}

		stitch_names[name] = nodes.length;
		nodes.push(node);
	});
	// End foreach stitches

	// Create the d3 links now that all the nodes have been collected
	$.each(stitch_links, function(i, stitch_link){
		links.push({
			source: stitch_names[stitch_link.source],
			target: stitch_names[stitch_link.target],
			value: stitch_link.value,
			weight: 1
		});
	});

	loaded = true;
	pages.shift();
	routie('/stats');
}

// Display overall stats from imported data.
function stats() {
	var context = {
		imageCount: images.length, 
		pageCount: pages.length, 
		flagCount: sizeOf(flags)
	}
	console.log(flags);
	content.html(status_menu(context));
	$('.load, .save').addClass('active');
	$('.return').removeClass('active');
}


/*
 * Init
 */
$(document).ready(function(){

	routie({
		'*': function(route) {
			if (!loaded && route !== '/') { routie('/'); return; }

			switch (route) {
				case '/pages': 
					showPageList();
					break;

				case '/images': 
					content.html(image_list({images:images}));
					$('.return').addClass('active');
					break;

				case '/save':
					content.html(save_display({data: JSON.stringify(data), full: !data_only}));
					break;

				case '/stats':
					stats();
					break;

				case '/force-graph':
					content.html(d3_wrapper);
					force_graph();
					$('.return, .force-stop').addClass('active');
					break;

				case '/flags':
					flagsPage();
					$('.return').addClass('active');
					break;

				default:
					content.html(json_form);
					$('.load, .save, .return, .force-start, .force-stop').removeClass('active');
					images = [];
					image_url_map = {};
					pages = []; 
					flags = [];
					flags_raw = [];
					nodes = [],
					links = [],
					loaded = false;
					data_only = false;
					break;
			}
			// End route switch				
		}
	});
	// End routie()
	
	
	// Event Handlers
	body.on('click', '#json-parse', importJson);
	body.on('focus', 'textarea, input[type="text"]', function(){
		$(this).select();
		
		// Work around Chrome's little problem
		$(this).mouseup(function() {
			// Prevent further mouseup intervention
			$(this).unbind("mouseup");
			return false;
		});
	});
	body.on('click', '.sort-pages-az', function(){
		sortPages(true);
	});
	body.on('click', '.sort-pages-za', function(){
		sortPages(false);
	});
	body.on('click', '.trim-pages', function(){
		trimPages();
	});
	body.on('change', '.save-display select', function(){
		switch ($(this).val()) {
			case 'data':
				$('.save-display textarea').val(JSON.stringify(data));
				break;
			case 'all':
				working_parse.data = data;
				$('.save-display textarea').val(JSON.stringify(working_parse));
				break;
		}
	});
	body.on('blur', '.page-list input', function(){
		savePageLabel(this);
		rebuildPages();
	});
	body.on('click', '.example-json-list div', function(){
		jsonFromURL($(this).attr('data-url'));
	});
	
});

/* Helper Functions */
function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
function sizeOf(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};