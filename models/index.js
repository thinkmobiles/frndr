
module.exports = function(db){
    "use strict";

    require('./user')(db);
    //require('./like')(db);
    require('./message')(db);
    require('./searchSettings')(db);
};