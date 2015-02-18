(function(){
	var extend = function(original,extra){
				for(var i in extra){
					try{
						original[i] = extra[i];
					}catch(e){}
				}
				return original;
			},
			encode = function(d){
				var data = [],
						i;
				if(d){
					for(i in d){
						data.push(encodeURIComponent(i)+'='+encodeURIComponent(d[i]));
					}
				}
				return data.join('&');
			},
			ircs = [];
	window.addEventListener('online',function(){
		for(var i in ircs){
			var self = ircs[i];
			if(self.options.events){
				console.info('Online');
			}
			if(self.ononline){
				self.ononline();
			}
			self.stream.init();
		}
	},false);
	window.addEventListener('offline',function(){
		for(var i in ircs){
			var self = ircs[i];
			if(self.options.events){
				console.info('Offline');
			}
			if(self.stream.xhr){
				try{
					self.stream.xhr.abort();
				}catch(e){}
			}
			if(self.ondisconnect){
				self.ondisconnect();
			}
			if(self.onoffline){
				self.onoffline();
			}
		}
	},false);
	Notification.requestPermission(function (permission) {
		// If the user is okay, let's create a notification
		if (permission !== "granted") {
			alert('Notifications will use alerts');
		}
	});
	window.IRCCloud = function(){
		var self = this,
				notify = function(d){
					for(var i in self.highlights){
						if(self.highlights[i].eid === d.eid){
							return;
						}
					}
					var h = {
								eid: d.eid,
								bid: d.bid,
								cid: d.cid,
								body: d.msg,
								title: (d.chan||'NOTICE')+' '+(d.from||''),
								notification: {
									onclick: function(){}
								},
								click: function(){
									return this.notification.onclick.call(this.notification);
								},
								clear: function(){
									var t = this;
									for(var i in self.highlights){
										if(self.highlights[i].eid === t.eid){
											self.highlights.splice(i,1);
										}
									}
									self.post('heartbeat',{
										selectedBuffer: d.bid,
										seenEids: (function(){
											var m = {};
											m[t.cid] = {};
											m[t.cid][t.bid] = t.eid;
											return JSON.stringify(m);
										})()
									},function(){
										t.notification.close();
									});
								}
							},
							n;
					if(Notification.permission === "granted"){
						n = new Notification(h.title,{
							body: h.body,
							icon: 'img/icons/icon48x48.png',
							tag: h.eid
						});
						n.onclick = function(){
							if(self.onclick){
								self.onclick.call(n,arguments);
							}
							n.close();
						};
						h.notification = n;
					}else{
						alert(h.body);
					}
					self.highlights.push(h);
					if(self.onnotify){
						self.onnotify(h);
					}
				};
		extend(self,{
			options: {
				debug: false,
				events: false,
				backlog: false
			},
			last_seen_eid: 0,
			ENDPOINT: 'https://www.irccloud.com',
			Request: function(options){
				if(!options.url){
					throw "No URL defined";
				}
				options.method = options.method||'GET';
				options.async = options.async===undefined?true:options.async;
				options.data = (function(d){
					var data = [],
							i;
					if(d){
						for(i in d){
							data.push(encodeURIComponent(i)+'='+encodeURIComponent(d[i]));
						}
					}
					return data.join('&');
				})(options.data);
				var xhr = new XMLHttpRequest({mozSystem:true}),
						s = function(name){
						 if(options[name]){
							 xhr[name] = options[name];
						 }
						},
						self = this;
				if(options.onprogress){
					xhr.addEventListener('progress',options.onprogress,false);
				}
				xhr.withCredentials = true;
				xhr.open(options.method,options.url,options.async);
				xhr.onload = function(){
					self.response = xhr.response;
					if(options.onload){
						options.onload.apply(this,arguments);
					}
				};
				xhr.onerror = function(){
					console.error(arguments);
					console.trace();
					if(options.onerror){
						options.onerror.apply(this,arguments);
					}
				};
				xhr.ontimeout = function(){
					console.error('Timeout');
					console.error(arguments);
					if(options.ontimeout){
						options.ontimeout.apply(this,arguments);
					}
				};
				s('onreadystatechange');
				s('timeout');
				s('responseType');
				if(options.headers){
					for(var i in options.headers){
						xhr.setRequestHeader(i,options.headers[i]);
					}
				}
				if(options.mimetype){
					xhr.overrideMimeType(options.mimetype);
				}
				extend(self,{
					xhr: xhr,
					header: function(name){
						return xhr.getResponseHeader(name);
					},
					abort: function(){
						delete xhr.ontimeout;
						delete xhr.onerror;
						delete xhr.onreadystatechange;
						delete xhr.onload;
						xhr.removeEventListener('progress',options.onprogress);
						return xhr.abort();
					},
					response: null
				});
				xhr.send(options.data);
				return self;
			},
			Connection: function(o){
				var con = this;
				extend(con,{
					id: o.cid,
					num_buffers: o.num_buffers,
					order: o.order,
					name: o.name,
					nick: o.nick,
					realname: o.realname,
					away: o.away,
					disconnected: o.disconnected,
					hostname: o.hostname,
					fail_info: o.fail_info,
					ident_prefix: o.ident_prefix,
					ircserver: o.ircserver,
					port: o.port,
					ssl: o.ssl,
					join_commands: o.join_commands,
					lag: o.lag,
					status: o.status,
					user: o.user,
					userhost: o.userhost,
					usermask: o.usermask,
					buffer: function(bid){
						var b;
						con.buffers.forEach(function(buffer){
							if(buffer.id === bid){
								b = buffer;
							}
						});
						return b;
					},
					channel: function(name){
						var c;
						con.channels.forEach(function(channel){
							if(channel.name === name){
								c = channel;
							}
						});
						return c;
					},
					'delete': function(){
						self.connections.forEach(function(c,i){
							if(c.id === con.id){
								self.connections.splice(i,1);
							}
						});
						con.buffers.forEach(function(b){
							b.delete();
						});
						for(var i in con){
							try{
								delete con[i];
							}catch(e){}
						}
						con = undefined;
					},
					buffers: [],
					channels: [],
				});
				Object.defineProperty(con,'cid',{
					get: function(){
						return con.id;
					}
				});
				return con;
			},
			Buffer: function(o){
				var buf = this;
				extend(buf,{
					id: o.bid,
					type: o.buffer_type,
					created: o.created,
					deferred: o.deferred,
					last_seen_eid: o.last_seen_eid,
					min_eid: o.min_eid,
					name: o.name,
					timeout: o.timeout,
					'delete': function(){
						buf.connection.buffers.forEach(function(b,i){
							if(b.id === buf.id){
								buf.connection.buffers.splice(i,1);
							}
						});
						for(var i in buf){
							try{
								delete buf[i];
							}catch(e){}
						}
						buf = undefined;
					}
				});
				Object.defineProperty(buf,'connection',{
					get: function(){
						return self.connection(o.cid);
					}
				});
				Object.defineProperty(buf,'channel',{
					get: function(){
						if(buf.type == 'channel'){
							for(var i in buf.connection.channels){
								if(buf.connection.channels[i].buffer === buf){
									return buf.connection.channels[i];
								}
							}
						}
					}
				});
				Object.defineProperty(buf,'bid',{
					get: function(){
						return buf.id;
					}
				});
				return buf;
			},
			Channel: function(o){
				var chan = this;
				extend(chan,{
					name: o.chan,
					members: o.members,
					mode: o.mode,
					topic: o.topic,
					timestamp: o.timestamp,
					type: o.channel_type,
					url: o.url,
					'delete': function(){
						chan.connection.channels.forEach(function(c,i){
							if(c.name == chan.name){
								chan.connection.channels.splice(i,1);
							}
						});
						for(var i in chan){
							try{
								delete chan[i];
							}catch(e){}
						}
						chan = undefined;
					}
				});
				Object.defineProperty(chan,'chan',{
					get: function(){
						return chan.name;
					}
				});
				Object.defineProperty(chan,'buffer',{
					get: function(){
						return chan.connection.buffer(o.bid);
					}
				});
				Object.defineProperty(chan,'connection',{
					get: function(){
						return self.connection(o.cid);
					}
				});
				return chan;
			},
			connection: function(cid){
				var c;
				self.connections.forEach(function(connection){
					if(connection.id === cid){
						c = connection;
					}
				});
				return c;
			},
			connections: [],
			highlights: [],
			post: function(name,data,callback,onerror){
				callback = callback===undefined?function(){}:callback;
				onerror = onerror===undefined?function(){}:onerror;
				data = data===undefined?{}:data;
				if(self.session){
					data.session = self.session;
				}
				var req = new self.Request({
					url: self.ENDPOINT+'/chat/'+name,
					data: data,
					method: 'POST',
					responseType: 'json',
					headers: {
						'x-auth-formtoken': self.token,
						'content-type': 'application/x-www-form-urlencoded',
						'Cookie': 'session='+self.session
					},
					onerror: onerror,
					onload: function(){
						callback.call(this,req.response);
					}
				});
				return self;
			},
			get: function(name,data,callback,onerror){
				if(typeof data == 'function'){
					callback = data;
					data = undefined;
				}
				callback = callback===undefined?function(){}:callback;
				onerror = onerror===undefined?function(){}:onerror;
				data = data === undefined?{}:data;
				if(self.session){
					data.session = self.session;
				}
				var req = new self.Request({
					url: self.ENDPOINT+'/chat/'+name+'?'+encode(data),
					responseType: 'json',
					headers: {
						'x-auth-formtoken': self.token,
						'Cookie': 'session='+self.session
					},
					onerror: onerror,
					onload: function(){
						callback.call(this,req.response);
					}
				});
				return self;
			},
			Stream: function(){
				var stream = this,
					handle_raw = function(e){
						if(e.target.response){
							if(self.options.events){
								console.log('handle_raw');
							}
							var a = [],
								t = '';
							if(e.target.responseType == 'json'){
								a = e.target.response;
							}else{
								a = e.target.response.split("\n");
								a.forEach(function(d,i){
									if(d==''){
										a.splice(i,1);
									}else{
										a[i] = JSON.parse(d);
									}
								});
							}
							a.forEach(function(d,i){
								try{
									stream.handle(d);
									delete a[i];
								}catch(e){}
							});
						}
					};
				extend(stream,{
					_msg: '',
					since_id: -1,
					reconnect: function(){
						if(self.options.events){
							console.info('Stream Reconnect');
						}
						if(self.ondisconnect){
							self.ondisconnect();
						}
						stream.init();
					},
					stop: function(){
						if(self.options.events){
							console.info('Stream Stop');
						}
						if(stream._interval){
							clearInterval(stream._interval);
							stream._interval = undefined;
						}
						if(stream.xhr){
							try{
								stream.xhr.abort();
							}catch(e){}
						}
					},
					init: function(){
						stream.stop();
						if(self.onreconnect){
							self.onreconnect();
						}
						if(self.options.events){
							console.info('Stream Init');
						}
						if(navigator.onLine){
							var data = {};
							if(stream.streamid){
								data.stream_id = stream.streamid;
							}
							data.since_id = stream.since_id;
							stream.xhr = new self.Request({
								url: self.ENDPOINT+'/chat/stream?'+encode(data),
								headers: {
									'x-auth-formtoken': self.token,
									'Cookie': 'session='+self.session
								},
								responseType: 'moz-chunked-text',
								onerror: stream.reconnect,
								ontimeout: stream.reconnect,
								onprogress: handle_raw,
								onload: handle_raw
							});
						}else{
							// handle being offline
						}
					},
					handles: {
						header: function(d){
							stream.streamid = d.streamid;
							stream.idle_interval = d.idle_interval;
							if(self.options.events){
								console.info('Header');
							}
						},
						stat_user: function(d){
							self.user = {
								id: d.id,
								name: d.name,
								email: d.email,
								verified: d.verified,
								admin: d.admin
							};
							if(self.options.events){
								console.info('Stat User');
							}
							if(self.onstatuser){
								self.onstatuser();
							}
						},
						oob_include: function(d){
							if(self.onconnect){
								self.onconnect();
							}
							stream._interval = setInterval(function(){
								if((stream.idle_interval+stream.last_recieved)<+new Date){
									if(self.options.events){
										console.log('Idle Interval Timeout');
									}
									stream.reconnect();
								}
							},10);
							new self.Request({
								url: self.ENDPOINT+d.url,
								headers: {
									'x-auth-formtoken': self.token,
									'Cookie': 'session='+self.session
								},
								responseType: 'json',
								onload: handle_raw
							});
						},
						makebuffer: function(d){
							var c = self.connection(d.cid);
							if(c){
								if(c.buffer(d.bid)){
									c.buffer(d.bid).delete();
								}
								c.buffers.push(new self.Buffer(d));
							}
							if(self.last_seen_eid<d.last_seen_eid){
								self.last_seen_eid = d.last_seen_eid;
							}
							if(self.onbuffer){
								self.onbuffer();
							}
						},
						delete_buffer: function(d){
							var c = self.connection(d.cid);
							if(c){
								var b = c.buffer(d.bid);
								if(b){
									b.delete();
								}
							}
							if(self.onbuffer){
								self.onbuffer();
							}
						},
						makeserver: function(d){
							try{
								self.connection(d.cid).delete();
							}catch(e){}
							self.connections.push(new self.Connection(d));
							if(self.onserver){
								self.onserver();
							}
						},
						connection_deleted: function(d){
							try{
								self.connection(d.cid).delete();
							}catch(e){}
							if(self.onserver){
								self.onserver();
							}
						},
						connection_lag: function(d){
							try{
								self.connection(d.cid).lag = d.lag;
							}catch(e){}
						},
						server_details_changed: function(d){
							// Todo
							if(self.onserver){
								self.onserver();
							}
						},
						channel_init: function(d){
							try{
								var c = self.connection(d.cid);
								try{
									c.channel(d.chan).delete();
								}catch(e){}
								c.channels.push(new self.Channel(d));
							}catch(e){}
							if(self.onchannel){
								self.onchannel();
							}
						},
						buffer_msg: function(d){
							if(d.highlight && !d.self && self.last_seen_eid < d.eid){
								notify(d);
							}
						},
						buffer_me_msg: function(d){
							if(d.highlight && !d.self && self.last_seen_eid < d.eid){
								notify(d);
							}
						},
						notice: function(d){
							if(d.highlight && !d.self && self.last_seen_eid < d.eid){
								notify(d);
							}
						},
						wallops: function(d){
							if(d.highlight && !d.self && self.last_seen_eid < d.eid){
								notify(d);
							}
						},
						heartbeat_echo: function(d){
							for(var i in d.seenEids){
								for(var ii in d.seenEids[i]){
									if(d.seenEids[i][ii]>self.last_seen_eid){
										self.last_seen_eid = d.seenEids[i][ii];
									}
								}
							}
						}
					},
					handle: function(d){
						if(typeof d == 'string'){
							d = JSON.parse(d);
						}
						if(d.type){
							if(self.options.debug){
								console.log(d.type);
							}
							stream.last_recieved = +new Date;
							if(d.eid>stream.since_id){
								stream.since_id = d.eid;
							}
							if(stream.handles[d.type]){
								stream.handles[d.type](d);
							}
						}
					}
				});
				stream.init();
				return stream;
			},
			setSession: function(session){
				if(self.options.events){
					console.info('setSession');
				}
				self.session = session;
				document.cookie = 'session='+session;
				if(!self.stream){
					self.stream = new self.Stream();
				}else{
					self.stream.reconnect();
				}
			},
			login: function(user,pass,callback,onerror){
				if(self.options.events){
					console.info('Login');
				}
				callback = callback===undefined?function(){}:callback;
				self.rpc['auth-formtoken'](function(d){
					self.token = d.token;
					self.rpc['login']({
						token: d.token,
						email: user,
						password: pass
					},function(d){
						self.setSession(d.session);
						callback(d);
					},onerror);
				});
			},
			rpc: (function(){
				var methods = {
						get:[
							'plans',
							'backlog',
							'stream'
						],
						post:[
							'request-invite',
							'auth-formtoken',
							'signup',
							'login',
							'request-password-reset',
							'heartbeat',
							'say',
							'user-settings',
							'set-prefs',
							'resend-verify-email',
							'add-server',
							'edit-server',
							'add-default-server',
							'change-password',
							'send-invite',
							'ignore',
							'unignore',
							'set-ignores',
							'nick',
							'delete-connection',
							'disconnect',
							'reconnect',
							'ns-help-register',
							'set-nspass',
							'join',
							'part',
							'topic',
							'unarchive-buffer',
							'archive-buffer',
							'delete-buffer',
							'whois'
						]
					},
					i,
					rpc = {};
				for(i in methods.get){
					(function(n){
						rpc[n] = function(callback,onerror){
							return self.get(n,callback,onerror);
						};
					})(methods.get[i]);
				}
				for(i in methods.post){
					(function(n){
						rpc[n] = function(data,callback,onerror){
							if(typeof data == 'function' && callback === undefined){
								callback = data;
								data = undefined;
							}
							return self.post(n,data,callback,onerror);
						};
					})(methods.post[i]);
				}
				return rpc;
			})()
		});
		ircs.push(self);
		return self;
	};
})();