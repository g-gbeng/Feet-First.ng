const mongoose = require("mongoose");

/* Small one-off flags, e.g. whether the starter email templates were added */
const settingSchema = new mongoose.Schema({
    _id: String,
    value: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.models.Setting || mongoose.model("Setting", settingSchema);
