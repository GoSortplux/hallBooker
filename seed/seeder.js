import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import { Country } from '../models/country.model.js';
import { State } from '../models/state.model.js';
import { LocalGovernment } from '../models/localGovernment.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const importData = async () => {
  try {
    await connectDB();

    await Country.deleteMany();
    await State.deleteMany();
    await LocalGovernment.deleteMany();

    const locationData = JSON.parse(fs.readFileSync(path.join(__dirname, 'locations.json'), 'utf-8'));

    const country = await Country.create({ name: locationData.name, iso2: locationData.iso2 });

    for (const state of locationData.states) {
      const createdState = await State.create({ name: state.name, country: country._id });
      for (const lga of state.lgas) {
        await LocalGovernment.create({ name: lga.name, state: createdState._id });
      }
    }

    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await connectDB();

    await Country.deleteMany();
    await State.deleteMany();
    await LocalGovernment.deleteMany();

    console.log('Data Destroyed!');
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
