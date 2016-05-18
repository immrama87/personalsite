$(function(){
	$("table#projects tr").each(function(index, el){
		$(el).find("input[type='checkbox']").on("click touch touchstart", function(evt){
			var method = "post";
			if(!$(this).is(":checked")){
				method = "delete";
			}
			$.ajax({
				method:		method,
				url:		'/admin/projects',
				dataType:	'json',
				data:		{project_id:	el.id},
				success:	function(data, status, xhr){
					if(method != "delete"){
						$($(el).find("td")[0]).html("<a href='/admin/projects/" + el.id + "'>" + el.id + "</a>");
					}
					else {
						$($(el).find("td")[0]).html(el.id);
					}
				},
				error:		function(xhr, status, err){
					alert(err);
				}
			});
		});
	});
});