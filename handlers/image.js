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

    var Image = db.model('Image');

    function createImageName (){
        return new ObjectId();
    }

    this.uploadAvatar = function (req, res, next) {
        var uId = req.session.uId;
        var imageString = req.body.image;
        var imageModel;
        var imageName;

        Image.findOne({user: uId}, function (err, resultUser) {

            if (err) {
                return next(err);
            }

            if (!resultUser) {
                imageName = createImageName();
                imageModel = new Image({user: uId, avatar: imageName});
                imageUploader.uploadImage(imageString, imageName, 'avatar', function (err) {

                    if (err) {
                        return next(err);
                    }

                    imageModel
                        .save(function (err) {
                            if (err) {
                                return next(err);
                            }

                            res.status(200).send({success: 'Image upload successfully'});

                        });

                });

            } else {

                imageName = resultUser.get('avatar');

                imageUploader.uploadImage(imageString, imageName, 'avatar', function (err) {

                    if (err) {
                        return next(err);
                    }
                    res.status(200).send({success: 'Image upload successfully'});

                });

            }
        });
    };

    this.getAvatarUrl = function (req, res, next) {
        var uId = req.session.uId;
        var avatarName;
        var url = '';

        Image.findOne({user: uId}, function (err, resultModel) {

            if (err) {
                return next(err);
            }

            avatarName = resultModel.get('avatar');

            url = imageUploader.getImageUrl(avatarName, 'avatar') + '.png';

            res.status(200).send({'url': url});

        });


    };



};

module.exports = imageHandler;