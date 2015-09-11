'use strict';

var async = require('async');
//var server;
var app;
//var defaults;
var db;

process.env.NODE_ENV = 'test';

app = require('../app')();
db = app.get('db');
var DbHandler = require('./testHandlers/dbHandler');
var dbHandler = new DbHandler(db);

describe('Database initialization', function () {
    this.timeout(5000);

    it('Drop the collections', function (done) {

        dbHandler.dropCollections(done);

    });

    /*it('Create tables', function (done) {
     schemas.create(done);
     });*/


    /*it('Create default data', function (done) {
     defaults.create(done);
     });*/

    /*it('Test handlers', function () {
     //require('./testHandlers/testUsers')(PostGre, defaults);
     //require('./testHandlers/testLinks')(PostGre, defaults);
     //require('./testHandlers/testTemplates')(PostGre, defaults);
     //require('./testHandlers/testCompanies')(PostGre, defaults);
     //require('./testHandlers/testDocuments')(PostGre, defaults);
     });*/
});
