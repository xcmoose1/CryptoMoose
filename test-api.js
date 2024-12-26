import fetch from 'node-fetch';

async function testAPIs() {
    const baseUrl = 'http://localhost:8001';
    
    try {
        console.log('Testing Investment Opportunities API...');
        const oppResponse = await fetch(`${baseUrl}/api/opportunities`);
        const oppData = await oppResponse.json();
        console.log('Opportunities Data:', JSON.stringify(oppData, null, 2));

        console.log('\nTesting Regulatory Tracking API...');
        const regResponse = await fetch(`${baseUrl}/api/regulatory`);
        const regData = await regResponse.json();
        console.log('Regulatory Data:', JSON.stringify(regData, null, 2));

        console.log('\nTesting High Risk Alerts API...');
        const riskResponse = await fetch(`${baseUrl}/api/regulatory/high-risk`);
        const riskData = await riskResponse.json();
        console.log('High Risk Alerts:', JSON.stringify(riskData, null, 2));

        console.log('\nTesting IDO Calendar API...');
        const calendarResponse = await fetch(`${baseUrl}/api/ido-calendar`);
        const calendarData = await calendarResponse.json();
        console.log('IDO Calendar Data:', JSON.stringify(calendarData, null, 2));

        console.log('\nTesting Filtered IDO Calendar API...');
        const filteredResponse = await fetch(`${baseUrl}/api/ido-calendar/filtered?riskLevel=low&platform=Binance`);
        const filteredData = await filteredResponse.json();
        console.log('Filtered IDO Calendar Data:', JSON.stringify(filteredData, null, 2));

    } catch (error) {
        console.error('Error testing APIs:', error);
    }
}

testAPIs();
