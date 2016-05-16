var PageLinks = (function(){
	var pl = {};
	
	var header = $("#header");
	var landing = true;
	
	var links = {};
	
	function activateLink(el){
		//Since this can be opened up to the console, prevent bubbling of events...
		$(el).off("click touch touchstart");
		
		$(el).on("click touch touchstart", function(evt){
			var section = $("#" + $(el).attr("link-for"));
			if(landing){
				var lSection = $("#landing");
				lSection.animate({
					opacity:0,
					height:0
				}, 500, "easeInCubic", function(){
					lSection.remove();
				});
				
				header.animate({
					"height": "1em",
					"font-size": "3em",
					"margin-top": "0.5em"
				}, 500, "easeInCubic");
				
				header.find("p.letterhead").animate({"color":"black"},500,"easeInCubic", function(){header.find("p.letterhead").css("text-shadow", "0 0 0.25em #727272")});
				
				section.css("opacity", "0").removeClass("hide").addClass("show").animate({
					"opacity": "1"
				}, 500, "easeInCubic");
				landing = false;
			}
			else {
				var current = $("section.show");
				current.animate({
					opacity:0
				}, 500, "easeInCubic");
				section.animate({
					opacity:1
				}, 500, "easeInCubic");
			}
		});
	}
	
	function deactivateLink(el){
		$(el).off("click touch touchstart");
	}
	
	pl.scan = function(){
		$(document).find("a[link-for]").each(function(index, el){
			links[$(el).attr("link-for")] = el;
			activateLink(el);
		});
	}
	
	pl.deactivateLink = function(name){
		if(links.hasOwnProperty(name)){
			deactivateLink(links[name]);
		}
	}
	
	pl.activateLink = function(name){
		if(links.hasOwnProperty(name)){
			activateLink(links[name]);
		}
	}
	
	return pl;
});