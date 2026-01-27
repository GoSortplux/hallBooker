import mongoose from 'mongoose';
import logger from '../utils/logger.js';

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
            logger.info(`Dropping stale index ${index.name} from ${name}`);
            await col.dropIndex(index.name).catch(e => logger.error(`Failed to drop index ${index.name} from ${name}: ${e.message}`));
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Error dropping stale indexes: ${error.message}`);
  }
};

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}`);
    logger.info(`MongoDB connected! DB HOST: ${connectionInstance.connection.host}`);

    // Drop unintended unique index on hall in reviews collection
    const reviewsCollection = connectionInstance.connection.db.collection('reviews');
    const indexes = await reviewsCollection.indexes();
    const unintendedIndex = indexes.find(index => index.name === 'hall_1_user_1' && index.unique);
    if (unintendedIndex) {
      await reviewsCollection.dropIndex('hall_1_user_1');
      logger.info('Successfully dropped unintended unique index: hall_1_user_1');
    }

    // Automatically cleanup stale indexes from the venue-to-hall refactor
    await dropStaleVenueIndexes();
  } catch (error) {
    logger.error(`MONGODB connection FAILED: ${error}`);
    process.exit(1);
  }
};

export default connectDB; 