const bcrypt = require('bcrypt');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const rounds = 10;
        const salt = await bcrypt.genSalt(rounds);

        return await queryInterface.bulkInsert('Subject', [
            {
                id: 1,
                name: "운영체제",
                user_id: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 2,
                name: "데이터베이스",
                user_id: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 3,
                name: "네트워크",
                user_id: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        ])
    },

    down: async (queryInterface, Sequelize) => {
        return await queryInterface.bulkDelete('Subject', null);
    }
};
