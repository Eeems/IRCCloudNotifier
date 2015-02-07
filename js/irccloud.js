window.extend = function(original,extra){
  for(var i in extra){
    try{
      original[i] = extra[i];
    }catch(e){}
  }
  return original;
};
window.IRCCloud = function(){
  var self = this;
  extend(self,{
    ENDPOINT: 'https://www.irccloud.com/chat/',
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
          return xhr.abort();
        },
        response: null
      });
      xhr.send(options.data);
      return self;
    },
    post: function(name,data,callback){
      callback = callback===undefined?function(){}:callback;
      data = data===undefined?{}:data;
      if(self.session){
        data.session = self.session;
      }
      var req = new self.Request({
        url: self.ENDPOINT+name,
        data: data,
        method: 'POST',
        responseType: 'json',
        headers: {
          'x-auth-formtoken': self.token,
          'content-type': 'application/x-www-form-urlencoded',
          'Cookie': 'session='+self.session
        },
        onload: function(){
          callback.call(this,req.response);
        }
      });
      return self;
    },
    get: function(name,data,callback){
      if(typeof data == 'function'){
        callback = data;
        data = undefined;
      }
      callback = callback===undefined?function(){}:callback;
      data = data === undefined?{}:data;
      if(self.session){
        data.session = self.session;
      }
      data = (function(d){
        var data = [],
            i;
        if(d){
          for(i in d){
            data.push(encodeURIComponent(i)+'='+encodeURIComponent(d[i]));
          }
        }
        return data.join('&');
      })(data);
      var req = new self.Request({
        url: self.ENDPOINT+name+'?'+data,
        responseType: 'json',
        headers: {
          'x-auth-formtoken': self.token,
          'Cookie': 'session='+self.session
        },
        onload: function(){
          callback.call(this,req.response);
        }
      });
      return self;
    },
    login: function(user,pass,callback){
      callback = callback===undefined?function(){}:callback;
      self.rpc['auth-formtoken'](function(d){
        self.token = d.token;
        self.rpc['login']({
          token: d.token,
          email: user,
          password: pass
        },function(d){
          self.session = d.session;
          self.uid = d.uid;
          document.cookie = 'session='+d.session;
          callback(d);
        });
      });
    },
    rpc: (function(){
      var methods = {
           get:[
             'plans',
             'backlog'
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
          rpc[n] = function(callback){
            return self.get(n,callback);
          };
        })(methods.get[i]);
      }
      for(i in methods.post){
        (function(n){
          rpc[n] = function(data,callback){
            if(typeof data == 'function' && callback === undefined){
              callback = data;
              data = undefined;
            }
            return self.post(n,data,callback);
          };
        })(methods.post[i]);
      }
      return rpc;
    })()
  });
  return self;
};