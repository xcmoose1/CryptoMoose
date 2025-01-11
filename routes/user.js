import express from 'express';
const router = express.Router();

// User related routes
router.get('/profile', (req, res) => {
    res.json({ message: 'User profile endpoint - to be implemented' });
});

router.put('/settings', (req, res) => {
    res.json({ message: 'User settings endpoint - to be implemented' });
});

export default router;
