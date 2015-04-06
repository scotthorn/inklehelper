function importFlag(raw_flag) {
    var operation = false,
        flag_name, op_value;

    $.each(['+', '-', '='], function(i, op) {
        if (raw_flag.split(op).length > 1) {
            if (operation !== false) {
                console.log('improper flag: ' + raw_flag);
                return;
            }
            operation = op;
        }
    });

    if (operation == false) {
        flag_name = raw_flag.trim();
    }
    else {
        var flag_parts = raw_flag.split(operation);
        flag_name = flag_parts[0].trim();
        op_value = flag_parts[1].trim();
    }

    if (flag_name in flags) {
        flags[flag_name].uses.push({
           operation: operation,
           value: op_value 
        });
    }
    else {
        flags[flag_name] = {
            name: flag_name,
            uses: [{
                operation: operation,
                value: op_value
            }]  
        };
    }
}

function flagsPage() {
	console.log(flags);
	collateFlagUses();
	var context = {
		flags: flags
	}
	content.html(flag_list(context));
	$('.load, .save').addClass('active');
	$('.return').removeClass('active');
}

function collateFlagUses() {
	$.each(flags, function(name, flag){
		var tempGroups = {};
		flags[name].useTotal = flag.uses.length;
		flags[name].useGroups = [];

		$.each(flag.uses, function(i, use) {
			var opKey = use.operation + use.value;
			if (opKey in tempGroups) {
				tempGroups[opKey]++;
			}
			else {
				tempGroups[opKey] = 1;
			}
		});

		$.each(tempGroups, function(opKey, opUses){
			flags[name].useGroups.push({opKey: opKey, uses: opUses});
		});
	});
}