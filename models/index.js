
module.exports = function(db){
    "use strict";

    require('./user')(db);
    require('./like')(db);
    require('./image')(db);
    require('./message')(db);
    require('./searchSettings')(db);
    require('./pushTokens')(db);
    require('./contact')(db);
};