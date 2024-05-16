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
  getImage,
  createFeatureImage,
  createHeaderImage
} from "./utils";

import { createTimeString, getMembersTwitter, createTags } from "./utils-project";

const FOLDER = "projects";

let lastmod: Date = new Date(0);

const fetchProjects = async () => {
  console.log("Requesting projects");
  try {
    await cleanDirectory(FOLDER);
    const projects = await fetchMultiFromStrapi("projects", "populate=*"); // &filters[slug][$eq]=waves

    projects.forEach(({ attributes: project }) => {
      checkIfRelationsExist(["topics", "events", "members", "types"], project);
      lastmod = takeLatestDate(lastmod, new Date(project.updatedAt));

      const tags = createTags(project.keywords?.data, project.types?.data);

      const frontMatter = {
        title: trim(project.title),
        subtitle: trim(project.subtitle),
        fulltitle: createFullTitle(project.title, project.subtitle),
        intro: project.intro ?? '',
        start: project.start,
        end: project.end ?? '',
        datestring: createTimeString(project.start, project.end),
        description: createDescription(project.intro),
        keyword: tags.join(','),
        tags: tags,
        location: trim(project.location),
        host: trim(project.host),
        mediation: project.mediation,
        isFeatured: Boolean(project.isFeatured),
        externalLink: fixExternalLink(project.externalLink),
        lastmod: project.updatedAt,
        date: selectLastDate(project.publishedAt, project.start, project.end),
        slug: project.slug,
        categories: cleanListTypes(project.types.data),
        collaborators: cleanLinkList(project.collaborators),
        links: cleanLinkList(project.links),
        events: sortByName(cleanList(project.events.data, "title")),
        members: sortByName(cleanListMembers(project.members.data), "label"),
        press_articles: cleanLinkList(project.press_articles),

        projects: sortByName(
          getRelatedProjects(project.topics.data, projects, project.slug),
        ),
        cover: getImage(project.cover?.data?.attributes),
        header: createHeaderImage(project.preview?.data?.attributes, project.cover?.data?.attributes, project.header?.data?.attributes),
        noHeaderImage: Boolean(project.noHeaderImage),
        feature: createFeatureImage(project.cover?.data?.attributes, project.header?.data?.attributes, project.preview?.data?.attributes),
        gallery: (project.gallery?.data ?? []).map(({attributes: image}) => getImage(image)),
        funders: cleanLinkList(project.funders),
        members_twitter: getMembersTwitter(project.members.data),
        images: createPreviewImage(
          project.preview?.data?.attributes?.url,
          project.cover?.data?.attributes?.url,
        )
      };

      [
        "collaborators",
        "funders",
        "projects",
        "membersTwitter",
        "images",
        "categories",
        "events",
        "press_articles",
        "links",
        "categories",
        "gallery",
        "tags"
      ].forEach((key) => {
        frontMatter.hasOwnProperty(key) && Array.isArray(frontMatter[key]) && frontMatter[key].length === 0 && delete frontMatter[key];
      });

      if (!project.isFeatured) {
        delete frontMatter.feature;
      }

      ["cover", "description", "keyword"].forEach(key => {
        frontMatter.hasOwnProperty(key) && (typeof frontMatter[key] === "undefined" || frontMatter[key] === '') && delete frontMatter[key];
      })

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
