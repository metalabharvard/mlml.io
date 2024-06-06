import {
  writeToMarkdown,
  fetchMultiFromStrapi,
  takeLatestDate,
  selectLastDate,
  cleanLinkList,
  trim,
  getRelatedEntries,
  fixExternalLink,
  cleanList,
  cleanListMembers,
  sortByName,
  createPreviewImage,
  createFullTitle,
  createDescription,
  getImage,
  createHeaderImage,
  writeLastMod,
  getMembersTwitter,
  checkImageDimensions,
  cleanAliases,
  cleanLabsList
} from "./utils";

import { convertEventTimes } from "./utils-events";

const FOLDER = "events";

let lastmod: Date = new Date(0);

const fetchEvents = async () => {
  console.log("Requesting events");
  try {
    // await cleanDirectory(FOLDER);
    const events = await fetchMultiFromStrapi("events", "populate=*"); // &filters[slug][$eq]=tradition-and-technology

    events.forEach(({ attributes: event }) => {
      // checkIfRelationsExist(["topics", "events", "members", "types"], project);
      lastmod = takeLatestDate(lastmod, new Date(event.updatedAt));

      const times = convertEventTimes(event);

      const frontmatter = {
        title: trim(event.title),
        subtitle: trim(event.subtitle),
        fulltitle: createFullTitle(event.title, event.subtitle),
        status: event.status ?? "",
        outputs: ["HTML", "Calendar"],
        ...times,
        intro: trim(event.intro ?? ""),
        location: trim(event.location),
        category: trim(event.category),
        externalLink: fixExternalLink(event.link),
        description: createDescription(event.intro),
        isFeatured: Boolean(event.isFeatured),
        isOngoing: Boolean(event.isOngoing),
        lastmod: event.updatedAt,
        date: selectLastDate(
          event.publishedAt,
          times.end_time,
          times.start_time,
        ),
        slug: event.slug,
        members: sortByName(cleanListMembers(event.members.data), "label"),
        projects: sortByName(cleanList(event.projects.data, "title")),
        events: sortByName(
          getRelatedEntries(event.topics.data, events, event.slug),
        ),
        cover: getImage(event.cover?.data?.attributes),
        header: createHeaderImage(
          event.header?.data?.attributes,
          event.cover?.data?.attributes,
          event.preview?.data?.attributes,
        ),
        noHeaderImage: Boolean(event.noHeaderImage),
        gallery: (event.gallery?.data ?? [])
          .map(({ attributes: image }) => getImage(image))
          .filter(Boolean),
        collaborators: cleanLinkList(event.collaborators),
        links: cleanLinkList(event.links),
        press_articles: cleanLinkList(event.press_articles),
        funders: cleanLinkList(event.funders),
        members_twitter: getMembersTwitter(event.members.data),
        images: createPreviewImage(
          event.preview?.data?.attributes?.url,
          event.cover?.data?.attributes?.url,
        ),
        aliases: cleanAliases(event.Aliases),
        "events/labs": cleanLabsList(event.labs.data),
        labs: cleanList(event.labs.data, "title"),
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
        "members",
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

      [
        "cover",
        "description",
        "keyword",
        "category",
        "externalLink",
        "intro",
        "location",
      ].forEach((key) => {
        frontmatter.hasOwnProperty(key) &&
          (typeof frontmatter[key] === "undefined" ||
            frontmatter[key] === "") &&
          delete frontmatter[key];
      });

      // Create a Markdown file for each project
      writeToMarkdown(
        `${FOLDER}/${event.slug}`,
        frontmatter,
        event.description,
      );
      // console.log(`Processed ${project.title}`);
    });

    console.log(`${events.length} events processed.`);
  } catch (error) {
    console.error("Error fetching projects:", error);
  }

  writeLastMod(FOLDER, lastmod, "Events");
};

fetchEvents();
