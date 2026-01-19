import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

const dropStaleIndexes = async () => {
  try {
    await connectDB();

    const db = mongoose.connection.db;
    const collection = db.collection('reviews');

    console.log('Fetching indexes for "reviews" collection...');
    const indexes = await collection.indexes();

    const staleIndexes = indexes.filter(index => {
      // Check if "venue" is a key in the index
      return Object.keys(index.key).includes('venue');
    });

    if (staleIndexes.length === 0) {
      console.log('No stale "venue" indexes found.');
    } else {
      for (const index of staleIndexes) {
        console.log(`Dropping index: ${index.name}`);
        await collection.dropIndex(index.name);
        console.log(`Successfully dropped index: ${index.name}`);
      }
    }

    console.log('Index cleanup complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during index cleanup:', error);
    process.exit(1);
  }
};

dropStaleIndexes();
