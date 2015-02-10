window.extend = function(original,extra){
  for(var i in extra){
    try{
      original[i] = extra[i];
    }catch(e){}
  }
  return original;
};
Notification.requestPermission(function (permission) {
  // If the user is okay, let's create a notification
  if (permission !== "granted") {
    alert('Notifications will use alerts');
  }
});
window.IRCCloud = function(){
  var self = this;
  extend(self,{
    debug: false,
    events: true,
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
      }
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
      }
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
    _highlights: [],
    _encode: function(d){
      var data = [],
          i;
      if(d){
        for(i in d){
          data.push(encodeURIComponent(i)+'='+encodeURIComponent(d[i]));
        }
      }
      return data.join('&');
    },
    _notify: function(d){
      for(var i in self._highlights){
        if(self._highlights[i].eid === d.eid){
          return;
        }
      }
      var h = {
            eid: d.eid,
            notification: {
              onclick: function(){}
            },
            click: function(){
              return this.notification.onclick.call(this.notification);
            },
            eid: d.eid,
            body: d.msg,
            title: (d.chan||'NOTICE')+' '+(d.from||'')
          },
          n;
      if(Notification.permission === "granted"){
        n = new Notification(h.title,{
          body: h.body
        });
        n.onclick = function(){
          for(var i in self._highlights){
            if(self._highlights[i].eid === d.eid){
              self._highlights.splice(i,1);
            }
          }
          self.post('heartbeat',{
            selectedBuffer: d.bid,
            seenEids: (function(){
              var m = {};
              m[d.cid] = {};
              m[d.cid][d.bid] = d.eid;
              return JSON.stringify(m);
            })()
          },function(){
            n.close();
          });
        };
        h.notification = n;
      }else{
        alert(h.body);
      }
      self._highlights.push(h);
      if(self.onnotify){
        self.onnotify(h);
      }
    },
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
        url: self.ENDPOINT+'/chat/'+name+'?'+self._encode(data),
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
      var stream = this;
      extend(stream,{
        _msg: '',
        reconnect: function(){
          if(self.events){
          console.info('Stream Reconnect');
        }
          if(self.ondisconnect){
            self.ondisconnect();
          }
          stream.init();
        },
        stop: function(){
          if(self.events){
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
          if(self.events){
            console.info('Stream Init');
          }
          if(navigator.onLine){
            var data = {};
            if(stream.streamid){
              data.streamid = stream.streamid;
            }
            if(stream.since_id){
              data.since_id = stream.since_id;
            }
            stream.xhr = new self.Request({
              url: self.ENDPOINT+'/chat/stream?'+self._encode(data),
              headers: {
                'x-auth-formtoken': self.token,
                'Cookie': 'session='+self.session
              },
              responseType: 'moz-chunked-text',
              onerror: stream.reconnect,
              ontimeout: stream.reconnect,
              onprogress: function(e){
                var d = [],i;
                e.target.response.trim().split("\n").forEach(function(v,i,a){
                  d.push(JSON.parse(v));
                });
                for(i in d){
                 stream.handle(d[i]); 
                }
              }
            });
          }else{
            // handle being offline
          }
        },
        _handles: {
          header: function(d){
            stream.streamid = d.streamid;
            stream.idle_interval = d.idle_interval;
            if(self.events){
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
            if(self.events){
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
                if(self.events){
                  console.log('Idle Interval Timeout');
                }
                stream.reconnect();
              }
            },10);
            var fn0 = function(){
                  if(self.events){
                    console.info('Online');
                  }
                  window.removeEventListener('online',fn0);
                  if(self.ononline){
                    self.ononline();
                  }
                  stream.init();
                },
                fn1 = function(){
                  if(self.events){
                    console.info('Offline');
                  }
                  window.removeEventListener('offline',fn1);
                  if(stream.xhr){
                    try{
                      stream.xhr.abort();
                    }catch(e){}
                  }
                  if(self.ondisconnect){
                    self.ondisconnect();
                  }
                  if(self.onoffline){
                    self.onoffline();
                  }
                };
            window.addEventListener('online',fn0);
            window.addEventListener('offline',fn1);
            if(stream.xhr){
              try{
                 stream.xhr.abort();
               }catch(e){}
            }
            stream.xhr = new self.Request({
              url: self.ENDPOINT+d.url,
              headers: {
                'x-auth-formtoken': self.token,
                'Cookie': 'session='+self.session
              },
              responseType: 'moz-chunked-text',
              onprogress: function(e){
                var d = [],i;
                stream._msg += e.target.response;
              },
              onload: function(){
                try{
                  var d = JSON.parse(stream._msg),i;
                  stream._msg = '';
                  for(i in d){
                    stream.handle(d[i]); 
                  }
                }catch(e){}
              },
              onerror: stream.reconnect,
              ontimeout: stream.reconnect
            });
          },
          makebuffer: function(d){
            self.last_seen_eid = d.last_seen_eid;
          },
          buffer_msg: function(d){
            if(d.highlight && !d.self && self.last_seen_eid < d.eid){
              self._notify(d);
            }
          },
          buffer_me_msg: function(d){
            if(d.highlight && !d.self && self.last_seen_eid < d.eid){
              self._notify(d);
            }
          },
          notice: function(d){
            if(d.highlight && !d.self && self.last_seen_eid < d.eid){
              self._notify(d);
            }
          },
          wallops: function(d){
            if(d.highlight && !d.self && self.last_seen_eid < d.eid){
              self._notify(d);
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
          if(self.debug){
            console.log(d.type);
          }
          stream.last_recieved = +new Date;
          stream.since_id = d.eid;
          if(stream._handles[d.type]){
            stream._handles[d.type](d);
          }
        }
      });
      stream.init();
      return stream;
    },
    setSession: function(session){
      if(self.events){
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
      if(self.events){
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
  return self;
};