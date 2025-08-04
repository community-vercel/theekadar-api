const express = require('express');
const router = express.Router();
const City = require('../models/city'); // Assuming you have a City model defined

// POST endpoint to add cities
router.post('/addcities', async (req, res) => {
    try {
        const cities = req.body;
        
        // Validate input
        if (!Array.isArray(cities)) {
            return res.status(400).json({ error: 'Input must be an array of cities' });
        }

        // Insert cities into database
        const insertedCities = await City.insertMany(cities);
        
        res.status(201).json({
            message: 'Cities added successfully',
            count: insertedCities.length,
            data: insertedCities
        });
    } catch (error) {
        res.status(500).json({ error: 'Error adding cities: ' + error.message });
    }
});

// GET endpoint to fetch all cities
router.get('/getcities', async (req, res) => {
    try {
        const cities = await City.find();
        res.status(200).json(cities);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching cities: ' + error.message });
    }
});

// NEW GET endpoint to fetch towns of a specific city by name
router.get('/cities/:cityName/towns', async (req, res) => {
    try {
        const cityName = req.params.cityName;
        
        // Find city by name (case-insensitive)
        const city = await City.findOne({ name: new RegExp('^' + cityName + '$', 'i') });
        
        if (!city) {
            return res.status(404).json({ error: 'City not found' });
        }

        res.status(200).json({
            city: city.name,
            towns: city.towns
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching towns: ' + error.message });
    }
});

module.exports = router;