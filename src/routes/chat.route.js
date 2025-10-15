const express = require('express');
const chatController = require('../controllers/chat.controller');

const router = express.Router();

router.post('/incoming', chatController.handleIncoming);

router.use((req, res) => {
	res.status(501).json({ error: 'chat route not implemented' });
});

module.exports = router;
