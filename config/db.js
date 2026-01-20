import mongoose from 'mongoose';

const dropStaleVenueIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    for (const name of ['reviews', 'bookings', 'reservations', 'halls']) {
      if (collectionNames.includes(name)) {
        const col = db.collection(name);
        const indexes = await col.indexes();
        for (const index of indexes) {
          if (Object.keys(index.key).includes('venue')) {
            console.log(`Dropping stale index ${index.name} from ${name}`);
            await col.dropIndex(index.name).catch(e => console.error(`Failed to drop index ${index.name} from ${name}:`, e.message));
          }
        }
      }
    }
  } catch (error) {
    console.error("Error dropping stale indexes:", error.message);
  }
};

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}`);
    console.log(`\n MongoDB connected! DB HOST: ${connectionInstance.connection.host}`);

    // Drop unintended unique index on hall in reviews collection
    const reviewsCollection = connectionInstance.connection.db.collection('reviews');
    const indexes = await reviewsCollection.indexes();
    const unintendedIndex = indexes.find(index => index.name === 'hall_1_user_1' && index.unique);
    if (unintendedIndex) {
      await reviewsCollection.dropIndex('hall_1_user_1');
      console.log('Successfully dropped unintended unique index: hall_1_user_1');
    }

    // Automatically cleanup stale indexes from the venue-to-hall refactor
    await dropStaleVenueIndexes();
  } catch (error) {
    console.error("MONGODB connection FAILED ", error);
    process.exit(1);
  }
};

export default connectDB; 