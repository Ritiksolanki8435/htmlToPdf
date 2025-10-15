const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'OK', message: 'PDF Generator API is running' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/generate-pdf', async (req, res) => {
    const html = req.body.html;

    if (!html) return res.status(400).send('Missing HTML content');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            timeout: 60000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 794, height: 1123 });
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const pdfBuffer = await page.pdf({
            width: '794px',
            height: '1123px',
            printBackground: true,
            margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
        });

        await browser.close();
        const base64 = pdfBuffer.toString('base64');
        res.json({ base64 });
        
    } catch (error) {
        if (browser) await browser.close();
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});