const bcrypt = require('bcrypt');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const rounds = 10;
        const salt = await bcrypt.genSalt(rounds);

        return await queryInterface.bulkInsert('User', [
            {
                id: 1,
                user_id: 'jihoon',
                password: await bcrypt.hash('jihoon', salt),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 2,
                user_id: 'jihoon2',
                password: await bcrypt.hash('jihoon2', salt),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 3,
                user_id: 'j',
                password: await bcrypt.hash('j', salt),
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        ])
    },

    down: async (queryInterface, Sequelize) => {
        return await queryInterface.bulkDelete('User', null);
    }
};
