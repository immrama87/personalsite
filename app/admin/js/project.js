$(function(){
	$("a.dir-link").on("click touch touchstart", function(evt){
		var file_div = $(this).parent().parent();
		if($(this).attr("is-open") !== 'true'){
			console.log($(file_div).children("div.file-row"));
			$(file_div).children("div.file-row").removeClass("hide");
			$(this).attr("is-open", true);
		}
		else {
			$(file_div).children("div.file-row").addClass("hide");
			$(this).attr("is-open", false);
		}
	});
});