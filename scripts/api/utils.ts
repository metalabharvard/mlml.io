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

export async function fetchFromStrapi(endpoint: string, params: string = "") {
  const response = await axios.get(
    `http://192.168.178.121:1337/api/${endpoint}?${params}`,
  );
  return response.data.data.attributes;
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
