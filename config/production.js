process.env.DB_HOST = 'localhost';
process.env.DB_NAME = "FrndrPro";
process.env.DB_PORT = 27017;

process.env.HOST = 'http://localhost:8859';
process.env.EXT_HOST = 'http://projects.thinkmobiles.com:8859'; //server external ip for image uploader, change it
process.env.PORT = '8859';

process.env.UPLOADER_TYPE = 'FileSystem';
process.env.FILESYSTEM_BUCKET = 'public/uploads/' + process.env.NODE_ENV.toLowerCase();



