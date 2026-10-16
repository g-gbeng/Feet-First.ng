const crypto = require("crypto");

/* Same style as the earlier orders, e.g. FFNG-1773768242213-482 */
module.exports = function generateOrderId() {
    return "FFNG-" + Date.now() + "-" + crypto.randomInt(100, 1000);
};
