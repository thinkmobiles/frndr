var async = require('async');
var badRequests = require('../helpers/badRequests');
var mongoose = require('mongoose');


var LikesHandler = function (db) {
    var Like = db.model('Like');
    var User = db.model('User');
    var ObjectId = mongoose.Types.ObjectId;

    this.likeUserById = function (req, res, next) {
        var userId = req.session.uId;
        var likedUserId = req.params.id;

        if (!likedUserId) {
            return next(badRequests.NotEnParams({message: 'likeId'}));
        }

        async.waterfall([

                //create or update Like model of user with userId
                function (cb) {
                    var likesArray = [];

                    Like
                        .findOne({user: ObjectId(userId)}, function (err, likeModel) {
                            if (err) {
                                return next(err);
                            }

                            if (!likeModel) {
                                likesArray.push(likedUserId);

                                likeModel = new Like({
                                    user: ObjectId(userId),
                                    likes: likesArray,
                                    dislikes: []
                                });

                                return cb(null, likeModel);
                            }

                            if (likeModel.likes.indexOf(likedUserId) !== -1) {
                                return cb(null, null);
                            }

                            likeModel.likes.push(likedUserId);

                            cb(null, likeModel);
                        })
                },

                //save likeModel of previous user
                function (likeModel, cb) {
                    if (!likeModel) {
                        return cb();
                    }

                    likeModel
                        .save(function (err) {
                            if (err) {
                                return next(err);
                            }
                            cb();
                        })
                },

                //try to find Like model of user with likedUserId and decide add to friends or not
                function (cb) {
                    Like
                        .findOne({user: ObjectId(likedUserId)}, function (err, likeModel) {
                            if (err) {
                                return next(err);
                            }

                            if (!likeModel) {
                                return cb(null, null);
                            }

                            if (likeModel.likes.indexOf(userId) === -1) {
                                return cb(null, null);
                            }

                            //need add to friends
                            cb(null, true);

                        })
                },

                //add to friends
                function (addToFriend, cb) {
                    if (!addToFriend) {
                        return cb();
                    }

                    User
                        .findOneAndUpdate({_id: ObjectId(userId)}, {$addToSet: {friends: likedUserId}},
                        function (err) {
                            if (err) {
                                return next(err);
                            }

                            User
                                .findOneAndUpdate({_id: ObjectId(likedUserId)}, {$addToSet: {friends: userId}},
                                function (err) {
                                    if (err) {
                                        return next(err);
                                    }

                                    cb();
                                })
                        })
                }
            ],
            function (err) {
                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'User likes successfully'});

            });
    };

    this.dislikesUserById = function(req, res, next){
        var uId = req.session.uId;
        var dislikeId = req.params.id;
        var likeModel;

        Like
            .findOne({user: uId})
            .exec(function(err, resultModel){
                if (err){
                    return next(err);
                }

                if (!resultModel){

                    likeModel = new Like({user: uId, dislikes:[dislikeId]});

                    likeModel
                        .save(function(err){

                            if (err){
                                return next(err);
                            }

                            res.status(200).send({success: 'User dislikes successfully'});

                        });

                } else {

                    resultModel.update({$addToSet: {dislikes: dislikeId}}, function(err){

                        if (err){
                            return next(err);
                        }

                        res.status(200).send({success: 'User dislikes successfully'});

                    });

                }


            });
    }
};

module.exports = LikesHandler;
