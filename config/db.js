import mongoose from 'mongoose';

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

  } catch (error) {
    console.error("MONGODB connection FAILED ", error);
    process.exit(1);
  }
};

export default connectDB; 