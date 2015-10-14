module.exports = {
    AGE: {
        MIN_AGE: 0,
        MAX_AGE: 200
    },
    SEX: {
        MALE: 'Male',
        FEMALE: 'Female'
    },
    REL_STATUSES: {
        SINGLE: 'Single',
        COUPLE: 'Couple',
        FAMILY: 'Family',
        SINGLE_WITH_BABY: 'Single With Baby'
    },
    SEXUAL: {
        STRAIGHT: 'Straight',
        LESBIAN: 'Lesbian',
        BISEXUAL: 'Bisexual',
        ANY: 'Any'
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
        MESSAGES: 15,
        FRIENDS: 8,
        FIND_USERS: 10
    },
    REG_EXP:{
        OBJECT_ID: new RegExp('(^[0-9a-fA-F]{24}$)')
    },
    CATEGORIES: {
        MESSAGE: 'newMessageCategory',
        FRIEND: 'newFriendCategory'
    }
};
