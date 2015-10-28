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

    'use strict';

    var Image = db.model('Image');
    var User = db.model('User');
    var self = this;

    var imageUploader = require('../helpers/imageUploader/imageUploader')(uploaderConfig);

    function createImageName() {
        return (new ObjectId()).toString();
    }

    this.computeUrl = function (imageName, bucket) {
        return imageUploader.getImageUrl(imageName, bucket) + '.png';
    };

    this.removeImageFile = function (fileName, folderName, callback) {

        imageUploader.removeImage(fileName, folderName, function (err) {
            if (err) {
                return callback(new Error('Can\'t remove file, reason: ' + err));
            }

            callback(null);
        });
    };

    this.uploadAvatar = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/image/avatar`__
         *
         * This __method__ allows upload _User_ avatar
         *
         * @example Request example:
         *         146.148.120.34:8859/image/avatar
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
        var body = req.body;
        var imageString;
        var imageName;

        if (!body || !body.image) {
            return next(badRequests.NotEnParams({reqParams: 'image'}));
        }

        imageString = body.image.toString();

        User
            .findOne({_id: uId})
            .populate({path: 'images', select: 'avatar gallery'})
            .exec(function (err, userModel) {
                if (err) {
                    return next(err);
                }

                if (!userModel || !userModel.images) {
                    return next(badRequests.DatabaseError());
                }

                imageName = createImageName();

                async.parallel([

                    function (cb) {
                        imageUploader.uploadImage(imageString, imageName, CONSTANTS.BUCKETS.IMAGES, cb);
                    },

                    function (cb) {
                        var imageId = userModel.images._id;

                        Image.findOneAndUpdate({_id: imageId}, {
                            $set: {
                                avatar: imageName,
                                user: ObjectId(uId)
                            }
                        }, function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                    },

                    function (cb) {
                        var oldAvatarName;
                        var galleryPhotoNames;

                        if (!userModel.images.avatar) {
                            return cb();
                        }
                        galleryPhotoNames = userModel.images.gallery;
                        oldAvatarName = userModel.images.avatar;

                        if (galleryPhotoNames.indexOf(oldAvatarName) !== -1){
                            return cb();
                        }

                        self.removeImageFile(oldAvatarName, CONSTANTS.BUCKETS.IMAGES, function (err) {
                            if (err) {
                                return cb(err);
                            }
                            cb();
                        });
                    }

                ], function (err) {
                    if (err) {
                        return next(err);
                    }

                    res.status(200).send({success: 'Image upload successfully'});
                });
            });
    };

    this.getAvatarUrl = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/image/avatar`__
         *
         * This __method__ allows get _User_ avatar
         *
         * @example Request example:
         *         146.148.120.34:8859/image/avatar
         *
         * @example Response example:
         *
         *   {
         *     "fileName": "55f91b11233e6ae311af1ca1",
         *     "url": "146.148.120.34:8859/uploads/development/images/55f91b11233e6ae311af1ca1.png"
         *   }
         *
         * @method getAvatarUrl
         * @instance
         */

        var uId = req.session.uId;
        var avatarName;
        var avatarUrl = '';

        Image.findOne({user: uId}, function (err, resultModel) {
            if (err) {
                return next(err);
            }

            if (resultModel) {
                avatarName = resultModel.get('avatar');
            }

            if (!avatarName) {
                return next(badRequests.NotFound({message: 'Avatar not found'}));
            }

            avatarUrl = self.computeUrl(avatarName, CONSTANTS.BUCKETS.IMAGES);

            res.status(200).send({
                'fileName': avatarName,
                'url': avatarUrl
            });

        });
    };

    this.removeAvatar = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/image/avatar`__
         *
         * This __method__ allows delete _User_ avatar
         *
         * @example Request example:
         *         146.148.120.34:8859/image/avatar
         *
         *
         * @method removeAvatar
         * @instance
         */

        var userId = req.session.uId;
        var avatarName;
        var gallery;

        Image.findOne({user: userId}, function (err, imageModel) {
            if (err) {
                return next(err);
            }

            if (!imageModel) {
                return next(badRequests.NotFound({message: 'Nothing to remove'}));
            }

            avatarName = imageModel.get('avatar');
            gallery = imageModel.get('gallery');

            if (!avatarName) {
                return res.status(200).send({success: 'There is no user avatar'});
            }

            imageModel.avatar = ''; //add default imageName maybe

            imageModel.save(function (err) {
                if (err) {
                    return next(err);
                }

                if (gallery.indexOf(avatarName) !== -1){

                    return res.status(200).send({success: 'Avatar removed successfully'});

                }

                self.removeImageFile(avatarName, CONSTANTS.BUCKETS.IMAGES, function (err) {
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
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/image/photo`__
         *
         * This __method__ allows upload _User_ photo to gallery
         *
         * @example Request example:
         *         146.148.120.34:8859/image/photo
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
        var body = req.body;
        var imageName = createImageName();
        var imageId;
        var imageString;

        if (!body || !body.image) {
            return next(badRequests.NotEnParams({reqParams: 'image'}));
        }

        imageString = body.image;

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

                        imageUploader.uploadImage(imageString, imageName, CONSTANTS.BUCKETS.IMAGES, function (err) {

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
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/image/photo`__
         *
         * This __method__ allows delete _User_ photo from gallery
         *
         * @example Request example:
         *         146.148.120.34:8859/image/photo
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
            return next(badRequests.NotEnParams({reqParams: 'image'}));
        }

        imageName = options.image;

        Image.findOne({user: userId}, function (err, imageModel) {
            var index;
            var avatarName;
            var removedPhotoName;

            if (err) {
                return next(err);
            }

            if (!imageModel) {
                return next(badRequests.NotFound({target: 'gallery for current user'}));
            }

            avatarName = imageModel.get('avatar');
            photoNames = imageModel.get('gallery');

            if (!photoNames.length) {
                return next(badRequests.NotFound({target: 'photos in user gallery'}));
            }

            index = photoNames.indexOf(imageName);

            if (index === -1) {
                return next(badRequests.NotFound({target: 'photo with such file name'}));
            }

            removedPhotoName = photoNames.splice(index, 1);
            imageModel.gallery = photoNames;

            imageModel.save(function (err) {
                if (err) {
                    return next(err);
                }

                if (removedPhotoName[0] === avatarName){
                    return res.status(200).send({success: 'Image from gallery removed successfully'});
                }

                self.removeImageFile(imageName, CONSTANTS.BUCKETS.IMAGES, function (err) {
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
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/image/photo`__
         *
         * This __method__ allows get _User's_ photos from gallery
         *
         * @example Request example:
         *         146.148.120.34:8859/image/photo
         *
         * @example Response example:
         *
         *   {
         *       "urls": [
         *                  {
         *                      "fileName":"55f8300013f2901e421b026a",
         *                      "url":"146.148.120.34:8859/uploads/development/images/55f8300013f2901e421b026a.png"
         *                  }
         *               ]
         *   }
         *
         * @method getPhotoUrls
         * @instance
         */

        var uId = req.params.id || req.session.uId;

        if (req.params.id && !CONSTANTS.REG_EXP.OBJECT_ID.test(uId)) {
            return next(badRequests.InvalidValue({value: uId, param: 'id'}));
        }

        Image.findOne({user: uId}, function (err, imageModel) {
            var galleryArray = [];
            var photoUrl;
            var photoNames;
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
                photoUrl = self.computeUrl(photoNames[i], CONSTANTS.BUCKETS.IMAGES);
                galleryArray.push({
                    'fileName': photoNames[i],
                    'url': photoUrl
                });
            }

            res.status(200).send({'urls': galleryArray});

        });
    };

    this.changeAvatarFromGallery = function (req, res, next) {

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/image/avatar`__
         *
         * This __method__ allows change _User's_ avatar with gallery photo
         *
         * @example Request example:
         *         146.148.120.34:8859/image/avatar
         *
         * @example Body example:
         *
         *   {
         *      "newAvatar":"55f8300013f2901e421b026a"
         *   }
         *
         * @method changeAvatarFromGallery
         * @instance
         */

        var body = req.body;
        var uId = req.session.uId;
        var newAvatar;
        var currentAvatar;

        if (!body.newAvatar) {
            return next(badRequests.NotEnParams({reqParams: 'newAvatar'}));
        }

        newAvatar = body.newAvatar;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(newAvatar)) {
            return next(badRequests.InvalidValue({value: newAvatar, param: 'newAvatar'}));
        }

        Image.findOne({user: uId}, function (err, imageModel) {
            var updateObj;

            if (err) {
                return next(err);
            }

            if (!imageModel) {
                return next(badRequests.DatabaseError());
            }

            currentAvatar = imageModel.get('avatar');

            if (currentAvatar){
                updateObj = {
                    $set: {avatar: newAvatar},
                    $addToSet: {gallery: currentAvatar}
                };
            } else {
                updateObj = {
                    $set: {avatar: newAvatar}
                };
            }

            imageModel
                .update(updateObj, function(err) {
                    if (err) {
                        return next(err);
                    }

                    res.status(200).send({success: 'Avatar changed successfully'});
                });
        });
    };

    this.getAvatarAndGallery = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `146.148.120.34:8859`__
         *
         * __URL: `/image/managePhotos`__
         *
         * This __method__ allows get _User's_ avatar and photos from gallery
         *
         * @example Request example:
         *         146.148.120.34:8859/image/managePhotos
         *
         * @example Response example:
         *
         *   {
         *      "avatar": {
         *          "fileName": "56094a45ef04ea9c1eca9005",
         *          "url": "146.148.120.34:8859/uploads/development/images/56094a45ef04ea9c1eca9005.png"
         *      },
         *      "gallery": [
         *          {
         *              "fileName": "5609348e9e7dae241fd45ae7",
         *              "url": "146.148.120.34:8859/uploads/development/images/5609348e9e7dae241fd45ae7.png"
         *          },
         *          {
         *              "fileName": "560a3b53c55d98e418a22af1",
         *              "url": "146.148.120.34:8859/uploads/development/images/560a3b53c55d98e418a22af1.png"
         *          },
         *          {
         *              "fileName": "560a3b98c55d98e418a22af2",
         *              "url": "146.148.120.34:8859/uploads/development/images/560a3b98c55d98e418a22af2.png"
         *          }
         *      ]
         *   }
         *
         * @method getAvatarAndGallery
         * @instance
         */

        var userId = req.session.uId;

        Image
            .findOne({user: ObjectId(userId)}, function (err, imageModel) {
                var avatarName = '';
                var avatarUrl = '';
                var galleryArray = [];

                if (err) {
                    return next(err);
                }

                if (!imageModel) {
                    return next(badRequests.NotFound({target: 'photos'}));
                }

                if (imageModel.avatar) {
                    avatarName = imageModel.get('avatar');
                    avatarUrl = self.computeUrl(avatarName, CONSTANTS.BUCKETS.IMAGES);
                }

                if (imageModel.gallery && imageModel.gallery.length) {

                    galleryArray = imageModel.gallery.map(function (photoName) {
                        var photoUrl = self.computeUrl(photoName, CONSTANTS.BUCKETS.IMAGES);

                        return {
                            fileName: photoName,
                            url: photoUrl
                        };
                    });
                }

                res.status(200).send(
                    {
                        avatar: {
                            fileName: avatarName,
                            url: avatarUrl
                        },
                        gallery: galleryArray
                    });

            });

    };

};

module.exports = imageHandler;