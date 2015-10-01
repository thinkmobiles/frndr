module.exports = {
    AGE: {
        MIN_AGE: 0,
        MAX_AGE: 200
    },
    REL_STATUSES: {
        SINGLE: 'single',
        COUPLE: 'couple',
        FAMILY: 'family',
        SINGLE_WITH_BABY: 'singleWithBaby'
    },
    SEXUAL: {
        STRAIGHT: 'straight',
        LESBIAN: 'lesbian',
        BISEXUAL: 'bisexual',
        ANY: 'any'
    },
    BUCKETS:{
        IMAGES:'images'
    },
    SEARCH_REL_STATUSES: {
        SINGLE_FEMALE: 'Single Female',
        SINGLE_MALE: 'Single Male',
        COUPLE: 'Couple',
        FAMILY: 'Family',
        MALE_WITH_BABY: 'Single Father',
        FEMALE_WITH_BABY: 'Single Mother'
    },
    LIMIT: {
        MESSAGES: 5,
        FRIENDS: 8
    },
    IMAGE: {
        AVATAR_PREV: {
            WIDTH: 100,
            HEIGHT: 100
        },
        GALLERY_PREV: {
            WIDTH: 250,
            HEIGHT: 250
        }
    },
    REG_EXP:{
        OBJECT_ID: new RegExp('(^[0-9a-fA-F]{24}$)'),
        BASE_64: new RegExp('^(data:image\/png;base64, )((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$')
    }
};
