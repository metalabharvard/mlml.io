import axios from "axios";
import * as yaml from "js-yaml";
import { truncate, set } from "lodash";

import fs from "node:fs/promises";
import {
  existsSync,
  unlinkSync,
  lstatSync,
  rmdirSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

type LabList = {
  [key: string]: string;
};

export function addexistingLabsToList(
  obj: LabList,
  labs: { label: string; slug: string }[],
): LabList {
  labs.forEach(({ slug, label }) => {
    if (obj[slug] === undefined) {
      obj[slug] = label;
    }
  });
  return obj;
}

export function sortByName(arr, key: string = "label"): any[] {
  return arr.sort((a, b) => {
    const nameA = a[key].toUpperCase();
    const nameB = b[key].toUpperCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }

    return 0;
  });
}

export function writeToMarkdown(
  path: string,
  frontMatter: any,
  content: string = "",
  isSync: boolean = false,
) {
  // Converting the Meta object to a YAML string
  const yamlStr = yaml.dump(frontMatter, {
    lineWidth: -1,
    indent: 2,
  });
  const fileContent = `---\n${yamlStr}---\n${content}`;

  // Writing the YAML and the content to a Markdown file
  if (!path.endsWith(".md")) {
    path = `${path}.md`;
  }
  if (isSync) {
    writeFileSync(`./content/${path}`, fileContent, "utf8");
  } else {
    fs.writeFile(`./content/${path}`, fileContent, "utf8");
  }
}

export function writeLastMod(folder: string, lastmod: Date, title: string) {
  writeToMarkdown(`${folder}/_index.md`, {
    title,
    lastmod: lastmod.toISOString(),
    draft: false,
  });
}

export function createLabsFolders(labs: LabList, folder: string, type: string) {
  folder = `${folder}/labs`;
  writeLabIndex(folder, "Labs");

  Object.entries(labs).forEach(([slug, label]) => {
    writeLabIndex(`${folder}/${slug}`, label, `${type} in ${label}`);
  });
}

function writeLabIndex(folder: string, title: string, fulltitle: string) {
  if (!existsSync(`./content/${folder}`)) {
    // console.log(`Creating folder for ${title} in ${folder}`);
    mkdirSync(`./content/${folder}`);
  } else {
    // console.log(`Folder for ${title} already exists in ${folder}`);
  }
  // console.log(`Creating index for ${title} in ${folder}`);
  writeToMarkdown(
    `${folder}/_index.md`,
    {
      title,
      draft: false,
      fulltitle,
    },
    "",
    true,
  );
}

// This function fetches multiple items from Strapi
// It is used to fetch all projects, members, and other collections
// This limit is set to 1000, which should be enough for most collections
export async function fetchMultiFromStrapi(
  endpoint: string,
  params: string = "",
) {
  return fetchFromStrapi(endpoint, `pagination[limit]=1000&${params}`);
}

// This function fetches a single item from Strapi
export async function fetchSingleFromStrapi(
  endpoint: string,
  params: string = "",
) {
  const response = await fetchFromStrapi(endpoint, params);
  return response.attributes;
}

// This function is used by fetchMultiFromStrapi and fetchSingleFromStrapi
export async function fetchFromStrapi(endpoint: string, params: string = "") {
  console.log(`Fetching ${endpoint} from Strapi with params: ${params}`);
  if (typeof process.env.STRAPI_URL === "undefined") {
    console.warn(`STRAPI_URL is not set`);
  }
  console.log(`${process.env.STRAPI_URL}`);
  const response = await axios.get(
    `${process.env.STRAPI_URL}/api/${endpoint}?${params}`,
  );
  return response.data.data;
}

export function writeToJSON(path: string, data: any) {
  const fileContent = JSON.stringify(data, null, 1);
  fs.writeFile(`${path}.json`, fileContent, "utf8");
}

