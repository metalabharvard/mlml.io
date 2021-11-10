// This is a script to batch edit many projects, members or events.
// This script goes through all projects, allows you to edit for example the description and pushes these edits to Strapi again.
const axios = require('axios');

const FOLDER = 'projects'; // Change this to projects, members or events.

axios
  .get(`https://metalab-strapi.herokuapp.com/${FOLDER}/`)
  .then(res => {
    res.data.forEach(item => {
      let { description, title, id } = item;
      if (title) {
        // Fix the formatting of bold links
        // https://regex101.com/r/MdtcRW/1
        // description = description.replace(/\[\*\*(.{2,}?)\*\*\]\((.{2,}?)\)/gm, "**[$1]($2)**");

        // Fix the formatting of em links
        // https://regex101.com/r/QUZTba/1
        // description = description.replace(/\[\*(.{2,}?)\*\]\((.{2,}?)\)/gm, "*[$1]($2)*");

        // Change relative links to use shortcodes
        // https://regex101.com/r/isXGkS/1
        // https://regex101.com/r/isXGkS/2
        // https://regex101.com/r/isXGkS/3
        // description = description.replace(/\[(.[^:]+?)\]\(https:\/\/metalabharvard\.github\.io\/projects\/(.{2,}?)\)/gm, '{{< link "$2" >}}$1{{< /link >}}')
        // description = description.replace(/\[(.[^:]+?)\]\(https:\/\/metalabharvard\.github\.io\/people\/(.{2,}?)\)/gm, '{{< link "$2" >}}$1{{< /link >}}')
        // https://regex101.com/r/ToEPoI/1
        // https://regex101.com/r/ToEPoI/2
        // description = description.replace(/\[(.{2,}?)\]\(https*:\/\/metalabharvard\.github\.io\/*\)/gm, '{{< link "" >}}$1{{< /link >}}')

        // title = title.replace(/&#43;/g, "+");
        // title = title.replace(/&#45;/g, "-");
        // title = title.replace(/&#39;/g, "’");
        // title = title.replace(/&#58;/g, ":");
        // title = title.replace(/&#8217;/g, "’");
        // title = title.replace(/&#47;/g, "/");
        // title = title.replace(/&#8220;/, "“");
        // title = title.replace(/&#8221;/, "”");

        // title = title.replace(/&#38;/, "&");

        // title = title.replace("MAHINDRA TRANSMEDIA ARTS SEMINAR:", "Mahindra Transmedia Arts Seminar:");
        // title = title.replace("FUTUREFOOD", "Futurefood");
        // title = title.replace("MACHINE EXPERIENCE", "Machine Experience");

        const parts = title.split(': ')
        let subtitle = ''
        if (parts.length === 2) {
          title = parts[0].trim()
          subtitle = parts[1].trim()
        }

        axios.put(`https://metalab-strapi.herokuapp.com/${FOLDER}/${id}`, { title, subtitle })
      }
    })
  })
  .catch(error => {
    console.log(error)
    // console.log(error.response.data)
  })

