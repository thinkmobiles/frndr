var UserHandler = require('../handlers/users');

module.exports = function (app, db) {
    var logWriter = require('../modules/logWriter')();

    var userHandler = new UserHandler(app, db);
    var userRouter = require('./users')(app, db);
    var messageRouter = require('./messages')(app, db);
    var imageRouter = require('./image')(app, db);

    app.get('/', function (req, res, next) {
        res.status(200).send('Express start succeed');
    });

    app.post('/signIn', userHandler.signInClient);
    app.post('/signOut', userHandler.signOut);

    app.use('/users', userRouter);
    app.use('/image', imageRouter);
    app.use('/messages', messageRouter);

    function notFound(req, res, next) {
        next();
    }

    function errorHandler(err, req, res, next) {
        var status = err.status || 500;

        if (process.env.NODE_ENV === 'production') {
            if (status === 404 || status === 401) {
                logWriter.log('', err.message + '\n' + err.stack);
            }
            res.status(status).send({message: err.message});
        } else {
            if (status !== 401) {
                logWriter.log('', err.message + '\n' + err.stack);
            }
            res.status(status).send({message: err.message, stack: err.stack});
        }

        if (status === 401) {
            console.warn(err.message);
        } else {
            console.error(err.message);
            console.error(err.stack);
        }
    }

    app.use(notFound);
    app.use(errorHandler);
};