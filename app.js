
var express = require('express');
var app = express();
var path = require('path');
var logger = require('morgan');
var mongoose = require('mongoose');
var http = require('http');
var bodyParser = require('body-parser');
var server = http.createServer(app);
var connectOptions;
var mainDb;
var session = require('express-session');
var MemoryStore = require('connect-redis')(session);
var redisConfig = {
    db: parseInt(process.env.REDIS_DB_KEY),
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT) || 6379
};
//var cookieParser = require('cookie-parser');

if (!process.env.NODE_ENV) {
    //TODO change NODE_ENV for production server
    //process.env.NODE_ENV = 'test';
    process.env.NODE_ENV = 'development';
    //process.env.NODE_ENV = 'production';
}

if (process.env.NODE_ENV === 'production') {
    console.log('-----Server start success in Production version--------');
    require('./config/production');
} else if (process.env.NODE_ENV === 'development') {
    console.log('-----Server start success in Development version--------');
    require('./config/development');
} else {
    console.log('-----Server start success in TEST version--------');
    require('./config/test');
}

app.set('port', process.env.PORT || 8859);

//=====socket.io==========================
var Io = require('./helpers/sockets');
var io = Io(server);
var SocketEvents = require('./helpers/socketEvents');
var socketEvents = SocketEvents(io);
app.set('io', io);
//=========================================

app.use(logger('dev'));
//app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({strict: false, limit: 1024 * 1024 * 200}));
app.use(bodyParser.urlencoded({extended: false}));
//app.use( cookieParser());

connectOptions = {
    //db: { native_parser: true },
    db: {native_parser: false},
    server: {poolSize: 5},
    //replset: { rs_name: 'myReplicaSetName' },
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    w: 1,
    j: true,
    mongos: true
};


mainDb = mongoose.createConnection(process.env.DB_HOST, process.env.DB_NAME, process.env.DB_PORT, connectOptions);

mainDb.on('error', console.error.bind(console, 'connection error:'));
mainDb.once('open', function callback() {
    console.log("Connection to " + process.env.DB_NAME + " is success");

    app.use(session({
     secret: '111',
     resave: true,
     saveUninitialized: true,
     store: new MemoryStore(redisConfig)
     }));

    require('./routes')(app, mainDb);

    //scheduleHelper(mainDb);

    server.listen(app.get('port'), function () {
        console.log("Express server listening on port " + app.get('port'));
        console.log("HOST: " + process.env.HOST);
        //console.log("RDS_HOSTNAME: " + process.env.RDS_HOSTNAME);
        console.log("DATABASE: " + process.env.DB_NAME);
        ///console.log("REDIS_HOST: " + process.env.REDIS_HOST);
    });


    /*server.listen(8859, function () {
        console.log('Server up successfully on port 8859');
    });*/
});

