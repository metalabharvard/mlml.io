const axios = require('axios');

const FOLDER = 'members';

axios
  .get(`https://metalab-strapi.herokuapp.com/${FOLDER}/`)
  .then(res => {
    res.data.forEach(item => {
      let { description, id } = item;
      if (description) {
        // https://regex101.com/r/MdtcRW/1
        // description = description.replace(/\[\*\*(.{2,}?)\*\*\]\((.{2,}?)\)/gm, "**[$1]($2)**");
        // https://regex101.com/r/QUZTba/1
        // description = description.replace(/\[\*(.{2,}?)\*\]\((.{2,}?)\)/gm, "*[$1]($2)*");
        // https://regex101.com/r/isXGkS/1
        // https://regex101.com/r/isXGkS/2
        // https://regex101.com/r/isXGkS/3
        description = description.replace(/\[(.[^:]+?)\]\(https:\/\/metalabharvard\.github\.io\/projects\/(.{2,}?)\)/gm, '{{< link "$2" >}}$1{{< /link >}}')
        description = description.replace(/\[(.[^:]+?)\]\(https:\/\/metalabharvard\.github\.io\/people\/(.{2,}?)\)/gm, '{{< link "$2" >}}$1{{< /link >}}')
        // https://regex101.com/r/ToEPoI/1
        // https://regex101.com/r/ToEPoI/2
        description = description.replace(/\[(.{2,}?)\]\(https*:\/\/metalabharvard\.github\.io\/*\)/gm, '{{< link "" >}}$1{{< /link >}}')
        // console.log(str)
        axios.put(`https://metalab-strapi.herokuapp.com/${FOLDER}/${id}`, { description })
      }
    })
  })
  .catch(error => {
    console.log(error)
    // console.log(error.response.data)
  })

