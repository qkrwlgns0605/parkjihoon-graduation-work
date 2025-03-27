const bcrypt = require('bcrypt');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const rounds = 10;
        const salt = await bcrypt.genSalt(rounds);

        return await queryInterface.bulkInsert('Pdf', [
            {
                id: 1,
                original_name: "sample1.pdf",
                filename: "sample1.pdf",
                subject_id: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 2,
                original_name: "sample2.pdf",
                filename: "sample2.pdf",
                subject_id: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 3,
                original_name: "sample3.pdf",
                filename: "sample3.pdf",
                subject_id: 2,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        ])
    },

    down: async (queryInterface, Sequelize) => {
        return await queryInterface.bulkDelete('Pdf', null);
    }
};
