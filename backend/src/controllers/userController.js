const User = require("../models/userModel");

const userController = {
    getBorrowers: async (req, res, next) => {
        try {
            const users = await User.find({}, "name email role").sort({ name: 1 });
            const data = users.map((u) => ({
                id: u._id.toString(),
                name: u.name,
                email: u.email,
                role: u.role
            }));

            return res.status(200).json({ data });
        } catch (err) {
            return next(err);
        }
    }
};

module.exports = userController;
