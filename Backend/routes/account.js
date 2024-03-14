const express = require('express');
const mongoose = require('mongoose')
const { authMiddleware } = require('../middleware');
const { Account, Transaction } = require('../bd');

const accountRouter = express.Router();

accountRouter.get('/balance', authMiddleware, async (req, res) => {
    const account = await Account.findOne({
        userId: req.userId
    });
    if (!account) {
        return res.status(400).json({
            message: "Account not found"
        })
    }
    res.json({
        balance: account.balance
    })
})

accountRouter.post('/transfer', authMiddleware, async (req, res) => {
    const session = await mongoose.startSession();

    session.startTransaction();
    try {
        const { to, amount } = req.body;
        if (to === req.userId) {
            throw new Error("Can not send money to self");
        }
        const senderAccount = await Account.findOne({
            userId: req.userId
        }).session(session);
        const receiverAccount = await Account.findOne({
            userId: to
        }).session(session);

        if (!senderAccount || !receiverAccount) {
            throw new Error("Account not found")
        }
        if (amount > senderAccount.balance) {
            throw new Error("Insufficient balance")
        }
        const transaction = await Transaction.create([{
            senderAccountId: senderAccount._id,
            receiverAccountId: receiverAccount._id,
            amount: amount,
            date: Date.now()
        }], {
            session: session
        }
        )

        await Account.updateOne({ userId: req.userId }, { $inc: { balance: -amount }, $push: { transactions: transaction[0]._id } }).session(session);
        await Account.updateOne({ userId: to }, { $inc: { balance: amount }, $push: { transactions: transaction[0]._id } }).session(session);

        await session.commitTransaction();
        res.json({
            message: "Transfer successful"
        })
    }
    catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        res.status(400).json({ message: error.message || "An error occurred during transaction" });
    }
    finally {
        if (session) {
            session.endSession();
        }
    }


})

accountRouter.get('/transactions', authMiddleware, async (req, res) => {
    const account = await Account.findOne({ userId: req.userId });
    if (!account) {
        return res.status(404).json({ error: 'Account not found' });
    }
    await Account.populate([account], { path: 'transactions' });

    
    let  transactions = account.transactions;
    await Account.populate(transactions, [
        { path: 'senderAccountId', select: 'userId', match: { userId: { $ne: req.userId } } }, // Populate senderAccountId if userId is not the user's userId
        { path: 'receiverAccountId', select: 'userId', match: { userId: { $ne: req.userId } } }, {
            path: 'senderAccountId',
            populate: { path: 'userId', select: ['firstName', 'lastName','avatar'] }
        },
        {
            path: 'receiverAccountId',
            populate: { path: 'userId', select: ['firstName', 'lastName', 'avatar'] }
        } // Populate receiverAccountId if userId is not the user's userId
    ]);
    transactions = transactions.map(transaction =>{
        console.log(transaction)
        let type ;
        let accountInfo ={};
        if (transaction.senderAccountId == null){
            type = "debit"
            accountInfo ={
                "accountId" : transaction.receiverAccountId._id,
                "userInfo" : transaction.receiverAccountId.userId
            }
        }
        else if(transaction.receiverAccountId == null){
            type = "credit"
            accountInfo = {
                "accountId": transaction.senderAccountId._id,
                "userInfo": transaction.senderAccountId.userId
            }
        }
        
        return {
            transactionId : transaction._id,
            type :type,
            accountInfo : accountInfo,
            time :transaction.timestamp,
            amount :transaction.amount
        }

    })
    res.json({
        transactions
    })
})

module.exports = accountRouter
