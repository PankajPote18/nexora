// One-off script: creates an admin User row if one doesn't already exist.
// Needed because POST /api/auth/register always creates role:'user', and
// there is no other way to get an admin JWT (see src/pages/admin/AdminLogin.jsx).
// Usage: node create-admin.js <email> <password> [name]
const bcrypt = require('bcrypt');
const { sequelize, User } = require('./models');

const run = async () => {
    const [, , email, password, name] = process.argv;
    if (!email || !password) {
        console.error('Usage: node create-admin.js <email> <password> [name]');
        process.exit(1);
    }

    await sequelize.authenticate();

    const existing = await User.findOne({ where: { email } });
    if (existing) {
        if (existing.role !== 'admin') {
            await existing.update({ role: 'admin' });
            console.log(`Existing user ${email} promoted to admin.`);
        } else {
            console.log(`User ${email} already exists and is already an admin. No changes made.`);
        }
        process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
        name: name || 'Admin',
        email,
        password: hashedPassword,
        role: 'admin',
    });

    console.log(`Admin user created: ${email}`);
    process.exit(0);
};

run().catch((err) => {
    console.error('Failed to create admin user:', err);
    process.exit(1);
});
