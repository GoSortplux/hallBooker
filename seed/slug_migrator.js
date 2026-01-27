import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Hall } from '../models/hall.model.js';
import connectDB from '../config/db.js';

dotenv.config();

async function migrate() {
  try {
    await connectDB();

    const halls = await Hall.find({
      $or: [
        { slug: { $exists: false } },
        { slug: '' },
        { slug: null }
      ]
    });

    console.log(`Found ${halls.length} halls that need slugs.`);

    for (const hall of halls) {
      // Triggering save will run the pre-save hook we added to the model
      // We set a dummy field or just mark name as modified to be sure
      hall.markModified('name');
      // Bypass validation to avoid errors with legacy "incomplete" data
      await hall.save({ validateBeforeSave: false });
      console.log(`Generated slug for hall "${hall.name}" (ID: ${hall._id}): ${hall.slug}`);
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

migrate();
