const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

mongoose.connect('mongodb+srv://whaleInSpace:aHX18KLJaNmCnQrf@0x.bxbegwj.mongodb.net/Wallet-App');

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 30
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30
    },
    });

userSchema.methods.createHash = async (plainTextPassword) => {
    const saltRounds = 10;

    const salt = await bcrypt.genSalt(saltRounds);
    return await bcrypt.hash(plainTextPassword, salt);

}
userSchema.methods.checkPassword = async function (userPassword) {
    return await bcrypt.compare(userPassword, this.password);
}


const accountSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        unique: true,
        required: true
    },
    balance: {
        type: Number,
        required: true
    },
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transactions' }]

})

const transactionsSchema = mongoose.Schema({
    senderAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: 'true',
        index: 'true'

    },
    receiverAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: 'true',
        index: 'true'
    },
    amount: {
        type: Number,
        require: 'true'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    description: {
        type: String
    }
})

const Account = mongoose.model('Account', accountSchema);

const User = mongoose.model("Users", userSchema);

const Transaction = mongoose.model("Transactions", transactionsSchema);

module.exports = {
    User,
    Account,
    Transaction
}

