const bcrypt = require('bcrypt');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const rounds = 10;
        const salt = await bcrypt.genSalt(rounds);

        return await queryInterface.bulkInsert('Pdf', [
            {
                id: 1,
                original_name: "Introduction-to-Operating-Systems-1.pdf",
                filename: "Introduction-to-Operating-Systems-1.pdf",
                subject_id: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 2,
                original_name: "Introduction-to-Databases-1.pdf",
                filename: "Introduction-to-Databases-1.pdf",
                subject_id: 2,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 3,
                original_name: "Introduction-to-Databases-2.pdf",
                filename: "Introduction-to-Databases-2.pdf",
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
