const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

async function cleanDatabase() {
    try {
        const db = mongoose.connection.db;

        console.log('🗑️  Starting database cleanup...\n');

        // List all collections
        const collections = await db.listCollections().toArray();
        console.log(`Found ${collections.length} collections:\n`);

        // Drop each collection
        for (const collection of collections) {
            const collectionName = collection.name;
            console.log(`  Dropping: ${collectionName}...`);
            await db.collection(collectionName).drop();
            console.log(`  ✅ Dropped: ${collectionName}`);
        }

        console.log('\n✅ Database cleaned successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Restart the backend servers (mc_backend_app and mc_admin_backend)');
        console.log('   2. Run: node create_admin.js (in mc_admin_backend)');
        console.log('   3. Test registration and login flows');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error cleaning database:', error);
        process.exit(1);
    }
}

// Wait for connection to be ready
mongoose.connection.once('open', () => {
    cleanDatabase();
});
