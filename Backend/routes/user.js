const express = require('express');
const zod = require('zod');
const rootRouter = require('./index.js');
const { User } = require('../bd.js');

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config.js');
const { authMiddleware } = require('../middleware.js');

const userRouter = express.Router();

const signupBodySchema = zod.object({
    username: zod.string().email(),
    password: zod.string().min(8),
    firstName: zod.string().max(150),
    lastName: zod.string().max(150)
})

userRouter.post('/signup', async (req, res) => {
    const { success } = signupBodySchema.safeParse(req.body);
    if (!success) {
        return res.status(411).json({
            message: "Invalid inputs",
            send: req.body
        })
    }
    const existingUser = await User.findOne({ username: req.body.username });

    if (existingUser) {
        return res.status(411).json({
            message: "User Already Exist"
        })
    }
    const user = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName
    });
    user.password = await user.createHash(req.body.password);
    const userId = user._id;
    await user.save();
    const token = jwt.sign({ userId }, JWT_SECRET);

    res.json({
        message: "user created successfully",
        token: token,
        user: user
    })

})
const signinBodySchema = zod.object({
    username: zod.string().email(),
    password: zod.string()
})
userRouter.post('/signin', async (req, res) => {
    const { success } = await signinBodySchema.safeParse(req.body);
    if (!success) {
        return res.status(411).json({
            message: "Invalid Inputs"
        })
    }

    let user = await User.findOne({ username: req.body.username });
    if (!user) {
        return res.status(411).json({
            message: "Email not found"
        })
    }

    if (await user.checkPassword(req.body.password)) {
        const token = jwt.sign({
            userId: user._id
        }, JWT_SECRET);
        return res.json({
            token
        })
    }
    else {
        return res.status(411).json({
            message: "Wrong Password!"
        })
    }

})

const updateBodySchema = zod.object({
    password: zod.string().min(8).optional(),
    firstName: zod.string().max(150).optional(),
    lastName: zod.string().max(150).optional()
});
userRouter.put('/', authMiddleware, async (req, res) => {
    const { success } = updateBodySchema.safeParse(req.body);
    if (!success) {
        return res.status(411).json({
            message: "Invalid inputs"
        })
    }
    const user = await User.findOne({ _id: req.userId });
    if (!user) {
        return res.status(403).json({
            message: "User not found"
        })
    }
    await User.updateOne({ _id: req.userId }, req.body)
    res.json({
        message: "Updated successfully"
    })
})

userRouter.get('/bulk', authMiddleware, async (req, res) => {
    const filter = req.query.filter || "";

    const users = await User.find({
        $or: [
            { 'firstName': { $regex: filter, '$options': 'i' } },
            { 'lastName': { $regex: filter, '$options': 'i' } }
        ]
    })

    res.json({
        users: users.map((user) => {
            return ({
                "firstName": user.firstName,
                "lastName": user.lastName,
                "_id": user._id
            })
        })
    })
})

module.exports = userRouter;