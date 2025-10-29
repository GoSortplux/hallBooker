import { Router } from 'express';
import { getCountries, getStates, getLocalGovernments } from '../controllers/location.controller.js';

const router = Router();

router.get('/countries', getCountries);
router.get('/states/:countryId', getStates);
router.get('/lgas/:stateId', getLocalGovernments);

export default router;
