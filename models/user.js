const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new mongoose.Schema({

    _id : Schema.Types.ObjectId,
    email : String,
    password : String, 
    phoneNumber: String

})



module.exports = mongoose.model('user',userSchema);