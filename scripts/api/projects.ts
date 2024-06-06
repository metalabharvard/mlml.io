import {
  writeToMarkdown,
  fetchMultiFromStrapi,
  takeLatestDate,
  selectLastDate,
  cleanLinkList,
  cleanDirectory,
  trim,
  checkIfRelationsExist,
  getRelatedEntries,
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
  createHeaderImage,
  writeLastMod,
  getMembersTwitter,
  cleanAliases,
  checkImageDimensions,
  cleanLabsList
} from "./utils";

import { createTimeString, createTags } from "./utils-project";

const FOLDER = "projects";

let lastmod: Date = new Date(0);

const fetchProjects = async () => {
  console.log("Requesting projects");
  try {
    await cleanDirectory(FOLDER);
    const projects = await fetchMultiFromStrapi("projects", "populate=*"); // &filters[slug][$eq]=artificial-worldviews

    projects.forEach(({ attributes: project }) => {
      checkIfRelationsExist(["topics", "events", "members", "types"], project);
      lastmod = takeLatestDate(lastmod, new Date(project.updatedAt));

      const tags = createTags(project.keywords, project.types?.data);

      const frontmatter = {
        title: trim(project.title),
        subtitle: trim(project.subtitle),
        fulltitle: createFullTitle(project.title, project.subtitle),
        intro: project.intro ?? "",
        start: project.start,
        end: project.end ?? "",
        datestring: createTimeString(project.start, project.end),
        description: createDescription(project.intro),
        keyword: tags.join(","),
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
        press_articles: cleanLinkList(project.press_articles),
        links: cleanLinkList(project.links),
        events: sortByName(cleanList(project.events.data, "title")),
        members: sortByName(cleanListMembers(project.members.data), "label"),
        projects: sortByName(
          getRelatedEntries(project.topics.data, projects, project.slug),
        ),
        cover: getImage(project.cover?.data?.attributes),
        header: createHeaderImage(
          project.preview?.data?.attributes,
          project.cover?.data?.attributes,
          project.header?.data?.attributes,
        ),
        feature: createFeatureImage(
          project.cover?.data?.attributes,
          project.header?.data?.attributes,
          project.preview?.data?.attributes,
        ),
        noHeaderImage: Boolean(project.noHeaderImage),
        gallery: (project.gallery?.data ?? [])
          .map(({ attributes: image }) => getImage(image))
          .filter(Boolean),
        funders: cleanLinkList(project.funders),
        members_twitter: getMembersTwitter(project.members.data),
        images: createPreviewImage(
          project.preview?.data?.attributes?.url,
          project.cover?.data?.attributes?.url,
        ),
        aliases: cleanAliases(project.Aliases),
        "projects/labs": cleanLabsList(project.labs.data),
        labs: cleanList(project.labs.data, "title"),
      };

      checkImageDimensions(frontmatter.cover, frontmatter.title, "Cover");
      checkImageDimensions(frontmatter.preview, frontmatter.title, "Header");
      checkImageDimensions(frontmatter.header, frontmatter.title, "Header");
      checkImageDimensions(frontmatter.feature, frontmatter.title, "Header");

      [
        "collaborators",
        "funders",
        "projects",
        "images",
        "categories",
        "events",
        "press_articles",
        "links",
        "categories",
        "gallery",
        "tags",
        "members_twitter",
        "aliases",
      ].forEach((key) => {
        frontmatter.hasOwnProperty(key) &&
          Array.isArray(frontmatter[key]) &&
          frontmatter[key].length === 0 &&
          delete frontmatter[key];
      });

      if (!project.isFeatured) {
        delete frontmatter.feature;
      }

      ["cover", "description", "keyword"].forEach((key) => {
        frontmatter.hasOwnProperty(key) &&
          (typeof frontmatter[key] === "undefined" ||
            frontmatter[key] === "") &&
          delete frontmatter[key];
      });

      // Create a Markdown file for each project
      writeToMarkdown(
        `${FOLDER}/${project.slug}`,
        frontmatter,
        project.description,
      );
      // console.log(`Processed ${project.title}`);
    });

    console.log(`${projects.length} projects processed.`);
  } catch (error) {
    console.error("Error fetching projects:", error);
  }

  writeLastMod(FOLDER, lastmod, "Projects");
};

fetchProjects();
