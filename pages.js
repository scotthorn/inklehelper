// When pages are ordered, mirror changes to data
function updatePageOrder(e, ui) {
	$('.page-list li').each(function(i, page) {
		stitch = $(page).attr('data-stitch');
		$(data.stitches[stitch].content).each(function(j, item){
			if (j==0) return;
			if ('pageNum' in item) {
				data.stitches[stitch].content[j].pageNum = i + 1;
			}
		});
	});
}

// (Re)Build pages array
function rebuildPages() {
	$('.page-list li').each(function(i, page) {
		// Update pages array
		pages[i] = {
			stitch: $(this).attr('data-stitch'),
			pageLabel: $(page).find('.page-label').val()
		}
	});
}

// Alpha sort pages, true for A-Z, false for Z-A
function sortPages(alpha) {
	pages.sort(function(a, b){
		labelA = a.pageLabel.toLowerCase().trim(),
		labelB = b.pageLabel.toLowerCase().trim();
		if (labelA > labelB) return alpha ? 1 : -1;
		if (labelA < labelB) return alpha ? -1 : 1;
		return 0;
	});
	showPageList();
	updatePageOrder();
}

// Trim whitespace from page labels
function trimPages() {
	$('.page-list li input').each(function(i, item){
		var input = $(item),
			value = input.val();
		if (value.trim() != value) {
			input.val(value.trim());
			savePageLabel(item);
		}
	});
	rebuildPages();
}

// Show page list
function showPageList() {
	content.html(page_list({pages: pages}));
	$('.page-list').sortable({
		handle: '.handle',
		update: function(){
			updatePageOrder();
			rebuildPages();
		}
	});
	$('.return').addClass('active');
}

// Save an altered page label 
function savePageLabel(source) {
	var input = $(source),
		stitch = input.attr('data-stitch');

	$.each(data.stitches[stitch].content, function(i, prop){
		if (i==0) return;
		if ('pageLabel' in prop) prop.pageLabel = input.val();
	});
}