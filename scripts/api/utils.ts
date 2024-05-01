import axios from "axios";
import * as fs from "fs";
import * as yaml from "js-yaml";

export function writeToMarkdown(
  path: string,
  frontMatter: any,
  content: string,
) {
  // Converting the Meta object to a YAML string
  const yamlStr = yaml.dump(frontMatter, { lineWidth: -1 });
  const fileContent = `---\n${yamlStr}---\n${content}`;

  // Writing the YAML and the content to a Markdown file
  fs.writeFileSync(`./content/${path}.md`, fileContent, "utf8");
}

export async function fetchFromStrapi(endpoint: string) {
  const response = await axios.get(
    `http://192.168.178.121:1337/api/${endpoint}`,
  );
  return response.data.data.attributes;
}
