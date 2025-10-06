import NodeGeocoder from 'node-geocoder';
import dotenv from 'dotenv';

dotenv.config();

const options = {
  provider: 'openstreetmap',
};

const geocoder = NodeGeocoder(options);

export default geocoder;