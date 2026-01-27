import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Hall } from './models/hall.model.js';
import connectDB from './config/db.js';

dotenv.config();

async function testSlug() {
  await connectDB();

  try {
    const ownerId = new mongoose.Types.ObjectId();
    const countryId = new mongoose.Types.ObjectId();
    const stateId = new mongoose.Types.ObjectId();
    const lgaId = new mongoose.Types.ObjectId();

    // Create a hall
    const hall1 = await Hall.create({
      name: 'Aduda Hall',
      owner: ownerId,
      country: countryId,
      state: stateId,
      localGovernment: lgaId,
      location: 'Test Location',
      capacity: 100,
      description: 'Test Description',
      pricing: { dailyRate: 1000 }
    });
    console.log('Hall 1 Slug:', hall1.slug);

    // Create another hall with same name
    const hall2 = await Hall.create({
      name: 'Aduda Hall',
      owner: ownerId,
      country: countryId,
      state: stateId,
      localGovernment: lgaId,
      location: 'Test Location 2',
      capacity: 200,
      description: 'Test Description 2',
      pricing: { dailyRate: 2000 }
    });
    console.log('Hall 2 Slug:', hall2.slug);

    // Update name
    hall1.name = 'Aduda Hall Premium';
    await hall1.save();
    console.log('Hall 1 Updated Slug:', hall1.slug);

    // Clean up
    await Hall.deleteOne({ _id: hall1._id });
    await Hall.deleteOne({ _id: hall2._id });

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testSlug();
