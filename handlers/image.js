
var SessionHandler = require('./sessions');
var async = require('async');
var CONSTANTS = require('../constants/index');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var badRequests = require('../helpers/badRequests');

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



var imageHandler = function (db) {
    var Image = db.model('Image');
    var self = this;

    var imageUploader = require('../helpers/imageUploader/imageUploader')(uploaderConfig);

    function createImageName() {
        return new ObjectId();
    }

    this.removeImageFile = function (fileName, folderName, callback) {
        imageUploader.removeImage(fileName, folderName, callback);
    };

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
                imageUploader.uploadImage(imageString, imageName, CONSTANTS.BUCKETS.AVATAR, function (err) {

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

                if (!imageName){
                    imageName = createImageName();
                }

                resultUser.update({$set: {avatar: imageName}}, function(err){

                    if (err){
                        return next(err);
                    }

                    imageUploader.uploadImage(imageString, imageName, CONSTANTS.BUCKETS.AVATAR, function (err) {

                        if (err) {
                            return next(err);
                        }
                        res.status(200).send({success: 'Image upload successfully'});

                    });

                });
            }
        });
    };

    this.getAvatarUrl = function (req, res, next) {
        var uId = req.params.id || req.session.uId;
        var avatarName;
        var url = '';

        Image.findOne({user: uId}, function (err, resultModel) {

            if (err) {
                return next(err);
            }

            if (!resultModel){
                avatarName = '';
            } else {
                avatarName = resultModel.get('avatar');
            }

            if (!avatarName){
                return next(badRequests.NotFound({message: 'Avatar not found'}));
            }

            url = imageUploader.getImageUrl(avatarName, CONSTANTS.BUCKETS.AVATAR) + '.png';
            res.status(200).send({'url': url});

        });
    };

    this.removeAvatar = function (req, res, next) {
        var userId = req.session.uId;
        var avatarName;

        Image.findOne({user: userId}, function (err, imageModel) {
            if (err) {
                return next(err);
            }

            avatarName = imageModel.get('avatar');

            if (!avatarName.length) {
                return res.status(200).send('There is no user avatar');
            }

            self.removeImageFile(avatarName, CONSTANTS.BUCKETS.AVATAR, function (err) {
                if (err) {
                    return next(err);
                }

                imageModel.avatar = ''; //add default imageName maybe

                imageModel.save(function (err) {
                    if (err) {
                        return next(err);
                    }
                    res.status(200).send({success: 'Avatar removed successfully'});
                });
            });
        });
    };

    this.uploadPhotoToGallery = function (req, res, next) {
        var uId = req.session.uId;
        var imageString = req.body.image;
        var imageModel;
        var imageName = createImageName();

        Image.findOne({user: uId}, function (err, resultModel) {

            if (err) {
                return next(err);
            }

            if (!resultModel) {

                imageModel = new Image({user: uId, gallery: [imageName]});
                imageModel
                    .save(function (err) {

                        if (err) {
                            return next(err);
                        }

                        imageUploader.uploadImage(imageString, imageName, CONSTANTS.BUCKETS.GALLERY, function (err){

                            if (err) {
                                return next(err);
                            }

                            res.status(200).send({success: 'Gallery image upload successfully'});

                        });

                    });

            } else {

                resultModel
                    .update({$addToSet: {gallery: imageName}}, function(err){

                        if (err){
                            return next(err);
                        }

                        imageUploader.uploadImage(imageString, imageName, CONSTANTS.BUCKETS.GALLERY, function (err){

                            if (err) {
                                return next(err);
                            }

                            res.status(200).send({success: 'Gallery image upload successfully'});

                        });

                    });

            }

        });

    };

    this.removeImageFromGallery = function (req, res, next) {
        var userId = req.session.uId;
        var options = req.body;
        var photoNames;
        var imageName;

        if (!options || !options.image) {
            return next(badRequests.NotEnParams({message: 'image required'}));
        }

        imageName = options.image;

        Image.findOne({user: userId}, function (err, imageModel) {
            var index;

            if (err) {
                return next(err);
            }

            if (!imageModel) {
                return next(badRequests.NotFound({message: 'There is no gallery for current user'}));
            }

            photoNames = imageModel.get('gallery');
            index = photoNames.indexOf(imageName);

            if (index === -1){
                return next(badRequests.NotFound({message: 'User havent photo with such file name'}));
            }

            if (!photoNames.length) {
                return next(badRequests.NotFound({message: 'There is no photo in user gallery'}));
            }

            self.removeImageFile(imageName, CONSTANTS.BUCKETS.GALLERY, function (err) {
                if (err) {
                    return next(err);
                }

                photoNames.splice(index, 1);
                imageModel.gallery = photoNames;

                imageModel.save(function (err) {
                    if (err) {
                        return next(err);
                    }
                    res.status(200).send({success: 'Image from gallery removed successfully'});
                });
            });
        });
    };

    this.getPhotoUrls = function (req, res, next) {
        var uId = req.session.uId;
        var photoNames;
        var urls = [];

        Image.findOne({user: uId}, function (err, imageModel) {
            var len;

            if (err) {
                return next(err);
            }

            if (!imageModel) {
                return res.status(200).send({'urls': []});
            }

            photoNames = imageModel.get('gallery');
            len = photoNames.length;

            if (!len){
                return res.status(200).send({'urls': []});
            }

            for (var i = 0; i < len; i++) {
                urls.push(imageUploader.getImageUrl(photoNames[i], CONSTANTS.BUCKETS.GALLERY) + '.png');
            }

            res.status(200).send({'urls': urls});

        });
    };


};

module.exports = imageHandler;