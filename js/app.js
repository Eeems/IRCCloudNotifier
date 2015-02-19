window.$ = function(){
	return document.querySelector.apply(document,arguments);
};
window.addEventListener('DOMContentLoaded', function() {
	'use strict';
	location.hash = 'tab-login';
	var app;
	navigator.mozApps.getSelf().onsuccess = function(event) {
		app = event.target.result;
		app.checkForUpdate();
	};
	navigator.mozL10n.once(function(){
		window.irc = new IRCCloud();
		var saveSession = function(){
					localStorage.setItem('session',JSON.stringify({
						session: irc.session,
						user: irc.user
					}));
				},
				updateUser = function(){
					if(irc.user){
						if(irc.user.name){
							$('#user-name').textContent = irc.user.name;
						}
						if(irc.user.email){
							$('#user-email').textContent = irc.user.email;
						}
					}
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
		irc.onerror = function(e){
			alert(e);
		};
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
				h.clear();
				d.remove();
			};
			d.id = 'eid_'+h.eid;
			d.className = 'notification';
			st.textContent = h.title;
			sp.textContent = h.body;
			d.appendChild(st);
			d.appendChild(sp);
			$('#notifications').appendChild(d);
		};
		irc.onclick = function(){
			app.launch();
		};
		irc.onstatuser = function(){
			saveSession();
			updateUser();
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
		irc.onserver = function(){
			$('#info-connections').textContent = irc.connections.length;
		};
		irc.onbuffer = function(){
			var c = 0;
			irc.connections.forEach(function(con){
				c += con.buffers.length;
			});
			$('#info-buffers').textContent = c;
		};
		irc.onchannel = function(){
			var c = 0;
			irc.connections.forEach(function(con){
				c += con.channels.length;
			});
			$('#info-channels').textContent = c;
		};
		$('#reconnect').onclick = function(){
			irc.stream.reconnect();
		};
		$('#logout').onclick = function(){
			localStorage.removeItem('session');
			location.hash = 'tab-login';
			irc.logout();
			var req = navigator.mozAlarms.getAll();
			req.onsuccess = function(){
				this.result.forEach(function(alarm){
					navigator.mozAlarms.remove(alarm.id);
				});
			};
		};
		var req = navigator.mozAlarms.getAll();
		req.onsuccess = function(){
			if(this.result.length===0){
				var d = new Date();
				d.setMinutes(d.getMinutes()+1);
				navigator.mozAlarms.add(d,"honorTimezone");
			}
		};
		navigator.mozSetMessageHandler('alarm',function(alarm){
			var d = new Date();
			d.setMinutes(d.getMinutes()+1);
			navigator.mozAlarms.add(d,"honorTimezone");
			navigator.mozAlarms.remove(alarm.id);
		});
		navigator.mozSetMessageHandler('notification',function(notification){
			var n = $('#eid_'+notification.tag);
			if(n){
				n.parentNode.style.background = 'red';
			}
			irc.onclick.call(notification);
		});
	});
});
