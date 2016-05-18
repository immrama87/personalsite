var mongo = require("mongodb");
var MongoClient = mongo.MongoClient;

/**
 *	@module
 *	wall.MongoDbDriver
 *	The default Wall.io driver for MongoDB databases, including methods for setup, verification and all CRUD functions
 *	
 */
module.exports = (function(logger){
	var d = {};
	var url;
	
	/**
	 *	config
	 *	Configures the connection URL for the db client
	 *
	 *	@param obj:		An object containing the following fields:
	 *						* server:	The server name for the connection
	 *						* port:		The TCP port that Mongo is listening
	 *						* db:		The database to connect to
	 *
	 *	@return {void}
	 */
	d.config = function(obj){
		url = "mongodb://" + obj.server + ":" + obj.port + "/" + obj.db;
	}
	
	/**
	 *	details
	 *	Describes the database driver and lists the properties required for setup.
	 */
	d.details = {
		description:	"The default Wall.io driver for MongoDB databases, including methods for setup, verification and all CRUD functions",
		properties:	[
			{
				name:	"Server",
				key:	"server"
			},
			{
				name:	"Port",
				key:	"port",
				validate:	"integer"
			},
			{
				name:	"Database",
				key:	"db"
			},
			{
				name:	"Username",
				key:	"user",
				optional:	true
			},
			{
				name:	"Password",
				key:	"pass",
				optional:	true,
				type:	"password"
			}
		]
	};
	
	/**
	 *	test
	 *	Tests a provided configuration and returns a boolean status
	 *	@param obj:		An object containing the following fields:
	 *						* server:	The server hostname to connect to 
	 *						* port:		The TCP port on the server that MongoDB is listening on
	 *						* db:		The database to connect to
	 *						* user:		The username to authenticate with (optional)
	 *						* pass:		The password to authenticate with (optional)
	 *	@param res:		The response object to communicate test status over
	 *
	 *	@return {void}
	 */
	d.test = function(obj, res){
		var testURL = "mongodb://" + obj.server + ":" + obj.port + "/" + obj.db;
		MongoClient.connect(testURL, function(err, db){
			if(err){
				var message = "Could not connect to MongoDB at " + testURL + " during test. " + err
				logger.error(message);
				res.end(JSON.stringify({
					status:		"error",
					data:		message,
					highlight:	["server", "port", "db"]
				}));
			}
			else {
				if(obj.user != "" && obj.pass != ""){
					db.authenticate(obj.user, obj.pass, function(err, result){
						if(err){
							var message = "Could not authenticate to MongoDB with user " + obj.user + ". Check that the user exists and the password provided was correct. " + err;
							logger.error(message);
							res.end(JSON.stringify({
								status:		"error",
								data:		message,
								highlight:	["user", "pass"]
							}));
						}
						else {
							res.end(JSON.stringify({
								status:	"success"
							}));
						}
					});
				}
				else {
					res.end(JSON.stringify({
						status:	"success"
					}));
				}
			}
		});
	}
	
	/**
	 *	generateConfigObject
	 *	Creates an object containing the configuration properties that are required for the driver to connect
	 *	@param obj:		An object containing the following fields:
	 *						* server:	The server hostname to connect to 
	 *						* port:		The TCP port on the server that MongoDB is listening on
	 *						* db:		The database to connect to
	 *						* user:		The username to authenticate with (optional)
	 *						* pass:		The password to authenticate with (optional)
	 *
	 *	@return {Object}
	 */
	d.generateConfigObject = function(obj){
		var result = {};
		result.server = obj.server;
		result.port = obj.port;
		result.db = obj.db;
		
		if(obj.user && obj.user != ""){
			result.user = obj.user;
		}
		if(obj.pass && obj.pass != ""){
			result.pass = obj.pass;
		}
		
		return result;
	}
	
	/**
	 *	validate
	 *	Validates that all required collections are available in the startup database.
	 *	@param	obj:		An object containing the following fields:
	 *							* server:	The server hostname to connect to 
	 *							* port:		The TCP port on the server that MongoDB is listening on
	 *							* db:		The database to connect to
	 *							* user:		The username to authenticate with (optional)
	 *							* pass:		The password to authenticate with (optional)
	 *	@param colls:		An array of the required collection names to verify
	 *	@param callback:	A callback function used to handle the operation response
	 *
	 *	@return {void}
	 */
	d.validate = function(obj, colls, callback){
		var testUrl = "mongodb://" + obj.server + ":" + obj.port + "/" + obj.db;
		var response = {};
		MongoClient.connect(testUrl, function(err, db){
			if(err){
				var message = "Error connecting to MongoDB. " + err;
				logger.error(message);
				response.status = "error";
				response.data = message;
				callback(response);
				throw err;
			}
			
			db.collections(function(collErr, collList){
				if(collErr){
					var message = "Error retrieving collection list from MongoDB. " + err;
					logger.error(message);
					response.status = "error";
					response.data = message;
					callback(response);
					throw err;
				}
				
				for(var i=0;i<collList.length;i++){
					if(colls.indexOf(collList[i].collectionName) > -1){
						colls.splice(colls.indexOf(collList[i].collectionName), 1);
					}
				}
				
				if(colls.length > 0){
					response.status = "invalid";
					response.data = "The following required collections do not exist in the database " + obj.db + ":";
					response.missing = colls;
				}
				else {
					response.status = "success";
				}
				
				callback(response);
			});
		});
	}
	
	/**
	 *	initialize
	 *	Initializes the database, creating any collections that are required and missing
	 *
	 *	@param	obj:		An object containing the following fields:
	 *							* server:	The server hostname to connect to 
	 *							* port:		The TCP port on the server that MongoDB is listening on
	 *							* db:		The database to connect to
	 *							* user:		The username to authenticate with (optional)
	 *							* pass:		The password to authenticate with (optional)
	 *	@param colls:		An array of the required collection names to create
	 *	@param callback:	A callback function used to handle the operation response
	 *
	 *	@return {void}
	 */
	d.initialize = function(obj, colls, callback){
		var response = {};
		var testUrl = "mongodb://" + obj.server + ":" + obj.port + "/" + obj.db;
		MongoClient.connect(testUrl, function(err, db){
			if(err){
				var message = "Error connecting to MongoDB. " + err;
				logger.error(message);
				response.status = "error";
				response.data = message;
				callback(response);
				throw err;
			}
			
			var responses = [];
			for(var i=0;i<colls.length;i++){
				responses.push(createCollectionResponse(colls[i], db)
					.onerror(function(response, err){
						logger.error("Error initializing collection " + response.collectionName + ". " + err);
					})
					.oncomplete(function(){
						var complete = true;
						for(var i=0;i<responses.length;i++){
							complete = responses[i].completed;
							
							if(!complete)
								break;
						}
						
						if(complete){
							var errors = [];
							for(var i=0;i<responses.length;i++){
								if(responses[i].status == "error"){
									errors.push(responses[i].collectionName);
								}
							}
							
							if(errors.length > 0){
								response.status = "error";
								response.data = "Errors were encountered initializing the following collections:\n\t * " + errors.join("n\t * ") + "\nPlease consult the application logs.";
							}
							else {
								response.status = "success";
							}
							
							callback(response);
						}
					})
				);
			}
		});
	}
	
	/**
	 *	startup
	 *	Starts up the database and verifies that all required collections are present
	 *
	 *	@param colls:		An array of the required collection names to verify
	 *	@param callback:	A callback that can accept and handle any startup errors that occur
	 *
	 *	@return {void}
	 */
	d.startup = function(colls, callback){
		MongoClient.connect(url, function(err, db){
			if(err){
				callback(err);
			}
			else {
				db.collections(function(collErr, collList){
					if(collErr){
						callback(collErr);
					}
					else {
						for(var i=0;i<collList.length;i++){
							if(colls.indexOf(collList[i].collectionName) > -1){
								colls.splice(colls.indexOf(collList[i].collectionName), 1);
							}
						}
						
						if(colls.length > 0){
							callback("Required collections " + colls.join(", ") + " were not found. Please use <server>:<port>/setup/db to ensure proper configuration of the database.");
						}
						else {
							callback();
						}
					}
				});
			}
		});
	}
	
	/**
	 *	get
	 *	Retrieves data from a specified collection, using a specified query.
	 *	
	 *	@param obj:		An object containing the following fields:
	 *						* coll:		The collection to retrieve data from
	 *						* query:	The find query to execute
	 *						* fields:	An array of field names to return from the object
	 *						* callback: A method to call once a response object has been built.
	 */
	d.get = function(obj){
		var response = {};
		MongoClient.connect(url, function(err, db){
			if(err){
				logger.error("Error connecting to MongoDB.\nError Message: " + err);
				response.status = "error";
				response.data = "An error occurred connecting to MongoDB.\nError Message: " + err;
				obj.callback(response);
			}
			else {
				var coll = db.collection(obj.coll);
				
				var fields = null;
				if(obj.fields.indexOf("all") == -1){
					fields = {};
					for(var i=0;i<obj.fields.length;i++){
						fields[obj.fields[i]] = 1;
					}
				}
				else {
					fields = {"_~_~_~": 0};
				}
				
				if(obj.query.hasOwnProperty("_id")){
					obj.query["_id"] = new mongo.ObjectID(obj.query["_id"]);
				}
				
				coll.find(obj.query, fields).toArray(function(err, items){
					if(err){
						response.status = "error";
						response.data = "An error occurred retrieving data from MongoDB.\nError Message: " + err;
					}
					else {
						response.status = "success";
						response.metadata = {};
						response.metadata.size = items.length;
						response.metadata.fields = obj.fields;
						
						response.records = items;
					}
					
					obj.callback(response);
				});
			}
		});
	}
	
	/**
	 *	post
	 *	Used to create new documents in a given collection
	 *	@param obj:		An object containing the following properties:
	 *						* coll:	The collection to add to
	 *						* required: The required fields to validate (optional)
	 *						* data:	The data for the new document
	 *						* callback:	The callback to use in handling the response
	 *
	 *	@return {void}
	 */
	d.post = function(obj){
		var missing = [];
		var response = {};
		if(obj.hasOwnProperty("required")){
			for(var i=0;i<obj.required.length;i++){
				if(!obj.data.hasOwnProperty(obj.required[i])){
					missing.push(obj.required[i]);
				}
				else if(obj.data[obj.required[i]] == ""){
					missing.push(obj.required[i]);
				}
			}
		}
		
		if(missing.length > 0){
			var missing_str = missing.join(", ");
			
			response.status = "error";
			response.data = "Required fields not set.\nMissing Fields: " + missing_str;
			obj.callback(response);
		}
		else {
			MongoClient.connect(url, function(err, db){
				if(err){
					response.status = "error";
					response.data = "An error occurred connecting to MongoDB.\nError Message: " + err;
					obj.callback(response);
				}
				else {
					if(!obj.data.hasOwnProperty("CreateDate")){
						obj.data.CreateDate = new Date().getTime();
					}
					if(!obj.data.hasOwnProperty("ModifiedDate")){
						obj.data.ModifiedDate = new Date().getTime();
					}
					
					var coll = db.collection(obj.coll);
					coll.insert(obj.data, function(err, result){
						if(err){
							response.status = "error";
							response.data = "An error occurred while inserting data.\nError Message: " + err;
						}
						else {
							response.status = "success";
							response.data = result;
						}
						
						obj.callback(response);
					});
				}
			});
		}
	}
	
	/**
	 *	update
	 *	Used to update an existing document(s) in a given collection
	 *
	 *	@param obj:		An object containing the following properties:
	 *						* coll:	The collection to update
	 *						* query: The query to match in updating the document(s)
	 *						* data:	The updated data for the document(s)
	 *						* callback:	The callback to use in handling the response
	 *
	 *	@return {void}
	 */
	d.update = function(obj){
		var response = {};
		MongoClient.connect(url, function(err, db){
			if(err){
				response.status = "error";
				response.data = "An error occurred connecting to MongoDB.\nError Message: " + err;
				obj.callback(response);
			}
			else {
				var coll = db.collection(obj.coll);
				if(obj.query.hasOwnProperty("_id")){
					obj.query["_id"] = new mongo.ObjectID(obj.query["_id"]);
				}
				
				obj.data.ModifiedDate = new Date().getTime();
				
				coll.update(obj.query, {$set:obj.data}, function(err, result){
					if(err){
						response.status = "error";
						response.data = "An error occurred while inserting data.\nError Message: " + err;
					}
					else {
						response.status = "success";
						response.data = result;
					}
					
					obj.callback(response);
				});
			}
		});
	}
	
	/**
	 *	addToArray
	 *	Used to update an array field in a given collection
	 *
	 *	@param obj:		An object containing the following properties:
	 *						* coll:	The collection to update
	 *						* field:	The array field to update
	 *						* query:	The query to match updated document(s) to
	 *						* data:		The value to add to the array
	 *						* callback:	The function used to handle the operation response
	 *
	 *	@result {void}
	 */
	d.addToArray = function(obj){
		var response = {};
		MongoClient.connect(url, function(err, db){
			if(err){
				response.status = "error";
				response.data = "An error occurred connecting to MongoDB.\nError Message: " + err;
				obj.callback(response);
			}
			else {
				var coll = db.collection(obj.coll);
				var fields = {};
				fields[obj.field] = 1;
				fields["_id"] = 1;
				
				sanitizeQuery(obj.query);
				
				coll.find(obj.query, fields).toArray(function(err, items){
					if(err){
						response.status = "error";
						response.data = "An error occurred retrieving data for update.\nError Message: " + err;
						obj.callback(response);
					}
					else {
						for(var i=0;i<items.length;i++){
							var data = {}
							data[obj.field] = [];
							if(items[i][obj.field] != undefined){
								data[obj.field] = items[i][obj.field];
							}
							
							if(data[obj.field].indexOf(obj.data) == -1){
								data[obj.field].push(obj.data);
							}
							
							var result = coll.update({_id: items[i]._id}, {$set: data});
							if(result.writeConcernError != undefined){
								response.status = "error";
								response.data = "An error occurred during an update operation.\nError Message: " + result.writeConcernError.errmsg;
								break;
							}
						}
						
						if(!response.status){
							response.status = "success";
							response.numUpdated = items.length;
						}
						obj.callback(response);
					}
				});
			}
		});
	}
	
	/**
	 *	delete
	 *	Used to delete a document (or multiple) from a given collection
	 *
	 *	@param obj:		An object containing the following properties:
	 *						* coll:	The collection to delete from
	 *						* query: The query to match deleted documents to
	 *						* callback: A function to handle the operation response
	 *
	 *	@return {void}
	 */
	d.delete = function(obj){
		var response = {};
		MongoClient.connect(url, function(err, db){
			if(err){
				response.status = "error";
				response.data = "An error occurred connecting to MongoDB.\nError Message: " + err;
				obj.callback(response);
			}
			else {
				var coll = db.collection(obj.coll);
				
				sanitizeQuery(obj.query);
				
				var result = coll.remove(obj.query);
				
				if(result.writeConcernError != undefined){
					response.status = "error";
					response.removed = result.nRemoved;
					response.data = "An error occured while deleting data.\nError Message: " + result.writeConcernError.errmsg;
				}
				else {
					response.status = "success";
					response.removed = result.nRemoved;
				}
				
				obj.callback(response);
			}
		});
	}
	
	function sanitizeQuery(query){
		if(query.hasOwnProperty("_id")){
			query["_id"] = mongo.ObjectID.createFromHexString(query["_id"]);
		}
		
		if(query.hasOwnProperty("$or")){
			for(var i=0;i<query["$or"].length;i++){
				sanitizeQuery(query["$or"][i]);
			}
		}
	}
	
	function createCollectionResponse(name, db){
		var ccr = {};
		
		ccr.completed = false;
		ccr.status = "initiated";
		ccr.collectionName = name;
		
		var comps = [];
		var err = undefined;
		
		ccr.oncomplete = function(comp){
			if(typeof comp == "function"){
				comps.push(comp);
			}
			return ccr;
		}
		
		ccr.onerror = function(error){
			if(typeof error == "function"){
				err = error;
			}
			return ccr;
		}
		
		db.createCollection(name, function(createErr, collection){
			if(createErr){
				err(ccr, createErr);
				ccr.status = "error";
				complete();
			}
			else {
				collection.insert({"test":	"value"}, function(insertErr, insertResult){
					if(insertErr){
						err(ccr, insertErr);
						ccr.status = "error";
						complete();
					}
					else {
						collection.update({"test": "value"}, {"test": "updated"}, function(updateErr, updateResult){
							if(updateErr){
								err(ccr, updateErr);
								ccr.status = "error";
								complete();
							}
							else {
								collection.find({"test": "updated"}, function(findErr, findResult){
									if(findErr){
										err(ccr, findErr);
										ccr.status = "error";
										complete();
									}
									else {
										var deleteResult = collection.remove({"test": "updated"});
				
										if(deleteResult.writeConcernError != undefined){
											err(ccr, deleteResult.writeConcernError.errmsg);
											ccr.status = "error";
										}
										else {
											ccr.status = "success";
										}
										complete();
									}
								});
							}
						});
					}
				});
			}
		});
		
		function complete(){
			ccr.completed = true;
			for(var i=0;i<comps.length;i++){
				comps[i]();
			}
		}
		
		return ccr;
	}
	
	return d;
});