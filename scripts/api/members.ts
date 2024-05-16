import { sortBy } from "lodash";

import {
    writeToMarkdown,
    fetchMultiFromStrapi, takeLatestDate,
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

import { cleanListRoles, calculateRoleRank, createRoleString, checkFounder } from './utils-members'

const FOLDER = "members";

let lastmod: Date = new Date(0);

const fetchProjects = async () => {
  console.log("Requesting members");

  try {
    await cleanDirectory(FOLDER);
    const members = await fetchMultiFromStrapi("members", "populate=*"); // &filters[slug][$eq]=waves

    members.forEach(({ attributes: member }) => {
      checkIfRelationsExist(["roles"], member);

      const roles = sortBy(cleanListRoles(member.roles.data), 'position');

      const rank = member.isAlumnus ? 99 : calculateRoleRank(roles);

      const role_string = member.isAlumnus ? "Alumnus" : createRoleString(roles)

      const isFounder = checkFounder(roles);

      // console.log('hereh', cleanList(member.projects.data, "title"))

      const frontmatter = {
        name: trim(member.Name),
        title: trim(member.Name),
        isAlumnus: member.isAlumnus,
        isFounder,
        rank,
        role_string,
        intro: member.intro,
        twitter: trim(member.twitter),
        email: trim(member.email),
        website: fixExternalLink(member.website),
        mastodon: trim(member.mastodon),
        instagram: trim(member.instagram),
        start: member.start,
        lastmod: member.updatedAt,
        date: member.createdAt,
        slug: member.slug,
        events: sortByName(cleanList(member.events.data, "title")),
        projects: sortByName(cleanList(member.projects.data, "title")),
        picture: getImage(member.picture, { isGrayscale: true, isFeature: false })
      }

      const deleteIfEmpty = [
        "projects",
        "events"
      ]

      deleteIfEmpty.forEach((key) => {
        frontmatter.hasOwnProperty(key) && Array.isArray(frontmatter[key]) && frontmatter[key].length === 0 && delete frontmatter[key];
      });

      const deleteKeysIfInvalid = ["mastodon", "instagram", "website", "email", "start", "intro"];
      deleteKeysIfInvalid.forEach((key: string) => {
        frontmatter.hasOwnProperty(key) && (typeof frontmatter[key] === "undefined" || frontmatter[key] === '' || frontmatter[key] == null) && delete frontmatter[key];
      })

      // Create a Markdown file for each project
      writeToMarkdown(
        `${FOLDER}/${member.slug}`,
        frontmatter,
        member.description,
      );
      console.log(`Processed ${member.Name}`);
    });

    console.log(`${members.length} members processed.`);
  } catch (error) {
    console.error("Error fetching projects:", error);
  }

  console.log({ lastmod });
};

fetchProjects();