export function addIndexPage(id: string, str: string) {
  const frontMatter = {
    title: str.replace("%s", id.charAt(0).toUpperCase() + id.slice(1)),
    slug: id,
  };
  writeToMarkdown(`host/${id}/_index`, frontMatter);
}

export function imageMaxWidth(url: string): string {
  // We limit the width of the image to 2000 pixels in height and width
  return url.replace("upload/", "upload/c_limit,w_2000,h_2000/");
}

export function convertToPreviewImage(url: string): string {
  // This is for the social media preview
  let str: string = url.replace(
    "upload/",
    "upload/ar_1200:600,c_crop/c_limit,h_1200,w_600/",
  );
  // Preview images can only be static graphics
  str = str.replace(".gif", ".jpg");
  return str;
}

export function convertToLogo(url: string): string {
  // This is for the Schema logo
  let str: string = url.replace("upload/", "upload/ar_1:1,c_crop/");
  // Logos can only be static graphics
  str = str.replace(".gif", ".jpg");
  return str;
}

export function cropFeatureImage(url: string): string {
  if (!Boolean(url)) {
    return "";
  }
  return url.replace("upload/", "upload/ar_21:9,c_crop/");
}

export function convertGrayscale(url: string): string {
  if (!Boolean(url)) {
    return "";
  }
  return url.replace("upload/", "upload/e_grayscale/");
}

export function convertMaxWidth(url: string, width: number = 2000): string {
  if (!Boolean(url)) {
    return "";
  }
  return url.replace("upload/", `upload/c_limit,w_${width},h_${width}/`);
}

export function convertToFeatureImage(path) {
  return getImage(path, { isFeature: true });
}

export function createFeatureImage(cover, header, preview) {
  if (cover?.url) {
    return convertToFeatureImage(cover);
  }
  if (header?.url) {
    return convertToFeatureImage(header);
  }
  if (preview?.url) {
    return convertToFeatureImage(preview);
  }
}

export function createHeaderImage(preview, cover, header) {
  if (header?.url) {
    return getImage(header);
  }
  if (preview?.url) {
    return getImage(preview);
  }
  if (cover?.url) {
    return getImage(cover);
  }
}

export function createPreviewImage(preview: string, cover: string): string[] {
  if (preview !== "" && typeof preview !== "undefined") {
    return [convertToPreviewImage(preview)];
  } else if (cover !== "" && typeof cover !== "undefined") {
    return [convertToPreviewImage(cover)];
  } else {
    return [];
  }
}

export function takeLatestDate(date_1: Date, date_2: Date): Date {
  return date_1 >= date_2 ? date_1 : date_2;
}

export function selectLastDate(
  published: string,
  start?: string | null,
  end?: string | null,
): string {
  if (end && end?.length > 1) {
    return end;
  } else if (start && start?.length > 1) {
    return start;
  } else {
    return published;
  }
}

export function fixExternalLink(str: string): string {
  if (!Boolean(str)) {
    return "";
  }

  str = str.trim();

  if (str === "") {
    return "";
  }

  // Check for 'ttp://' or 'ttps://' (incorrect http or https)
  if (/^ttps?:\/\//.test(str)) {
    console.log(`»${str}« is not correct (incorrect http). Trying to fix it.`);
    return `h${str}`; // Prepend the missing 'h'
  }

  // Check if 'http://' or 'https://' is missing from the URL
  if (!/^https?:\/\//.test(str)) {
    console.log(`»${str}« is not correct (missing http). Trying to fix it.`);
    return `http://${str}`; // Prepend 'http://' to the URL
  }

  return str;
}

type Link = {
  label: string;
  url?: string;
};

export function trim(str: string | undefined): string {
  return (str ?? "").trim();
}

export function checkIfRelationsExist(arr: string[], obj: object): void {
  arr.forEach((relation) => {
    if (!obj.hasOwnProperty(relation)) {
      console.log(
        `The relation ${relation} does not exist in the object. You might need to change the access in Strapi.`,
      );
    }
  });
}

