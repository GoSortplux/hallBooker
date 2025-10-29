import { Router } from 'express';
import { getCountries, getStates, getLocalGovernments } from '../controllers/location.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Location data for countries, states, and local governments
 */

/**
 * @swagger
 * /locations/countries:
 *   get:
 *     summary: Get all countries
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: A list of countries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       iso2:
 *                         type: string
 */
router.get('/countries', getCountries);

/**
 * @swagger
 * /locations/states/{countryId}:
 *   get:
 *     summary: Get all states for a given country
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: countryId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the country
 *     responses:
 *       200:
 *         description: A list of states for the specified country
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       country:
 *                         type: string
 */
router.get('/states/:countryId', getStates);

/**
 * @swagger
 * /locations/lgas/{stateId}:
 *   get:
 *     summary: Get all local governments for a given state
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: stateId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the state
 *     responses:
 *       200:
 *         description: A list of local governments for the specified state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       state:
 *                         type: string
 */
router.get('/lgas/:stateId', getLocalGovernments);

export default router;
