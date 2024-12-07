const mongoose = require('mongoose');

// Check if the model already exists before defining it
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        minlength: 5 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        validate: {
            validator: function(v) {
                return /@/.test(v); 
            },
            message: props => `${props.value} is not a valid email!`
        }
    },
    password: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return v.length >= 8; 
            },
            message: props => `Password should be at least 8 characters long!`
        }
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    profileImage: {
        type: String,
        default: 'default-profile.png'
    }
}));

module.exports = User;
