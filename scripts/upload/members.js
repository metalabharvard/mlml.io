const fs = require('fs');
const fm = require('front-matter');
const axios = require('axios');
const get = require('lodash/get');
const { getAttribute, addAttribute, getDate, getSlug, getFullName, getAlumnusStatus, getFormattedURL } = require('./utils.js');

const FOLDER = './members/';
const URL = 'members';

fs.readdirSync(FOLDER).forEach(file => {
  if (!file.endsWith('.md')) { return; }
  const raw = fs.readFileSync(`${FOLDER}${file}`).toString()
  if (raw.length) {
    const { attributes, body } = fm(raw);

    let obj = {};
    obj = getAttribute(attributes, obj, 'instagram', 'instagram');
    obj = getAttribute(attributes, obj, 'twitter', 'twitter');
    obj = getAttribute(attributes, obj, 'website', 'website');
    obj = getAttribute(attributes, obj, 'quote', 'intro');
    obj = getAttribute(attributes, obj, 'email', 'mail');
    obj = addAttribute(obj, 'slug', getSlug(getFullName(attributes)));
    obj = addAttribute(obj, 'description', body);
    obj = addAttribute(obj, 'Name', getFullName(attributes));
    obj = addAttribute(obj, 'isAlumnus', getAlumnusStatus(attributes));
    obj = addAttribute(obj, 'website', getFormattedURL(attributes));

    // console.log(getFullName(attributes), getAlumnusStatus(attributes))
    // console.log(obj)

    axios
      .post(`https://metalab-strapi.herokuapp.com/${URL}`, obj)
      .then(res => {
        // console.log(`statusCode: ${res.status} fo ${file}`)
        // console.log(res)
      })
      .catch(error => {
        console.log(`error: ${file}`)
        console.log(error.response.data)
        console.log(get(error, ['response', 'data', 'data', 'errors']))
        console.log(obj)
      })
  } else {
    console.log(`Error: ${file}`)
  }
});
