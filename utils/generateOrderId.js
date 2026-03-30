module.exports = function generateOrderId() {
  return "FFNG-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
};