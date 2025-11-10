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
 * /api/v1/locations/countries:
 *   get:
 *     summary: Get all countries
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: A list of countries.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/countries', getCountries);

/**
 * @swagger
 * /api/v1/locations/states/{countryId}:
 *   get:
 *     summary: Get all states for a given country
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: countryId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the country.
 *         example: "60d0fe4f5311236168a109cb"
 *     responses:
 *       200:
 *         description: A list of states for the specified country.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/states/:countryId', getStates);

/**
 * @swagger
 * /api/v1/locations/lgas/{stateId}:
 *   get:
 *     summary: Get all local governments for a given state
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: stateId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the state.
 *         example: "60d0fe4f5311236168a109cc"
 *     responses:
 *       200:
 *         description: A list of local governments for the specified state.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/lgas/:stateId', getLocalGovernments);

export default router;
