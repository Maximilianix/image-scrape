'use strict';

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs');
const createHTML = require('create-html');


(async function(){
    console.log("Downloading images...");

    //Create image folder if not exist
    let imageFolder = process.argv[3] ? process.argv[3] : "./images"
    if (!fs.existsSync(imageFolder)){
        fs.mkdirSync(imageFolder);
    }

    //Get images data (src, name, width)
    let imageLinks = await extractImageLinks();
    imageLinks.map((image) => {
        let filename = `${imageFolder}/${image.filename}`;
        saveImageToDisk(image.src, filename)
    })

    console.log("Images Download complete");

    createHTMLFile(imageFolder, imageLinks);

})()

//Create HTML file
function createHTMLFile(imageFolder, imageLinks) {   
    //create html body
    let body = '<section class="container">';
    imageLinks.map(image => {
        body += `<div class="imgRow"><img src="./${image.filename}" width="120px" /><img src="${image.src}" width="${image.originalWidth}"/></div>`
    })
    body += '</section>';
    
    //html parameters
    const html = createHTML({
        css: ['../style.css'],
        title: `Scrape gallery from ${process.argv[2]}`,
        body: body
    })

    //create html
    fs.writeFile(`${imageFolder}/index.html`, html, function (err) {
        if (err) {
            console.log(err)
        } else {
            console.log('HTML file created.');
        }
    })
}

// Browser and page instance
async function instance(){
    const browser = await puppeteer.launch({
        headless: false
    })

    const page = await browser.newPage()
    return {page, browser}
}

// Extract all imageLinks from the page
async function extractImageLinks(){
    const {page, browser} = await instance()
    console.log('Extracting images...')
    // Get the page url from the user or use default link
    let baseURL = process.argv[2] ? process.argv[2] : "https://www.google.com/"

    try {
        await page.goto(baseURL, {waitUntil: 'networkidle0'})
        await page.waitForSelector('body')

        let imageLinks = await page.evaluate(() => {
            let imgTags = Array.from(document.querySelectorAll('img'))
            let imageArray = []

            imgTags.map((image) => {
                let src = image.src;
                let originalWidth = image.width;
                // Get the image file name
                let srcArray = src.split('/');
                let pos = srcArray.length - 1;
                let filename = srcArray[pos].replace(/%/g, "");

                imageArray.push({
                    src,
                    filename,
                    originalWidth
                })
            })

            return imageArray
        })

        await browser.close()
        return imageLinks

    } catch (err) {
        console.log(err)
    }
}

//Saving images to specified folder
async function saveImageToDisk(url, filename){
    fetch(url)
    .then(res =>
      new Promise((resolve, reject) => {
        const dest = fs.createWriteStream(filename);
        res.body.pipe(dest);
        res.body.on("end", () => resolve("it worked"));
        dest.on("error", reject);
      }))
    .catch((err) => {
        console.log(err)
    })
}
