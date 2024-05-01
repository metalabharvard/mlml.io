import {
  writeToMarkdown,
  fetchMultiFromStrapi,
  writeToJSON,
  addIndexPage,
  convertToPreviewImage,
  convertToLogo,
  takeLatestDate,
  createDate,
  cleanLinkList,
} from "./utils";

// Assuming utils.js contains the converted utility functions of utils in Go
// const utils = require("./utils");

// Simplified getDate functions using date-fns
// function getDatePrint(date) {
//   return format(new Date(date), "MMMM yyyy"); // "January 2021"
// }

function checkDates(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return startDate > endDate;
}

const createTimeString = (start, end) => {
  // Simplified example of creating a time string
  if (start && end) {
    if (start === end) {
      return getDatePrint(start);
    } else {
      return `${getDatePrint(start)} – ${getDatePrint(end)}`;
    }
  } else if (start) {
    return `Since ${getDatePrint(start)}`;
  } else if (end) {
    return getDatePrint(end);
  } else {
    return "";
  }
};

const FOLDER = "projects";

const fetchProjects = async () => {
  console.log("Requesting projects");
  try {
    // utils.cleanFolder(FOLDER);
    let projects = await fetchMultiFromStrapi("projects", "populate=*");

    // const response = await axios.get('https://metalab-strapi.herokuapp.com/projects?_limit=-1');
    // const projects = response.data;

    // let lastmod: Date;

    // projects = projects.map(({ attributes: project }) => {
    //   return {
    //     ...project,
    //     topics: project.topics.map((topic) => topic.name),
    //   }
    // }))

    projects.forEach(({ attributes: project }) => {
      // lastmod = takeLatestDate(new Date(project.updated_at), new Date(project.updated_at))
      //   new Date(Math.max(lastmod, new Date(project.updated_at)));
      console.log(project);
      const frontMatter = {
        title: project.title,
        date: createDate(project.publishedAt, project.start, project.end),
        lastmod: project.updated_at,
        collaborators: cleanLinkList(project.collaborators),
        links: cleanLinkList(project.links),
        press_articles: cleanLinkList(project.press_articles),
        funders: cleanLinkList(project.funders),
        // events: cleanLinkList(project.events),
      };

      // Create a Markdown file for each project
      writeToMarkdown(
        `${FOLDER}/${project.slug}`,
        frontMatter,
        project.description,
      );
      console.log(`Processed ${project.title}`);
    });

    console.log(`${projects.length} projects processed.`);
  } catch (error) {
    console.error("Error fetching projects:", error);
  }
};

fetchProjects();
