import axios from "axios";
import * as fs from "fs";
import * as yaml from "js-yaml";

export function writeToMarkdown(
  path: string,
  frontMatter: any,
  content: string = "",
) {
  // Converting the Meta object to a YAML string
  const yamlStr = yaml.dump(frontMatter, { lineWidth: -1 });
  const fileContent = `---\n${yamlStr}---\n${content}`;

  // Writing the YAML and the content to a Markdown file
  fs.writeFileSync(`./content/${path}.md`, fileContent, "utf8");
}

export async function fetchMultiFromStrapi(
  endpoint: string,
  params: string = "",
) {
  return fetchFromStrapi(endpoint, `pagination[limit]=1000&${params}`);
}

export async function fetchSingleFromStrapi(
  endpoint: string,
  params: string = "",
) {
  const response = fetchFromStrapi(endpoint, params);
  return response.attributes;
}

export async function fetchFromStrapi(endpoint: string, params: string = "") {
  console.log(`Fetching ${endpoint} from Strapi with params: ${params}`);
  const response = await axios.get(
    `http://192.168.178.121:1337/api/${endpoint}?${params}`,
  );
  return response.data.data;
}

export function writeToJSON(path: string, data: any) {
  const fileContent = JSON.stringify(data, null, 1);
  fs.writeFileSync(`${path}.json`, fileContent, "utf8");
}

export function addIndexPage(id: string, str: string) {
  const frontMatter = {
    title: str.replace("%s", id.charAt(0).toUpperCase() + id.slice(1)),
    slug: id,
  };
  writeToMarkdown(`host/${id}/_index`, frontMatter);
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

export function takeLatestDate(date_1: Date, date_2: Date): Date {
  return date_1 >= date_2 ? date_1 : date_2;
}

export function createDate(
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

const trim = (str: string | undefined): string => (str ?? "").trim();

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
