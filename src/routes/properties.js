// src/routes/properties.js
const express = require('express');
const router = express.Router();
const propertiesController = require('../controllers/propertiesController');

// Properties Routes
router.get('/', propertiesController.listProperties);
router.get('/new', propertiesController.newPropertyForm);
router.post('/', propertiesController.createProperty);
router.get('/:id', propertiesController.viewProperty);
router.get('/:id/edit', propertiesController.editPropertyForm);
router.post('/:id/edit', propertiesController.updateProperty);
router.post('/:id/delete', propertiesController.deleteProperty);

// Rooms Routes (nested under properties)
router.get('/:id/rooms/new', propertiesController.newRoomForm);
router.post('/:id/rooms', propertiesController.createRoom);
router.get('/:id/rooms/:roomId/edit', propertiesController.editRoomForm);
router.post('/:id/rooms/:roomId/edit', propertiesController.updateRoom);
router.post('/:id/rooms/:roomId/delete', propertiesController.deleteRoom);

module.exports = router;