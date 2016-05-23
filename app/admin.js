var GitHubApi = require("github");
var config = require("./config");
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
	type:		'token',
	token:		config.github.oauth
});

var curly = require("curly-form")(__dirname + "\\html\\");

var db = require("./db")(null);
db.config({
	server:	'localhost',
	port:	27017,
	db:		'james-miner'
});

var fs = require("fs");
var http = require("http");
var https = require("https");

module.exports = (function(app){
	app.get("/admin/projects", function(req, res){
		github.repos.getFromUser({
			user:	'immrama87',
			type:	'owner'
		}, function(err, data){
			if(err)
				throw err;
			
			var template_data = {};
			template_data.projects = [];
			db.get({
				coll:		'projects',
				fields:		['project_id'],
				query:		{},
				callback:	function(response){
					
					for(var i=0;i<data.length;i++){
						var istracked = false;
						for(var j=0;j<response.records.length;j++){
							if(response.records[j].project_id == data[i].name){
								istracked = true;
								break;
							}
						}
						
						istracked = (istracked ? "checked=true" : "");
						
						template_data.projects.push({
							id:			data[i].name,
							name:		(istracked ? "<a href='/admin/projects/" + data[i].name + "'>" + data[i].name + "</a>" : data[i].name),
							created:	data[i].created_at,
							modified:	data[i].pushed_at,
							istracked:	istracked
						});
					}
						
					curly.format("project_admin", template_data, function(err, filedata){
						if(err)
							throw err;
							
						res.status(200).send(filedata);
					});
				}
			});
		});
	});
	
	app.post("/admin/projects", function(req, res){
		db.post({
			coll:	'projects',
			data:	{
				project_id:	req.body.project_id
			},
			callback:	function(response){
				initializeProject(req.body.project_id);
				res.status(200).send(JSON.stringify(response));
			}
		});
	});
	
	app.delete("/admin/projects", function(req, res){
		db.delete({
			coll:	'projects',
			query:	{
				project_id:	req.body.project_id
			},
			callback:	function(response){
				deleteProjectDirectory(req.body.project_id);
				res.status(200).send(JSON.stringify(response));
			}
		});
	});
	
	app.param("projectid", function(req, res, next, p){
		req.project_id = p;
		next();
	});
	
	app.get("/admin/projects/:projectid", function(req, res){
		db.get({
			coll:	'projects',
			query:	{
				project_id:	req.project_id
			},
			fields:	["all"],
			callback:	function(response){
				var data = response.records[0];
				curly.format("project", data, function(err, filedata){
					if(err)
						throw err;
						
					res.status(200).send(filedata);
				});
			}
		});
	});
	
	function initializeProject(id){
		github.repos.createHook({
			user:	'immrama87',
			repo:	id,
			name:	'web',
			config:	{
				url:	'http://mockbin.org/bin/f4064a47-ce89-40b0-a54f-015f3e744d50',
				content_type:	'json'
			},
			events: ['push']
		});
		github.repos.getBranch({
			user:	'immrama87',
			repo:	id,
			branch:	'master'
		}, function(err, branch){
			github.gitdata.getTree({
				user:	'immrama87',
				repo:	id,
				sha:	branch.commit.commit.tree.sha
			}, function(err, tree){
				createProjectTree(id, tree);
			});
		});
	}
	
	function deleteProjectDirectory(project_id){
		if(fs.existsSync(__dirname + "\\projects\\" + project_id)){
			recursiveFolderDelete(__dirname + "\\projects\\" + project_id);
		}
	}
	
	function recursiveFolderDelete(folder_path){
		fs.readdirSync(folder_path).forEach(function(file, index){
			var path = folder_path + "\\" + file;
			if(fs.lstatSync(path).isDirectory()){
				recursiveFolderDelete(path);
			}
			else {
				fs.unlinkSync(path);
			}
			
		});
		fs.rmdirSync(folder_path);
	}
	
	function createProjectTree(project_id, tree){
		var pt = new ProjectTree(project_id, tree);
		pt.oncomplete(function(data){
				pt.scan();
			})
			.onerror(function(err){
				throw err;
			});
	}
	
	var ProjectTree = (function(project_id, tree){
		var pt = {};
		
		var sendComplete, sendError;
		var running = 0;
		var tree_obj = parseTree(tree);
		var project_tree = {};
		var diff = {};
		var completed = false;
		
		function parseTree(intree, path){
			path = path || "";
			var response = {};
			for(var i=0;i<intree.tree.length;i++){
				if(intree.tree[i].type.toLowerCase() == "blob"){
					var blobpath = path + intree.tree[i].path;
					response[intree.tree[i].path] = {
						size:	intree.tree[i].size,
						sha:	intree.tree[i].sha
					};
				}
				else if(intree.tree[i].type.toLowerCase() == "tree"){
					var dirpath = intree.tree[i].path + "/";
					buildSubTree(dirpath, path, intree.tree[i].sha, function(err, data){
						if(err && sendError)
							sendError(err);
						
						response[data.dirpath] = parseTree(data.tree, data.treename);
					});
				}
			}
			
			return response;
		}
		
		function buildSubTree(dirpath, path, sha, callback){
			running++;
			
			var treename = path + dirpath;
			github.gitdata.getTree({
				user:	'immrama87',
				repo:	project_id,
				sha:	sha
			}, function(err, nexttree){
				var response = {
					tree:		nexttree,
					dirpath:	dirpath,
					treename:	treename
				};
				callback(err, response);
				completeRequest();
			});
		}
		
		function completeRequest(){
			running--;
			if(running <= 0){
				sendComplete(tree_obj);
			}
		}
		
		function buildProjectDirectory(){
			db.update({
				coll:	'projects',
				query:	{
					project_id:	project_id
				},
				data:	{
					status:	'building'
				},
				callback:	function(response){
					startBuild();
				}
			});
		}
		
		function startBuild(){
			running = 0;
			buildPath(__dirname + "\\projects\\" + project_id + "/", diff);
		}
		
		function buildPath(path, tr){
			console.log(path);
			try{
				var stat = fs.lstatSync(path);
				if(!stat.isDirectory()){
					if(sendError){
						sendError("Could not create directory " + path);
					}
					throw "Could not create directory " + path;
				}
			}
			catch(err){
				if(err.code == "ENOENT"){
					fs.mkdirSync(path);
				}
				else {
					if(sendError){
						sendError(err);
					}
					throw err;
				}
			}
			
			for(var file in tr){
				if(tr[file].hasOwnProperty("sha")){
					writeFile(path+file);
				}
				else {
					buildPath(path+file, tr[file]);
				}
			}
		}
		
		function writeFile(filename){
			running++;
			var dlpath = filename.substring(filename.indexOf(project_id + "/") + (project_id + "/").length);
			
			var requester = https;
			dl = "https://raw.githubusercontent.com/immrama87/" + project_id + "/master/" + dlpath;
			console.log(dl);
			
			var file = fs.createWriteStream(filename);
			var request = requester.get(dl, function(response){
				response.pipe(file);
				file.on("finish", function(){
					file.close(function(){
						completeFileBuild();
					});
				});
			});
		}
		
		function completeFileBuild(){
			running--;
			if(running <= 0){
				db.update({
					coll:	'projects',
					query:	{
						project_id:	project_id
					},
					data:	{
						status:	'built',
						project_tree:	JSON.stringify(tree_obj)
					},
					callback:	function(response){}
				});
			}
		}
		
		function compareTrees(path){
			var n = tree_obj;
			var o = project_tree;
			var d = diff;
			
			if(path){
				n = n[path];
				o = o[path];
				diff[path] = {};
				d = diff[path];
			}
			
			for(var p in n){
				if(n[p].content){
					var match = false;
					if(o.hasOwnProperty(p)){
						if(o[p].content == n[p].content){
							match = true;
						}
					}
					
					if(!match){
						d[p] = n[p];
					}
				}
			}
		}
		
		pt.oncomplete = function(fnc){
			if(typeof fnc === "function"){
				sendComplete = fnc;
			}
			
			return pt;
		}
		
		pt.onerror = function(fnc){
			if(typeof fnc === "function"){
				sendError = fnc;
			}
			
			return pt;
		}
		
		pt.build = function(){
			parseTree(tree);
			completed = true;
		}
		
		pt.scan = function(){
			db.get({
				coll:	'projects',
				query:	{
					project_id:	project_id
				},
				fields:	['project_tree'],
				callback:	function(response){
					if(response.records[0].hasOproject_tree){
						project_tree = JSON.parse(response.records[0].project_tree);
						compareTrees();
					}
					else {
						diff = tree_obj;
						buildProjectDirectory();
					}
				}
			});
		}
		
		return pt;
	});
})