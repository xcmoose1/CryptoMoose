import express from 'express';
import { getAllOpportunities, fetchIDOCalendar } from '../api/investment-opportunities.js';

const router = express.Router();

// Get all investment opportunities
router.get('/', async (req, res) => {
    try {
        const data = await getAllOpportunities();
        res.json(data);
    } catch (error) {
        console.error('Error fetching opportunities:', error);
        res.status(500).json({ error: 'Failed to fetch opportunities' });
    }
});

// Get IDO calendar data
router.get('/ido-calendar', async (req, res) => {
    try {
        const data = await fetchIDOCalendar();
        
        // Calculate stats
        const stats = {
            totalIdos: data.length,
            averageRoi: calculateAverageROI(data),
            successRate: calculateSuccessRate(data),
            totalRaised: calculateTotalRaised(data)
        };

        res.json({
            events: data,
            stats: stats
        });
    } catch (error) {
        console.error('Error fetching IDO calendar:', error);
        res.status(500).json({ error: 'Failed to fetch IDO calendar' });
    }
});

// Helper functions for stats calculation
function calculateAverageROI(data) {
    const completedProjects = data.filter(project => 
        project.status === 'completed' && project.roi
    );
    
    if (completedProjects.length === 0) return 0;
    
    const totalROI = completedProjects.reduce((sum, project) => sum + project.roi, 0);
    return (totalROI / completedProjects.length).toFixed(2);
}

function calculateSuccessRate(data) {
    const completedProjects = data.filter(project => 
        project.status === 'completed'
    );
    
    if (completedProjects.length === 0) return 0;
    
    const successfulProjects = completedProjects.filter(project => 
        project.roi && project.roi > 0
    );
    
    return ((successfulProjects.length / completedProjects.length) * 100).toFixed(2);
}

function calculateTotalRaised(data) {
    return data.reduce((sum, project) => {
        const raised = project.fundingStages?.reduce((stageSum, stage) => 
            stageSum + (stage.raised || 0), 0) || 0;
        return sum + raised;
    }, 0);
}

export default router;
