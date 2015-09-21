/**
 * @description Image management module
 * @module imageHandler
 *
 */

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
    var User = db.model('User');
    var self = this;

    var imageUploader = require('../helpers/imageUploader/imageUploader')(uploaderConfig);

    function createImageName() {
        return new ObjectId();
    }

    this.removeImageFile = function (fileName, folderName, callback) {
        imageUploader.removeImage(fileName, folderName, callback);
    };

    this.uploadAvatar = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/image/avatar`__
         *
         * This __method__ allows upload _User_ avatar
         *
         * @example Request example:
         *         http://192.168.88.250:8859/image/avatar
         *
         * @example Body example:
         *
         * {
         *      "image":"data:image/png;base64, /9j/4AAQSkZ..."
         * }
         *
         * @param {string} image - String image (__`base64`__)
         *
         * @method uploadAvatar
         * @instance
         */

        var uId = req.session.uId;
        var imageString = req.body.image;
        var imageName;

        var imageId;

        User
            .findOne({_id: uId}, function (err, resUser) {

                if (err) {
                    return next(err);
                }

                if (!resUser || !resUser.images) {
                    return next(badRequests.DatabaseError());
                }

                imageId = resUser.images;

                Image
                    .findOne({_id: imageId}, function (err, imageModel) {

                        if (err) {
                            return callback(err);
                        }

                        if (!imageModel.avatar) {
                            imageName = createImageName();
                        } else {
                            imageName = imageModel.get('avatar');
                        }

                        imageModel.update({$set: {avatar: imageName, user: ObjectId(uId)}}, function (err) {

                            if (err) {
                                return next(err);
                            }

                            imageUploader.uploadImage(imageString, imageName, CONSTANTS.BUCKETS.AVATAR, function (err) {

                                if (err) {
                                    return next(err);
                                }
                                res.status(200).send({success: 'Image upload successfully'});

                            });

                        });

                    });

            });
    };

    this.getAvatarUrl = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/image/avatar`__
         *
         * This __method__ allows get _User_ avatar
         *
         * @example Request example:
         *         http://192.168.88.250:8859/image/avatar
         *
         * @example Response example:
         *
         *   {
         *     "url": "http://192.168.88.250:8859/uploads/development/avatar/55f91b11233e6ae311af1ca1.png"
         *   }
         *
         * @method getAvatarUrl
         * @instance
         */

        var uId = req.params.id || req.session.uId;
        var avatarName;
        var url = '';

        Image.findOne({user: uId}, function (err, resultModel) {

            if (err) {
                return next(err);
            }

            if (!resultModel) {
                avatarName = '';
            } else {
                avatarName = resultModel.get('avatar');
            }

            if (!avatarName) {
                return next(badRequests.NotFound({message: 'Avatar not found'}));
            }

            url = imageUploader.getImageUrl(avatarName, CONSTANTS.BUCKETS.AVATAR) + '.png';
            res.status(200).send({'url': url});

        });
    };

    this.removeAvatar = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/image/avatar`__
         *
         * This __method__ allows delete _User_ avatar
         *
         * @example Request example:
         *         http://192.168.88.250:8859/image/avatar
         *
         *
         * @method removeAvatar
         * @instance
         */

        var userId = req.session.uId;
        var avatarName;

        Image.findOne({user: userId}, function (err, imageModel) {
            if (err) {
                return next(err);
            }

            if (!imageModel) {
                return next(badRequests.NotFound({message: 'Nothing to remove'}));
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

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/image/photo`__
         *
         * This __method__ allows upload _User_ photo to gallery
         *
         * @example Request example:
         *         http://192.168.88.250:8859/image/photo
         *
         * @example Body example:
         *
         * {
         *      "image":"data:image/png;base64, /9j/4AAQSkZ..."
         * }
         *
         * @param {string} image - String image (__`base64`__)
         *
         * @method uploadPhotoToGallery
         * @instance
         */

        var uId = req.session.uId;
        var imageString = req.body.image;
        var imageName = createImageName();
        var imageId;

        User
            .findOne({_id: uId}, function (err, resUser) {

                if (err) {
                    return next(err);
                }

                if (!resUser || !resUser.images) {
                    return next(badRequests.DatabaseError());
                }

                imageId = resUser.images;

                Image
                    .findOneAndUpdate({_id: imageId}, {
                        $addToSet: {gallery: imageName},
                        $set: {user: ObjectId(uId)}
                    }, function (err) {

                        if (err) {
                            return next(err);
                        }

                        imageUploader.uploadImage(imageString, imageName, CONSTANTS.BUCKETS.GALLERY, function (err) {

                            if (err) {
                                return next(err);
                            }

                            res.status(200).send({success: 'Gallery image upload successfully'});

                        });

                    });

            });


    };

    this.removeImageFromGallery = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/image/photo`__
         *
         * This __method__ allows delete _User_ photo from gallery
         *
         * @example Request example:
         *         http://192.168.88.250:8859/image/photo
         *
         * @example Body example:
         *
         *  {
         *      "image":"55f8301713f2901e421b026b"
         *  }
         *
         * @param {string} image - Image name
         *
         * @method removeImageFromGallery
         * @instance
         */

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

            if (index === -1) {
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

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://192.168.88.250:8859`__
         *
         * __URL: `/image/photo`__
         *
         * This __method__ allows get _User's_ photos from gallery
         *
         * @example Request example:
         *         http://192.168.88.250:8859/image/photo
         *
         * @example Response example:
         *
         *   {
         *       "urls": [
         *                  "http://192.168.88.250:8859/uploads/development/gallery/55f8300013f2901e421b026a.png"
         *               ]
         *   }
         *
         * @method getPhotoUrls
         * @instance
         */

        var uId = req.params.id || req.session.uId;
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

            if (!len) {
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