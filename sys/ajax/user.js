/**
 * @author bh-lay
 * 
 * /ajax/user
 * /ajax/user/signup
 * /ajax/user/login
 * demo $.post('/ajax/user',{
	
	});
 */

var mongo = require('../conf/mongo_connect');
var session = require('../mod/session');
//增加一条用户记录
function add(parm,res_this){
	var parm = parm;
	
	var method = mongo.start();
		
	method.open({'collection_name':'user'},function(err,collection){
	
		collection.find({}, {}).toArray(function(err, docs) {
	
			parm.id = parse.createID();

			collection.insert(parm,function(err,result){
				if(err) throw err;
				res_this.json({
					'code' : 1,
					'id' : parm.id ,
					'msg' : 'sucess !'
				});
				method.close();
			});
		});
	});
}
//修改用户记录
function edit(parm,res_this){
	var parm = parm;
	
	var method = mongo.start();
		
	method.open({'collection_name':'user'},function(error,collection){
		collection.update({'id':parm.id}, {$set:parm}, function(err,docs) {
			if(err) {
				res_this.json({
					'code' : 1,
					'msg' : 'modified failure !'
				});       
			}else {
				res_this.json({
					'code' : 1,
					'msg' : 'modified success !'
				});
			}
			method.close();
		});
	});
}
//增加或编辑用户记录
function add_edit (){
	var that = this;
	parse.request(this.request,function(error,fields, files){
		var data = fields;
		var parm = {
			'id' : data['id'] || '',
			'username':data['username'] || '',
			'password':data['password'] ? parse.md5(data['password']) : null,
			'email':data['email'] || null,
			'user_group':data['user_group'] || '',
		};
		if(!parm['username']){
			that.res.json({
				'code' : 2,
				'msg' : 'please insert complete code !'
			});
			return
		}
		
		session.start(that.request,that.res,function(){
			var session_this = this;
			if(parm['id']&&parm['id'].length>2){
				//check edit user power
				if(session_this.power(12)){
					if(parm['password'] == null){
						delete parm['password'];
					}
					edit(parm,that.res);
				}else{
					that.res.json({
						'code':2,
						'msg':'no power to edit user !'
					});
				}
			}else{
				//check add user power
				if(session_this.power(11)){
					add(parm,that.res);
				}else{
					that.res.json({
						'code':2,
						'msg':'no power to edit user !'
					});
				}
			}
		});
	});
}
//注册新的用户
function signup(){
	var that = this;
	parse.request(this.request,function(error,data){
		var param = {};
		param['email'] = data['email'] || null;
		param['password'] = parse.md5(data['password'] || '');
		param['user_group'] = 'user';
		param['id'] = parse.createID();
		if(param['email']&&param['password']){
			var method = mongo.start();
			method.open({'collection_name':'user'},function(err,collection){
				collection.find({}, {}).toArray(function(err, docs) {
					collection.insert(param,function(err,result){
						method.close();
						if(err){
							console.log(err);
						}
						that.res.json({
							'code' : 1,
							'id' : param.id ,
							'msg' : 'sucess !'
						});
					});
				});
			});
		}else{
			that.res.json({
				'code' : 2,
				'msg' : 'signup fail'
			});
		}
	});
}

function get_power(method,user_group,callback){
	method.open({'collection_name':'user_group'},function(err,collection){
		collection.find({'user_group':user_group}).toArray(function(err, docs) {
			var power_data = docs[0]['power'];
			callback&&callback(power_data);
		});
	});
}
//处理login
function login_handle(res_this,session_this,username,password){
		//matche user
	var method = mongo.start();

	method.open({'collection_name':'user'},function(err,collection){
		//
		collection.find({"$or": [{'username':username},{'email':username}]}).toArray(function(err, docs) {
			
			if(docs.length > 0){
				if( docs[0]['password'] != password){
					//密码错了
					res_this.json({
						'code':2,
						'msg':'二货，帐号密码输错了吧！'
					});
					return
				}				
				var user_group = docs[0]['user_group'];
				get_power(method,user_group,function(power_data){
					method.close();
					session_this.set({
						'user_group' : user_group,
						'username' : docs[0]['username'], 
						'user_id' : docs[0]['id'],
						'power_data' : power_data
					});
					
					res_this.json({
						'code':1,
						'msg':'login success!'
					});
				});
				
			}else{
				//账号错了
				res_this.json({
					'code':2,
					'msg':'二货，帐号密码输错了吧！'
				});
			}
		});
	});
}

//登录
function login (){
	var req = this.request;
	var res_this = this.res;
	parse.request(req,function(error,data){
		var username = data['username'];
		var password = data['password'] || '';
		password = parse.md5(password);
		if(!username||password.length<2){
			res_this.json({
				'code':2,
				'msg':'please input username and password !'
			});
		}else{
			session.start(req,res_this,function(){
				var session_this = this;
				login_handle(res_this,session_this,username,password);
			});
		}
	});
}
//登出
function exist(){
	var req = this.request;
	var res_this = this.res;
	session.start(req,res_this,function(){
		this.set({
			'user_group' : 'guest',
			'power_data' : []
		});
		res_this.json({
			'code':1,
			'msg':'exist success !'
		});
	});
}

exports.render = function (req,res_this,path){
	this.request = req;
	this.res = res_this;
	this.path = path;
	if(path.pathnode.length == 2){
		add_edit.call(this);
	}else if(path.pathnode.length == 3){
		switch(path.pathnode[2]){
			case 'signup':
				signup.call(this);
			break
			case 'login':
				login.call(this);
			break
			case 'exist':
				exist.call(this);
			break
			default :
				res_this.json({
					'code' : 2,
					'msg' : 'wrong path'
				});
		}
	}else{
		res_this.json({
			'code' : 2,
			'msg' : 'wrong path'
		});
	}
}