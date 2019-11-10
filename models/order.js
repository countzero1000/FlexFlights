const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const orderSchema = new mongoose.Schema({

    _id : Schema.Types.ObjectId,
    startDate : String,
    endDate: String,
    origin : String,
    destination: String,
    user :Schema.Types.ObjectId,
})



module.exports = mongoose.model('order',orderSchema);