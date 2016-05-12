var PageLinks = (function(){
	var pl = {};
	
	var header = $("#header");
	var landing = true;
	
	function initLink(el){
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
	
	pl.scan = function(){
		$(document).find("a[link-for]").each(function(index, el){
			initLink(el);
		});
	}
	
	return pl;
});