$(function(){
	$("table#projects tr").each(function(index, el){
		$(el).find("input[type='checkbox']").on("click touch touchstart", function(evt){
			$.ajax({
				method:		'post',
				url:		'/admin/projects',
				dataType:	'json',
				data:		{project_id:	el.id},
				success:	function(data, status, xhr){
					console.log(data);
				},
				error:		function(xhr, status, err){
					alert(err);
				}
			});
		});
	});
});