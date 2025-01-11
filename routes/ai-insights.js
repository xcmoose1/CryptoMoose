import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

router.post('/volume-profile-analysis', async (req, res) => {
    try {
        const { volumeData } = req.body;
        
        const prompt = `As a cryptocurrency trading expert, analyze this volume profile data across different timeframes:

${Object.entries(volumeData).map(([timeframe, data]) => `
${timeframe}:
- POC: ${data.poc}
- VAH: ${data.vah}
- VAL: ${data.val}
`).join('\n')}

Provide a concise 5-line analysis focusing on:
1. Key price levels and their significance
2. Volume distribution patterns
3. Potential trading opportunities
4. Risk management considerations

Keep the response practical and actionable, under 5 lines.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a concise cryptocurrency trading analyst. Provide clear, actionable insights in exactly 5 lines."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 250,
            temperature: 0.7
        });

        res.json({
            success: true,
            analysis: completion.choices[0].message.content
        });
    } catch (error) {
        console.error('AI Analysis Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate AI analysis'
        });
    }
});

export default router;