type ListEntry = {
  [key: string]: string;
  slug: string;
};
type Topic = {
  attributes: {
    TopicLabel: string;
  };
};
export function getRelatedEntries(
  topics: Topic[],
  allEntries: any[],
  slug: string,
): ListEntry[] {
  const list: ListEntry[] = [];
  topics.forEach(({ attributes: topic }) => {
    // console.log(`Found topic ${topic.TopicLabel} in ${slug}`);
    const topicLabel = topic.TopicLabel;
    if (topicLabel !== "") {
      allEntries.forEach(({ attributes: entry }) => {
        // console.log(`Searching for ${topicLabel} in ${entry.title}`);
        if (
          entry.topics.data.find(
            ({ attributes: topic }: Topic) => topic.TopicLabel === topicLabel,
          ) &&
          entry.Slug !== slug
        ) {
          // console.log(`Found ${topicLabel} in ${entry.title}`);
          list.push({ label: entry.title, slug: entry.slug });
        }
      });
    }
  });
  return list;
}

export function cleanList(arr: string[], key: string = "label"): ListEntry[] {
  const list: ListEntry[] = [];
  arr.forEach(({ attributes: project }) => {
    const label = trim(project[key]);
    const slug = trim(project.slug);
    if (label.length && slug.length) {
      list.push({ label, slug });
    }
  });
  return list;
}

type Alias = {
  Aliases: string;
};
export function cleanAliases(arr: Alias[]): string[] {
  const list: string[] = [];
  arr.forEach(({ Aliases }) => {
    const label = trim(Aliases);
    if (label.length) {
      list.push(label);
    }
  });
  return list;
}

type Lab = {
  attributes: {
    label: string;
    slug: string;
  };
};
export function cleanLabsList(arr: Lab[]): string[] {
  const list: string[] = [];
  arr.forEach(({ attributes: { slug } }) => {
    const label = trim(slug);
    if (label.length) {
      list.push(label);
    }
  });
  return list;
}

export function cleanTwitterHandle(handle: string): string {
  if (handle.startsWith("@")) {
    console.warn(`Twitter handle ${handle} starts with @. Removing it.`);
    return handle.slice(1);
  }
  return handle;
}

interface Member {
  attributes: {
    Name: string;
    slug: string;
    twitter: string;
  };
}
export function cleanListMembers(arr: Member[]): Member[] {
  const list: Member[] = [];
  arr.forEach(({ attributes: member }) => {
    const label = trim(member.Name);
    const slug = trim(member.slug);
    const twitter = cleanTwitterHandle(trim(member.twitter));
    if (label.length && slug.length) {
      const obj = {
        label,
        slug,
      };
      if (Boolean(twitter)) {
        obj["twitter"] = twitter;
      }
      list.push(obj);
    }
  });
  return list;
}

export function getMembersTwitter(members: any[]): string[] {
  return members
    .filter(({ attributes: member }) => member.twitter)
    .map(({ attributes: member }) => cleanTwitterHandle(member.twitter));
}

export function cleanLinkList(arr: Link[]): Link[] {
  const list: Link[] = [];

  arr.forEach((c) => {
    const label = trim(c.label);
    const url = trim(c.url);
    if (!(label === "" && url === "")) {
      const fixedUrl = fixExternalLink(url);
      let obj: Link = { label };
      if (fixedUrl) {
        obj.url = fixedUrl;
      }
      list.push(obj);
    }
  });
  return list;
}

