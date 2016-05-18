var fs = require("fs");
var dateformat = require("dateformat");

module.exports = (function(templateBase, opts){
	var cf = {};
	
	var opts = opts || {};
	opts.dateFormat = opts.dateFormat || "mmmm dd, yyyy hh:MM TT";
	
	cf.format = function(template, data, callback){
		var file = templateBase + template + ".html";
		
		fs.readFile(file, "utf8", function(err, filedata){
			if(err){
				callback(err);
			}
			filedata = parseContents(filedata, data);
			callback(undefined, filedata);
		});
	}
	
	function parseContents(content, data){
		var index = 0;
		while((index = content.indexOf("{{", index)) > -1){
			var endIndex = content.indexOf("}}", index);
			var tag = content.substring(index+2, endIndex);
			
			if(tag.indexOf(":") > -1){
				tag_parts = tag.split(":");
				if(tag_parts[0] == "foreach"){
					content = parseForEach(content, index, data);
				}
				else if(tag_parts[0] == "date"){
					content = parseDate(content, index, data);
				}
				else if(tag_parts[0] == "include"){
					content = parseInclude(content, index, data);
				}
				else if(tag_parts[0] == "filetree"){
					content = parseFileTree(content, index, data);
				}
			}
			else{
				var replace = "";
				if(data.hasOwnProperty(tag)){
					replace = data[tag];
				}
				content = content.substring(0, index) + replace + content.substring(endIndex+2);
			}
			
			index=endIndex+2;
		}
		
		return content;
	}
	
	function parseForEach(content, index, data){
		var arr = data[content.substring(index+2,content.indexOf("}}", index)).split(":")[1]];
		
		var nextForEach = content.indexOf("{{foreach", index);
		var nextEnd = content.indexOf("{{/foreach", index);
		
		while(nextEnd > nextForEach && nextForEach > -1){
			nextForEach = content.indexOf("{{foreach", nextEnd);
			nextEnd = content.indexOf("{{/foreach", nextEnd);
		}
		
		var snippet = content.substring(content.indexOf("}}", index) + 2, nextEnd);
		var replace = "";
		
		for(var i=0;i<arr.length;i++){
			replace += parseContents(snippet, arr[i]);
		}
		
		content = content.substring(0, index) + replace + content.substring(content.indexOf("}}", nextEnd) + 2);
		
		return content;
	}
	
	function parseDate(content, index, data){
		var date = data[content.substring(index+2,content.indexOf("}}", index)).split(":")[1]];
		
		var time = new Date(date);
		
		content = content.substring(0, index) + dateformat(time, opts.dateFormat) + content.substring(content.indexOf("}}", index) + 2);
		return content;
	}
	
	function parseInclude(content, index, data){
		var file = content.substring(index+2, content.indexOf("}}", index)).split(":")[1];
		var replace = "";
		try{
			replace = fs.readFileSync(templateBase + file + ".html", "utf8");
		}
		catch(err){console.log(err);}
		content = content.substring(0, index) + replace + content.substring(content.indexOf("}}", index)+2);
		return content;
	}
	
	function parseFileTree(content, index, data){
		var parts = content.substring(index+2, content.indexOf("}}", index)).split(":");
		var tree = JSON.parse(data[parts[1]]);
		var sizeField = parts[2] || "size";
		
		var replace = "<div class='header col-xs-8'>Filename</div><div class='header col-xs-4'>Size</div>";
		replace += buildFileTreeHTML(tree, sizeField, 0);
		
		content = content.substring(0, index) + replace + content.substring(content.indexOf("}}", index) + 2);
		return content;
	}
	
	function buildFileTreeHTML(tree, sizeField, indent){
		var sizes = ["B", "KB", "MB", "GB"];
		var content = "";
		for(var p in tree){
			content += "<div class='file-row" + ((indent > 0) ? " hide" : "") + "'>";
			var name = "";
			for(var i=0;i<indent;i++){
				name += "&emsp;";
			}
			name += p;
			if(tree[p].hasOwnProperty(sizeField)){
				var size = tree[p][sizeField];
				var sizeType = 0;
				while(size > 1024){
					size = size/1024;
					sizeType++;
				}
				
				size = size.toFixed(2) + " " + sizes[sizeType];
				
				content += "<div class='col-xs-8'>" + name + "</div><div class='col-xs-4'>" + size + "</div>";
			}
			else {
				content += "<div class='col-xs-8 directory'><a class='dir-link' href='javascript:void(0);'>" + name + "</a></div><div class='col-xs-4'></div>";
				content += buildFileTreeHTML(tree[p], sizeField, indent+1);
			}
			content += "</div>";
		}
		
		return content;
	}
	
	//Return
	return cf;
});