var express = require('express');
var fs = require('promise-fs');
var path = require('path');
var router = express.Router();
const puppeteer = require('puppeteer');

async function createPanoJson(options, pathName) {
    const data = JSON.stringify(options, null, 4);
    await fs.writeFile(pathName, data);
}

async function createPano(imgData, pathName) {
    const base64Data = imgData.replace(/^data:image\/\w+;base64,/, '');
    await fs.writeFile(pathName, base64Data, {encoding: 'base64'});
}

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/screenshot', async function(req, res, next) {
    const browser = await puppeteer.launch({
        args: [
            // Required for Docker version of Puppeteer
            '--no-sandbox',
            '--disable-setuid-sandbox',
            // This will write shared memory files into /tmp instead of /dev/shm,
            // because Docker’s default for /dev/shm is 64MB
            '--disable-dev-shm-usage'
          ]
    });
    const page = await browser.newPage();
    await page.goto('http://localhost:3000');
    await page.screenshot({path: __dirname + '/example.png'});

    await browser.close();
});

router.get('/pano', async function(req, res, next) {
    const browser = await puppeteer.launch({
        args: [
            // Required for Docker version of Puppeteer
            '--no-sandbox',
            '--disable-setuid-sandbox',
            // This will write shared memory files into /tmp instead of /dev/shm,
            // because Docker’s default for /dev/shm is 64MB
            '--disable-dev-shm-usage'
          ]
    });
    const page = await browser.newPage();
    page.once('load', () => console.log('Page loaded!'));
    page.on('console', (msg) => {
        for (let i = 0; i < msg.args().length; ++i)
            console.log(`${i}: ${msg.args()[i]}`);
    })
    var model = req.query.model;
    const watchStatus = page.waitForFunction(function() {
        //const queryParams = new window.URLSearchParams(window.location.search);
        //const m = queryParams.get('model');
        //const sweeps = JSON.parse( window.localStorage.getItem(`${m}.sweeps`) ) || {};
        return window.modelDownloaded === true// || sweeps.length === 0;
    }, {timeout: 1000 * 60 * 60});
    
    const d1 = new Date();
    console.log('Start process:', d1);
    await page.goto('http://localhost:3000?model=' + model);
    
    watchStatus.then(() => {
        const d2 = new Date();
        console.log('End process:', d2);
        console.log('Close browser');
        browser.close();
        res.status(200).json({message: `Model ${model} is downloaded`})
    });
    
    
    
    //;
    //await page.screenshot({path: __dirname + '/example.png'});
    //
});

/**
 * req.sid
 * req.sweep.id
 * req.sweep.options
 * req.sweep.panorama
 */
router.post('/', async function(req, res, next) {
    const { body } = req;
    const imgPath = path.join(__dirname, '..', 'assets', 'img');
    const modelPath = path.join(imgPath, body.sid);
    const panoPath = path.join(modelPath, body.sweep.uuid);
    const panoImg = panoPath + '.jpg';
    const panoSettings = panoPath + '.json';

    await fs.mkdir(modelPath, {recursive: true});

    try {
        await Promise.all([
            createPano(body.panorama, panoImg),
            createPanoJson(body.sweep, panoSettings)
        ]);
        res
        .status(201)
        .json({message: 'Panorama and its sweep options has been saved.'});
    } catch(e) {
        res
        .status(400)
        .json({message: 'Something went wrong while saving panorama', error: e});
    }

    
});



module.exports = router;
