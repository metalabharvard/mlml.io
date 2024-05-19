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

      const frontMatter = {
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
        collaborators: cleanLinkList(event.collaborators),
        links: cleanLinkList(event.links),
        press_articles: cleanLinkList(event.press_articles),
        funders: cleanLinkList(event.funders),
        members_twitter: getMembersTwitter(event.members.data),
        images: createPreviewImage(
          event.preview?.data?.attributes?.url,
          event.cover?.data?.attributes?.url,
        ),
        // start: project.start,
        // end: project.end ?? "",
        // datestring: createTimeString(project.start, project.end),
        // description: createDescription(project.intro),
        // keyword: tags.join(","),
        // tags: tags,
        // location: trim(project.location),
        // host: trim(project.host),
        // mediation: project.mediation,
        // isFeatured: Boolean(project.isFeatured),
        // externalLink: fixExternalLink(project.externalLink),
        // lastmod: project.updatedAt,
        // date: selectLastDate(project.publishedAt, project.start, project.end),
        // slug: project.slug,
        // categories: cleanListTypes(project.types.data),
        // collaborators: cleanLinkList(project.collaborators),
        // press_articles: cleanLinkList(project.press_articles),
        // links: cleanLinkList(project.links),
        // events: sortByName(cleanList(project.events.data, "title")),
        // members: sortByName(cleanListMembers(project.members.data), "label"),
        // projects: sortByName(
        //   getRelatedEntries(project.topics.data, projects, project.slug),
        // ),
        // cover: getImage(project.cover?.data?.attributes),
        // header: createHeaderImage(
        //   project.preview?.data?.attributes,
        //   project.cover?.data?.attributes,
        //   project.header?.data?.attributes,
        // ),
        // noHeaderImage: Boolean(project.noHeaderImage),
        // feature: createFeatureImage(
        //   project.cover?.data?.attributes,
        //   project.header?.data?.attributes,
        //   project.preview?.data?.attributes,
        // ),
        // gallery: (project.gallery?.data ?? []).map(({ attributes: image }) =>
        //   getImage(image),
        // ),
        // funders: cleanLinkList(project.funders),
        // members_twitter: getMembersTwitter(project.members.data),
        // images: createPreviewImage(
        //   project.preview?.data?.attributes?.url,
        //   project.cover?.data?.attributes?.url,
        // ),
      };

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
      ].forEach((key) => {
        frontMatter.hasOwnProperty(key) &&
          Array.isArray(frontMatter[key]) &&
          frontMatter[key].length === 0 &&
          delete frontMatter[key];
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
        frontMatter.hasOwnProperty(key) &&
          (typeof frontMatter[key] === "undefined" ||
            frontMatter[key] === "") &&
          delete frontMatter[key];
      });

      // Create a Markdown file for each project
      writeToMarkdown(
        `${FOLDER}/${event.slug}`,
        frontMatter,
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
