window.addEventListener('DOMContentLoaded', function() {
  'use strict';
  location.hash = 'tab-login';
  navigator.mozL10n.once(function(){
    window.irc = new IRCCloud();
    window.$ = function(){
      return document.querySelector.apply(document,arguments);
    };
    irc.onreconnect = function(){
      var p = document.createElement('p');
      p.textContent = 'Reconnecting';
      $('#tab-display').appendChild(p);
    };
    irc.onoffline = function(){
      var p = document.createElement('p');
      p.textContent = 'Offline';
      $('#tab-display').appendChild(p);
    };
    irc.ononline = function(){
      var p = document.createElement('p');
      p.textContent = 'Online';
      $('#tab-display').appendChild(p);
    };
    irc.onconnect = function(){
      var p = document.createElement('p');
      p.textContent = 'Connected';
      $('#tab-display').appendChild(p);
    };
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
          location.hash = 'tab-display';
        }
      });
    };
  });
});
