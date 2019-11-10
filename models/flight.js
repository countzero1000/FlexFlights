const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const flightSchema = new mongoose.Schema({

    _id : Schema.Types.ObjectId,
    date : String,
    origin : String,
    destination: String,
    price : Number,
    flightNumber : Number,
    duration : String,
    remainingSeats : Number

})



module.exports = mongoose.model('flight',flightSchema);