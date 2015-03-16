var Hapi = require('hapi');
var Bell = require('bell');
var Cookie = require('hapi-auth-cookie');
var config = require('getconfig');

var server = new Hapi.Server();

var nav = '<nav><a href="/">Home</a> <a href="/session">Session</a> <a href="/hi">Hi</a> <a href="/login">Log in</a> <a href="/logout">Log out</a></nav>';

server.connection({ 
    host: config.hostname, 
    port: 8000 
});

server.register([require('bell'), require('hapi-auth-cookie')], function (err) {

    if (err) {
        throw err;
    }
    server.auth.strategy('twitter', 'bell', {
        provider: 'twitter',
        password: 'cookie_encryption_password',
        clientId: 'get_your_own!',
        clientSecret: 'get_your_own',
        isSecure: false //look into this, not a good idea but required if not using HTTPS
    });

    server.auth.strategy('session', 'cookie', {
        password: 'password', //used for cookie-encoding, the string could be anything
        cookie: 'sid', //
        redirectTo: '/login',
        redirectOnTry: false, //if false and root authentication mode is 'try' then errors will not trigger a redirection (it defaults to true)
        isSecure: false //defaults to true but if false it allows it to be transmitted across insecure connections --> exposed to attacks
    });

    server.route({
        method: ['GET', 'POST'],
        path: '/login', //this will redirect you to the Twitter login page (as defined in the config.auth)
        config: {
            auth: 'twitter', //use the twitter 'strategy' which is using bell
            handler: function (request, reply) { //handler event occurs after loging in to twitter
                var t = request.auth.credentials; 
                console.log('t', t);

                var profile = {
                    token: t.token,
                    secret: t.secret,
                    twitterId: t.profile.id,
                    twitterName: t.profile.username,
                    avatar: t.profile.raw.profile_image_url.replace('_normal', ''),
                    website: t.profile.raw.entities.url.urls[0].expanded_url,
                    about: t.profile.raw.description,
                    fullName: t.profile.displayName,
                };
                console.log('profile', profile);
                //request.auth.session.clear();
                request.auth.session.set(profile); //this saves your 'profile' details into this session
                return reply.redirect('/'); //then we are taken to the home page

            }
        }
    });

    server.route({
        method: ['GET'],
        path: '/logout',
        config: {
            auth: 'session',
            handler: function (request, reply) {
                request.auth.session.clear(); //wiping your profile from the current session (eg. so you are logged out and would have to log back in)
                return reply.redirect('/');
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/',
        config: {
            auth: {
                strategy: 'session', //authorisation is of 'hapi-auth-cookie' type
                mode: 'try' //allows you to proceed to a path handler even if not authenticated
            },
            handler: function (request, reply) {
                if(request.auth.isAuthenticated) { //isAuthenticated is true if the user has successfully logged in
                    var profile = request.auth.credentials;
                    reply(nav + '<h1>Hello, ' + profile.fullName + '</h1><p>Here\'s a nice picture of you I found:</p><img src="' + profile.avatar + '"/>');
                }
                else {
                    reply(nav + '<h1>Hello</h1><p>You should <a href="/login">log in</a>.</p>');
                }
            }
        }
    });
});
server.start();
