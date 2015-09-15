/**
 * Created by migal on 15.09.15.
 */
var SessionHandler = require('./sessions');
var async = require('async');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var uploaderConfig;
var amazonS3conf;

if (process.env.UPLOADER_TYPE === 'AmazonS3') {
    amazonS3conf = require('../config/aws');
    uploaderConfig = {
        type: process.env.UPLOADER_TYPE,
        awsConfig: amazonS3conf
    };
} else {
    uploaderConfig = {
        type: process.env.UPLOADER_TYPE,
        directory: process.env.FILESYSTEM_BUCKET
    };
}

var imageUploader = require('../helpers/imageUploader/imageUploader')(uploaderConfig);

var imageHandler = function(db){

    function createImageName (){
        return new ObjectId();
    }

    this.uploadAvatar = function(imageString, callback){

        var imageName = createImageName();

        imageUploader.uploadImage(imageString, imageName, 'avatar', callback);
    };

};

module.exports = imageHandler;