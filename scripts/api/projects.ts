import {
  writeToMarkdown,
  fetchMultiFromStrapi,
  writeToJSON,
  addIndexPage,
  convertToPreviewImage,
  convertToLogo,
  takeLatestDate,
  selectLastDate,
  cleanLinkList,
  cleanDirectory,
  trim,
  checkIfRelationsExist,
  getRelatedProjects,
  fixExternalLink,
  cleanList,
  cleanListMembers,
  sortByName,
  createPreviewImage,
  createFullTitle,
  cleanListTypes,
  createDescription,
} from "./utils";

import { createTimeString, getMembersTwitter } from "./utils-project";

const FOLDER = "projects";

let lastmod: Date = new Date(0);

const fetchProjects = async () => {
  console.log("Requesting projects");
  try {
    await cleanDirectory(FOLDER);
    const projects = await fetchMultiFromStrapi("projects", "populate=*");

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
      // console.log(project);
      checkIfRelationsExist(["topics", "events", "members", "types"], project);
      lastmod = takeLatestDate(lastmod, new Date(project.updated_at)); // TODO: Check
      console.log("project", project.events);

      const frontMatter = {
        title: trim(project.title),
        subtitle: trim(project.subtitle),
        fulltitle: createFullTitle(project.title, project.subtitle),
        intro: project.intro,
        start: project.start,
        end: project.end,
        datestring: createTimeString(project.start, project.end),
        description: createDescription(project.intro),
        location: trim(project.location),
        host: trim(project.host),
        mediation: project.mediation,
        isFeatured: Boolean(project.isFeatured),
        externalLink: fixExternalLink(project.externalLink),
        lastmod: project.updatedAt,
        date: selectLastDate(project.publishedAt, project.start, project.end),
        slug: project.slug,
        collaborators: cleanLinkList(project.collaborators),
        events: sortByName(cleanList(project.events.data, "title")),
        members: sortByName(cleanListMembers(project.members.data), "label"),
        links: cleanLinkList(project.links),
        press_articles: cleanLinkList(project.press_articles),
        funders: cleanLinkList(project.funders),
        projects: sortByName(
          getRelatedProjects(project.topics.data, projects, project.slug),
        ),
        cover: project.cover.data.attributes,

        membersTwitter: getMembersTwitter(project.members.data),
        images: createPreviewImage(
          project.preview?.data?.url,
          project.cover?.data?.url,
        ),

        // Used in the meta data section of the project
        categories: cleanListTypes(project.types.data),
        // Tags used for Open Graph
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

  console.log({ lastmod });
};

fetchProjects();
