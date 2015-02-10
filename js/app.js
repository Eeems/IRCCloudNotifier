window.$ = function(){
  return document.querySelector.apply(document,arguments);
};
window.addEventListener('DOMContentLoaded', function() {
  'use strict';
  location.hash = 'tab-login';
  navigator.mozL10n.once(function(){
    window.irc = new IRCCloud();
    var saveSession = function(){
          localStorage.setItem('session',JSON.stringify({
            session: irc.session,
            user: irc.user
          }));
        },
        updateUser = function(){
          $('#user-name').textContent = irc.user.name;
          $('#user-email').textContent = irc.user.email;
        };
    if(localStorage.getItem('session')!==null){
      var s = JSON.parse(localStorage.getItem('session'));
      irc.user = s.user;
      irc.setSession(s.session);
      updateUser();
      location.hash = 'tab-display';
    }
    $('#network-status').textContent = navigator.onLine?"Online":"Offline";
    $('#reconnect-status').style.display = 'none';
    irc.onreconnect = function(){
      $('#reconnect-status').style.display = 'block';
    };
    irc.onoffline = function(){
      $('#network-status').textContent = 'Offline';
    };
    irc.ononline = function(){
      $('#network-status').textContent = 'Online';
    };
    irc.onconnect = function(){
      $('#reconnect-status').style.display = 'none';
      $('#status').textContent = 'Connected';
    };
    irc.ondisconnect = function(){
      $('#status').textContent = 'Disconnected';
    };
    irc.onnotify = function(h){
      var d = document.createElement('div'),
          st = document.createElement('strong'),
          sp = document.createElement('span');
      d.onclick = function(){
        h.click();
        d.remove();
      };
      d.id = 'eid_'+h.eid;
      st.textContent = h.title;
      sp.textContent = h.body;
      d.appendChild(st);
      d.appendChild(sp);
      $('#notifications').appendChild(d);
    };
    irc.onstatuser = saveSession;
    $('#login-form').onsubmit = function(){
      $('#login').click();
      return false;
    };
    $('#login').disabled = false;
    $('#login').onclick = function(){
      this.disabled = true;
      irc.login($('#email').value,$('#password').value,function(d){
        if(!d.success){
          $('#login').disabled = false;
          alert('Login Failed: '+d.message);
        }else{
          $('#status').textContent = 'Logged in!';
          location.hash = 'tab-display';
          saveSession();
          updateUser();
        }
      },function(e){
        alert("Login Failed: "+e);
        console.error(e);
        $('#login').disabled = false;
      });
    };
    $('#reconnect').onclick = function(){
      irc.stream.reconnect();
    };
    $('#logout').onclick = function(){
      localStorage.removeItem('session');
      location.hash = 'tab-login';
      var req = navigator.mozAlarms.getAll();
      req.onsuccess = function(){
        this.result.forEach(function(alarm){
          navigator.mozAlarms.remove(alarm.id);
        });
      };
    };
    setInterval(function(){
      var req = navigator.mozAlarms.getAll();
      req.onsuccess = function(){
        var latest = new Date(),
            now = latest
        this.result.forEach(function(alarm){
          if(alarm.date>latest){
            latest = alarm.date;
          }
          if(alarm.date<now){
            navigator.mozAlarms.remove(alarm.id);
            var d = new Date();
            d.setMinutes(now.getMinutes()+1);
            navigator.mozAlarms.add(d,"honorTimezone");
          }
        });
        if(this.result.length<5){
          var d = new Date();
          for(var i=1;i<6;i++){
            d.setMinutes(now.getMinutes()+i);
            navigator.mozAlarms.add(d,"honorTimezone");
          }
        }
      };
     },10000);
  });
});
