window.addEventListener('DOMContentLoaded', function() {
  'use strict';
  location.hash = 'tab-login';
  navigator.mozL10n.once(function(){
    window.irc = new IRCCloud();
    window.$ = function(){
      return document.querySelector.apply(document,arguments);
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
