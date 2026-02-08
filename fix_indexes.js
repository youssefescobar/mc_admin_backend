// Script to fix duplicate key error by dropping old phoneNumber index
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

async function fixIndexes() {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Get all indexes
        const indexes = await usersCollection.indexes();
        console.log('Current indexes:', indexes.map(i => i.name));

        // Drop the old phoneNumber_1 index if it exists
        try {
            await usersCollection.dropIndex('phoneNumber_1');
            console.log('✅ Dropped old phoneNumber_1 index');
        } catch (err) {
            if (err.code === 27) {
                console.log('ℹ️  phoneNumber_1 index does not exist (already fixed)');
            } else {
                throw err;
            }
        }

        // Create new index with correct field name
        await usersCollection.createIndex({ phone_number: 1 }, { unique: true, sparse: true });
        console.log('✅ Created new phone_number index (sparse, unique)');

        console.log('\n✅ Index fix complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing indexes:', error);
        process.exit(1);
    }
}

fixIndexes();