export async function cleanDirectory(directory: string) {
  const dir_content = `./content/${directory}`;
  // console.log(`Cleaning directory: ${dir_content}`);
  for (const file of await fs.readdir(dir_content)) {
    // console.log(`Deleting file: ${file}`);
    if (file.endsWith(".md")) {
      await fs.unlink(path.join(dir_content, file));
    }
  }

  const dir_labs = `./content/${directory}/labs`;
  if (!existsSync(dir_labs)) {
    return;
  }
  // console.log(`Cleaning directory: ${dir_labs}`);

  const indexPath = path.join(dir_labs, "_index.md");
  if (existsSync(indexPath)) {
    unlinkSync(indexPath);
  }

  for (const item of await fs.readdir(dir_labs)) {
    const itemPath = path.join(dir_labs, item);
    if (lstatSync(itemPath).isDirectory()) {
      // console.log(`Deleting folder: ${itemPath}`);
      const indexPath = path.join(itemPath, "_index.md");
      if (existsSync(indexPath)) {
        unlinkSync(indexPath);
      }
      rmdirSync(itemPath);
    }
  }
}

export function createFullTitle(title: string, subtitle: string): string {
  title = trim(title);
  subtitle = trim(subtitle);
  if (subtitle === "" || subtitle === null || typeof subtitle === "undefined") {
    return title;
  } else {
    return `${title}: ${subtitle}`;
  }
}

export function cleanListTypes(arr: string[]): string[] {
  const list: string[] = [];
  arr.forEach(({ attributes: project }) => {
    const label = trim(project.label);
    if (label.length) {
      list.push(label);
    }
  });
  return list.reverse();
}

export function createDescription(intro: string): string {
  return truncate(intro, { length: 160, omission: "…", separator: " " });
}

const IMAGES_SIZES = ["large", "medium", "small", "thumbnail"];
export function getImage(
  path,
  { isFeature, isGrayscale, isImageMaxWidth } = {
    isFeature: false,
    isGrayscale: false,
    isImageMaxWidth: false,
  },
) {
  if (typeof path === "undefined" || !Boolean(path)) {
    return undefined;
  }
  // This fixes the path for nested objects
  if (path.hasOwnProperty("data")) {
    path = path.data;
  }
  if (path.hasOwnProperty("attributes")) {
    path = path.attributes;
  }
  if (!path.width || !path.height || !path.url) {
    console.warn("The image path is missing width, height or url", path);
    return false;
  }
  let url = path.url;
  if (isFeature) {
    url = cropFeatureImage(url);
  }
  if (isGrayscale) {
    url = convertGrayscale(url);
  }
  // This is only applied for the main image and not the formats
  if (isImageMaxWidth) {
    url = convertMaxWidth(url);
  }
  const obj = {
    url,
    width: path.width,
    height: path.height,
    ext: path.ext,
    mime: path.mime,
  };
  if (path.alternativeText) {
    obj.alternativeText = path.alternativeText;
  }
  if (path.caption) {
    obj.caption = path.caption;
  }
  IMAGES_SIZES.forEach((size) => {
    if (path.formats?.[size]) {
      let url = path.formats[size].url;
      if (isFeature) {
        url = cropFeatureImage(url);
      }
      if (isGrayscale) {
        url = convertGrayscale(url);
      }
      set(obj, ["formats", size], {
        url,
        ext: path.formats[size].ext,
        width: path.formats[size].width,
        height: path.formats[size].height,
      });
    }
  });

  return obj;
}

interface Picture {
  url: string;
  height: number;
  width: number;
}

export function checkImageDimensions(
  image: Picture,
  title: string,
  location: string,
): boolean {
  if (
    (image?.url?.length > 0 || location === "Gallery") &&
    !(image.height > 1 && image.width > 1)
  ) {
    console.warn(
      `${title} (${location}) has wrong dimensions (${image.height}px, ${image.width}px, URL: ${image.url})`,
    );
    return false;
  }
  return true;
}

export function checkGalleryDimensions(
  arr: Picture[],
  title: string,
): Picture[] {
  const res: Picture[] = [];
  for (let element of arr) {
    if (checkImageDimensions(element, title, "Gallery")) {
      res.push(element);
    } else {
      console.warn(
        `Removing image from gallery in ${title} because of wrong dimensions (${element.Height}px, ${element.Width}px, URL: ${element.url})`,
      );
    }
  }
  return res;
}
