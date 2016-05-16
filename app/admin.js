var GitHubApi = require("github");
var github = new GitHubApi({
	version:	'3.0.0',
	debug:		false,
	protocol:	'https',
	host:		'api.github.com',
	timeout:	5000,
	headers:	{
		'user-agent':	'james-miner.com'
	}
});

github.authenticate({
	type:		'basic',
	username:	'immrama87',
	password:	'N3tw0rk123'
});

var curly = require("curly-form")(__dirname + "\\html\\");

module.exports = (function(app){
	app.get("/admin", function(req, res){
		github.repos.getFromUser({
			user:	'immrama87',
			type:	'owner'
		}, function(err, data){
			if(err)
				throw err;
			
			var template_data = {};
			template_data.projects = [];
			for(var i=0;i<data.length;i++){
				template_data.projects.push({
					id:			data[i].id,
					name:		data[i].name,
					created:	data[i].created_at,
					modified:	data[i].pushed_at
				});
			}
			
			curly.format("project_admin", template_data, function(err, filedata){
				if(err)
					throw err;
					
				res.status(200).send(filedata);
			});
		});
	});
	
	app.post("/admin/projects", function(req, res){
		
	});
})