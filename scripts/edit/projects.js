const fs = require('fs');
const fm = require('front-matter');
const axios = require('axios');
// const { getAttribute, addAttribute, getDate, getNameSlug, getLinks, getCollaborators } = require('./utils.js');

const FOLDER = './projects/';

const project = '2';

axios
  .get(`https://metalab-strapi.herokuapp.com/projects/`)
  .then(res => {
    res.data.forEach(item => {
      let { description, id } = item;

      // https://regex101.com/r/MdtcRW/1
      description = description.replace(/\[\*\*(.{2,}?)\*\*\]\((.{2,}?)\)/gm, "**[$1]($2)**");
      // https://regex101.com/r/QUZTba/1
      description = description.replace(/\[\*(.{2,}?)\*\]\((.{2,}?)\)/gm, "*[$1]($2)*");
      // https://regex101.com/r/isXGkS/1
      // https://regex101.com/r/isXGkS/2
      // description = description.replace(/\[(.{2,}?)\]\(https*:\/\/metalabharvard\.github\.io\/projects\/(.{2,}?)\)/gm, '{{< link "$2" >}}$1{{< /link >}}')
      // https://regex101.com/r/ToEPoI/1
      // description = description.replace(/\[(.{2,}?)\]\(https*:\/\/metalabharvard\.github\.io\/*\)/gm, '{{< link "" >}}$1{{< /link >}}')
      // console.log(str)
      axios.put(`https://metalab-strapi.herokuapp.com/projects/${id}`, { description })
    })
  })
  .catch(error => {
    console.log(`error: ${project}`)
    console.log(error)
    // console.log(error.response.data)
  })

// axios
//   .get(`https://metalab-strapi.herokuapp.com/projects/${project}`)
//   .then(res => {
//     // console.log(`statusCode: ${res.status} fo ${file}`)
//     // console.log({ res })
//     let { description } = res.data;
//     // https://regex101.com/r/MdtcRW/1
//     description = description.replace(/\[\*\*(.{2,}?)\*\*\]\((.{2,}?)\)/gm, "**[$1]($2)**");
//     // https://regex101.com/r/QUZTba/1
//     description = description.replace(/\[\*(.{2,}?)\*\]\((.{2,}?)\)/gm, "*[$1]($2)*");
//     // https://regex101.com/r/isXGkS/1
//     // https://regex101.com/r/isXGkS/2
//     // description = description.replace(/\[(.{2,}?)\]\(https*:\/\/metalabharvard\.github\.io\/projects\/(.{2,}?)\)/gm, '{{< link "$2" >}}$1{{< /link >}}')
//     // https://regex101.com/r/ToEPoI/1
//     // description = description.replace(/\[(.{2,}?)\]\(https*:\/\/metalabharvard\.github\.io\/*\)/gm, '{{< link "" >}}$1{{< /link >}}')
//     // console.log(str)

//     axios.put(`https://metalab-strapi.herokuapp.com/projects/${project}`, { description })
//   })
  

// fs.readdirSync(FOLDER).forEach(file => {
//   if (!file.endsWith('.md')) { return; }
//   const raw = fs.readFileSync(`${FOLDER}${file}`).toString()
//   if (raw.length) {
//     const { attributes, body } = fm(raw);

//     let obj = {};
//     obj = getAttribute(attributes, obj, 'name', 'title');
//     obj = getAttribute(attributes, obj, 'location', 'location');
//     obj = getAttribute(attributes, obj, 'tweet-summary', 'intro');
//     obj = getAttribute(attributes, obj, 'type', 'type');
//     obj = addAttribute(obj, 'slug', getNameSlug(attributes));
//     obj = addAttribute(obj, 'description', body);
//     obj = addAttribute(obj, 'links', getLinks(attributes, 'links'));
//     obj = addAttribute(obj, 'press_articles', getLinks(attributes, 'press'));
//     obj = addAttribute(obj, 'collaborators', getCollaborators(attributes));

//     let url = 'events';

//     if (get(attributes, 'type') === 'teaching' || get(attributes, 'type') === 'event') {
//       obj = addAttribute(obj, 'start_time', getDate(attributes, true, true));
//       obj = addAttribute(obj, 'end_time', getDate(attributes, false, true));
//     } else {
//       url = 'projects'
//       obj = addAttribute(obj, 'start', getDate(attributes, true));
//       obj = addAttribute(obj, 'end', getDate(attributes, false));
//     }

//     axios
//       .post(`https://metalab-strapi.herokuapp.com/${url}`, obj)
//       .then(res => {
//         // console.log(`statusCode: ${res.status} fo ${file}`)
//         // console.log(res)
//       })
//       .catch(error => {
//         console.log(`error: ${file}`)
//         console.log(error.response.data)
//         console.log(obj)
//       })
//   } else {
//     console.log(`Error: ${file}`)
//   }
// });
