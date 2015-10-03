process.env.DB_HOST = 'localhost';
process.env.DB_NAME = "FrndrDev";
process.env.DB_PORT = 27017;

//process.env.HOST = 'http://194.42.200.114:8859';
process.env.HOST = 'http://projects.thinkmobiles.com:8859';
//process.env.HOST = 'http://192.168.88.47:8859';
//process.env.HOST = 'http://localhost:8859';
process.env.PORT = '8859';

//process.env.REDIS_HOST = '134.249.164.53';
/*process.env.REDIS_HOST = '192.168.88.250';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB_KEY = '9';*/

process.env.UPLOADER_TYPE = 'FileSystem';
process.env.FILESYSTEM_BUCKET = 'public/uploads/' + process.env.NODE_ENV.toLowerCase();


