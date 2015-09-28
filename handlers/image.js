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
        return (new ObjectId()).toString();
    }

    this.removeImageFile = function (fileName, folderName, callback) {

        var fileNameSmall = fileName + '_small';

        async
            .parallel([

                async.apply(imageUploader.removeImage, fileName, folderName),
                async.apply(imageUploader.removeImage, fileNameSmall, folderName)

            ], function(err){
                if (err){
                    return callback(err);
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
         * __HOST: `http://134.249.164.53:8859`__
         *
         * __URL: `/image/avatar`__
         *
         * This __method__ allows upload _User_ avatar
         *
         * @example Request example:
         *         http://134.249.164.53:8859/image/avatar
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

        User
            .findOne({_id: uId})
            .populate({path: 'images', select: 'avatar'})
            .exec(function(err, userModel){
                if (err){
                    return next(err);
                }

                if(!userModel || !userModel.images){
                    return next(badRequests.DatabaseError());
                }

                imageName = createImageName();

                async.parallel([

                    function(cb){
                        async
                            .series([

                                function(callback){
                                    imageUploader.uploadImage(imageString, imageName, CONSTANTS.BUCKETS.IMAGES, callback);
                                },

                                function(callback){
                                    imageUploader.resizeImage(imageName, CONSTANTS.BUCKETS.IMAGES, CONSTANTS.IMAGE.AVATAR_PREV.WIDTH, callback);
                                }

                            ], function(err){
                                if (err){
                                    return cb(err);
                                }

                                cb();
                            });
                    },

                    function(cb){
                        var imageId = userModel.images._id;

                        Image.findOneAndUpdate({_id: imageId}, {$set: {avatar: imageName, user: ObjectId(uId)}}, function (err) {
                            if (err) {
                                return cb(err);
                            }

                            cb();
                        });
                    },

                    function(cb){
                        var oldAvatarName;

                        if (!userModel.images.avatar) {
                            return cb();
                        }
                        oldAvatarName = userModel.images.avatar;

                        self.removeImageFile(oldAvatarName, CONSTANTS.BUCKETS.IMAGES, function(err){
                            if (err){
                                return cb(err);
                            }
                            cb();
                        });
                    }

                ], function(err){
                    if (err){
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
         * __HOST: `http://134.249.164.53:8859`__
         *
         * __URL: `/image/avatar/small?`__
         *
         * This __method__ allows get _User_ avatar
         *
         * @example Request example:
         *         http://134.249.164.53:8859/image/avatar
         *  OR
         *         http://134.249.164.53:8859/image/avatar/small
         *
         * @example Response example:
         *
         *   {
         *     "url": "http://134.249.164.53:8859/uploads/development/avatar/55f91b11233e6ae311af1ca1.png"
         *   }
         *  OR
         *   {
         *     "url": "http://134.249.164.53:8859/uploads/development/avatar/55f91b11233e6ae311af1ca1_small.png"
         *   }
         *
         * @method getAvatarUrl
         * @instance
         */

        var uId = req.session.uId;
        var avatarName;
        var small;
        var url = '';

        if (req.originalUrl === '/image/avatar/small') {
            small = true;
        }

        Image.findOne({user: uId}, function (err, resultModel) {

            if (err) {
                return next(err);
            }

            if (resultModel) {
                avatarName = resultModel.get('avatar');

                if (small) {
                    avatarName += '_small';
                }
            }

            if (!avatarName) {
                return next(badRequests.NotFound({message: 'Avatar not found'}));
            }

            url = self.computeUrl(avatarName, CONSTANTS.BUCKETS.IMAGES);
            res.status(200).send({'url': url});

        });
    };

    this.removeAvatar = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://134.249.164.53:8859`__
         *
         * __URL: `/image/avatar`__
         *
         * This __method__ allows delete _User_ avatar
         *
         * @example Request example:
         *         http://134.249.164.53:8859/image/avatar
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
                return res.status(200).send({success: 'There is no user avatar'});
            }

            self.removeImageFile(avatarName, CONSTANTS.BUCKETS.IMAGES, function (err) {

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
         * __HOST: `http://134.249.164.53:8859`__
         *
         * __URL: `/image/photo`__
         *
         * This __method__ allows upload _User_ photo to gallery
         *
         * @example Request example:
         *         http://134.249.164.53:8859/image/photo
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

                        async
                            .series([
                                function(cb){
                                    imageUploader.uploadImage(imageString, imageName, CONSTANTS.BUCKETS.IMAGES, cb);
                                },
                                function(cb){
                                    imageUploader.resizeImage(imageName, CONSTANTS.BUCKETS.IMAGES, CONSTANTS.IMAGE.GALLERY_PREV.WIDTH, cb);
                                }
                            ], function(err){

                                if (err){
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
         * __HOST: `http://134.249.164.53:8859`__
         *
         * __URL: `/image/photo`__
         *
         * This __method__ allows delete _User_ photo from gallery
         *
         * @example Request example:
         *         http://134.249.164.53:8859/image/photo
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

        if (imageName.substr(-5) === 'small'){
            imageName = imageName.substr(0, imageName.length - 6);
        }

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

            self.removeImageFile(imageName, CONSTANTS.BUCKETS.IMAGES, function (err) {
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
         * __HOST: `http://134.249.164.53:8859`__
         *
         * __URL: `/image/photo`__
         *
         * This __method__ allows get _User's_ photos from gallery
         *
         * @example Request example:
         *         http://134.249.164.53:8859/image/photo
         *
         * @example Response example:
         *
         *   {
         *       "urls": [
         *                  "http://134.249.164.53:8859/uploads/development/gallery/55f8300013f2901e421b026a_small.png"
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
                var smallPhotoName = photoNames[i] + '_small';

                urls.push(self.computeUrl(smallPhotoName, CONSTANTS.BUCKETS.IMAGES));
            }

            res.status(200).send({'urls': urls});

        });
    };

    this.computeUrl = function(imageName, bucket){
        return imageUploader.getImageUrl(imageName, bucket) + '.png';
    };

    this.changeAvatarFromGallery = function(req, res, next){

        var body = req.body;
        var uId = req.session.uId;
        var currentAvatar = '';
        var gallery;
        var index;
        var newAvatar;

        if (!body.newAvatar){
            return badRequests.NotEnParams({reqParams: 'newAvatar'});
        }

        newAvatar = body.newAvatar;

        Image.findOne({user: uId}, function(err, imageModel){

            if (err){
                return next(err);
            }

            if (!imageModel){

                return badRequests.DatabaseError();

            }

            if (imageModel && imageModel.avatar){
                currentAvatar = imageModel.get('avatar');
            }

            gallery = imageModel.get('gallery');

            index = gallery.indexOf(newAvatar);

            gallery.splice(index, 1);

            gallery.push(currentAvatar);

            Image.update({user: uId}, {$set: {avatar: newAvatar, gallery: gallery}}, function(err){
                if(err){
                    return next(err);
                }

               res.status(200).send({success: 'Avatar changed successfully'});
            });


        });


    };

    this.testResizeImage = function(req,res,next){
        var imageName = '5602af2ff9e06a563bb6d207';
        //var filePath = 'public/uploads/development/avatar/5602b09a0986ce600b74f03f.png';

        imageUploader.resizeImage(imageName, CONSTANTS.BUCKETS.IMAGES, 300, function(err){
            if (err){
                return next(err);
            }

            res.status(200).send({success: 'Image upload successfully'});
        });

    };
};

module.exports = imageHandler;