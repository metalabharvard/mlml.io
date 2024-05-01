import { writeToMarkdown, fetchFromStrapi } from "./utils";

// The main function to fetch, transform, and write about page data
const fetchAndWriteAboutData = async () => {
  try {
    // Fetching data from the URL
    const data = await fetchFromStrapi("about");

    const frontMatter = {};
    frontMatter.layout = "about";
    frontMatter.slug = "about";
    frontMatter.title = data.title || "About";
    frontMatter.date = data.createdAt;
    frontMatter.lastmod = data.updatedAt;
    frontMatter.created_at = data.createdAt;
    frontMatter.updated_at = data.updatedAt;
    frontMatter.header = data.header;

    const content = data.intro || "";

    writeToMarkdown("about", frontMatter, content);

    console.log("Successfully wrote about page data");
  } catch (error) {
    console.error("Error fetching or writing about data:", error);
  }
};

// Executing the main function
fetchAndWriteAboutData();
