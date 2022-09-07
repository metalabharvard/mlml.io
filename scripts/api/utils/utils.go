package utils

import (
  "strings"
  "fmt"
  "os"
  "log"
  "time"
  "io/ioutil"
  "gopkg.in/yaml.v3"
  "regexp"
  "github.com/gobeam/stringy"
  stru "api/structs"
)

func Trim(str string) string {
  return strings.TrimSpace(str)
}

func FixExternalLink(str string) string {
  if str == "" {
    return str
  }
  matched, _ := regexp.MatchString(`^ttp[s]*://`, str)
  if matched {
    println(fmt.Sprintf("»%s« is not correct (incorrect http). Trying to fix it.", str))
    return fmt.Sprintf("h%s", str)
  }
  matched, _ = regexp.MatchString(`^http[s]*://`, str)
  if !matched {
    println(fmt.Sprintf("»%s« is not correct (missing http). Trying to fix it.", str))
    return fmt.Sprintf("http://%s", str)
  }
  return str
}

func TruncateString(str string, length int) string {
  if len(str) <= length {
    return str
  }
  return str[0:length - 1] + "…"
}

func GetMembersTwitter(members []stru.Member) []string {
  // This is used in the header of the website. We create a list of all the Twitter handles
  var list []string
  for _, c := range members {
    if c.Twitter != "" {
      list = append(list, c.Twitter)
    }
  }
  return list
}

func ConvertToPreviewImage(url string) string {
  // This is for the social media preview
  var str string = strings.Replace(url, "upload/", "upload/ar_1200:600,c_crop/c_limit,h_1200,w_600/", 1)
  // Preview images can only be static graphics
  str = strings.Replace(str, ".gif", ".jpg", 1)
  return str
}

func ConvertToLogo(url string) string {
  // This is for the Schema logo
  var str string = strings.Replace(url, "upload/", "upload/ar_1:1,c_crop/", 1)
  // Preview images can only be static graphics
  str = strings.Replace(str, ".gif", ".jpg", 1)
  return str
}

func ImageMaxWidth(url string) string {
  // We limit the width of the image to 2000 pixels in height and width
  return strings.Replace(url, "upload/", "upload/c_limit,w_2000,h_2000/", 1)
}

func CropFeatureImage(url string) string {
  if url != "" {
    return strings.Replace(url, "upload/", "upload/ar_21:9,c_crop/", 1)
  } else {
    return ""
  }
}

func ConvertToFeatureImage(element stru.Picture) stru.Picture {
  element.Url = CropFeatureImage(element.Url)
  element.Formats.Thumbnail.Url = CropFeatureImage(element.Formats.Thumbnail.Url)
  element.Formats.Small.Url = CropFeatureImage(element.Formats.Small.Url)
  element.Formats.Medium.Url = CropFeatureImage(element.Formats.Medium.Url)
  element.Formats.Large.Url = CropFeatureImage(element.Formats.Large.Url)
  return element
}

func ConvertToGrayscale(url string) string {
  if url != "" {
    return strings.Replace(url, "upload/", "upload/e_grayscale/", 1)
  } else {
    return ""
  }
}

func GetRelatedEvents(topics []stru.Topic, allEvents []stru.ResponseEvents, slug string) []stru.Event {
  var list []stru.Event
  for _, t := range topics {
    for _, a := range allEvents {
      for _, s := range a.Topics {
        if s.Topic == t.Topic && a.Slug != slug {
          list = append(list, (stru.Event{Trim(a.Title), a.Slug}))
        }
      }
    }
  }
  return list
}

func GetRelatedProjects(topics []stru.Topic, allProjects []stru.ResponseProjects, slug string) []stru.Project {
  var list []stru.Project
  for _, t := range topics {
    for _, a := range allProjects {
      for _, s := range a.Topics {
        if s.Topic == t.Topic && a.Slug != slug {
          list = append(list, (stru.Project{Trim(a.Title), a.Slug}))
        }
      }
    }
  }
  return list
}

func CleanFolder(folder string) {
  err := os.RemoveAll(folder)
  if err != nil {
    log.Fatal(err)
  }

  err = os.Mkdir(folder, 0755)
  if err != nil {
    log.Fatal(err)
  }
}

func CreateFulltitle(title string, subtitle string) string {
  if subtitle == "" {
    return title
  } else {
    return fmt.Sprintf("%s: %s", title, subtitle)
  }
}

func CreateDescription(intro string) string {
  if intro == "" {
    println("Intro is missing")
  }
  return TruncateString(intro, 150)
}

func CreatePreviewImage(preview string, cover string) []string {
  if preview != "" {
    return []string{ConvertToPreviewImage(preview)}
  } else if cover != "" {
    return []string{ConvertToPreviewImage(cover)}
  } else {
    return []string{}
  }
}

func CreateHeaderImage(preview stru.Picture, cover stru.Picture, header stru.Picture) stru.Picture {
  if header.Url != "" {
    return header
  } else if preview.Url != "" {
    return preview
  } else if cover.Url != "" {
    return cover
  } else {
    return stru.Picture{}
  }
}

func CreateFeatureImage(cover stru.Picture, header stru.Picture, preview stru.Picture) stru.Picture {
  if cover.Url != "" {
    return ConvertToFeatureImage(cover)
  } else if header.Url != "" {
    return ConvertToFeatureImage(header)
  } else if preview.Url != "" {
    return ConvertToFeatureImage(preview)
  } else {
    return stru.Picture{}
  }
}

func CreateKeywordString(mediation string, keywords []stru.Keyword) string {
  var keyword string = ""
  for i := 0; i < len(keywords); i++ {
    keyword += keywords[i].Keyword
    if i < len(keywords) - 1 {
      keyword += ","
    }
  }
  keyword += ","
  keyword += mediation
  return keyword
}

func CreateTags(mediation string, keywords []stru.Keyword) []string {
  var tags []string
  for i := 0; i < len(keywords); i++ {
    tags = append(tags, keywords[i].Keyword)
  }
  tags = append(tags, mediation)
  return tags
}

// We need to Date property for sorting
// We use the start date if present, then the end date if present or the published date
func CreateDate(start string, end string, published string) string {
  if len(end) > 1 {
    return end
  } else if len(start) > 1 {
    return start
  } else {
    return published
  }
}

func reverseTypes(arr []stru.Type) []stru.Type{
  for i, j := 0, len(arr) - 1; i<j; i, j = i + 1, j - 1 {
    arr[i], arr[j] = arr[j], arr[i]
  }
  return arr
}

func CleanTypes(mediation string, types []stru.Type) []stru.Type {
  var list []stru.Type
  for _, c := range types {
    list = append(list, (stru.Type{Trim(c.Label), stringy.New(Trim(c.Label)).KebabCase().ToLower()}))
  }
  list = append(list, (stru.Type{strings.Title(Trim(mediation)), stringy.New(Trim(mediation)).KebabCase().ToLower()}))
  return reverseTypes(list)
}

func CleanEvents(events []stru.Event) []stru.Event {
  var list []stru.Event
  for _, c := range events {
    list = append(list, (stru.Event{Trim(c.Title), c.Slug}))
  }
  return list
}

func CleanAliases(aliases []stru.Aliases) []string {
  var list []string
  for _, c := range aliases {
    list = append(list, Trim(c.Aliases))
  }
  return list
}

func CleanProjects(projects []stru.Project) []stru.Project {
  var list []stru.Project
  for _, c := range projects {
    list = append(list, (stru.Project{Trim(c.Title), c.Slug}))
  }
  return list
}

func CleanMembers(members []stru.Member) []stru.Member {
  var list []stru.Member
  for _, c := range members {
    list = append(list, (stru.Member{Trim(c.Name), c.Slug, c.Twitter}))
  }
  return list
}

func CleanCollaborators(collaborators []stru.Collaborator) []stru.Collaborator {
  var list []stru.Collaborator
  for _, c := range collaborators {
    var label string = Trim(c.Label)
    var url string = Trim(c.Url)
    if !(label == "" && url == "") {
      url = FixExternalLink(url)
      list = append(list, (stru.Collaborator{label, url}))
    }
  }
  return list
}

func CleanLinks(Links []stru.Link) []stru.Link {
  var list []stru.Link
  for _, c := range Links {
    var label string = Trim(c.Label)
    var url string = Trim(c.Url)
    if !(label == "" && url == "") {
      url = FixExternalLink(url)
      list = append(list, (stru.Link{label, url}))
    }
  }
  return list
}

func CleanPressArticles(PressArticles []stru.PressArticle) []stru.PressArticle {
  var list []stru.PressArticle
  for _, c := range PressArticles {
    var label string = Trim(c.Label)
    var url string = Trim(c.Url)
    if !(label == "" && url == "") {
      url = FixExternalLink(url)
      list = append(list, (stru.PressArticle{label, url}))
    }
  }
  return list
}

func CleanFunders(Funders []stru.Funder) []stru.Funder {
  var list []stru.Funder
  for _, c := range Funders {
    var label string = Trim(c.Label)
    var url string = Trim(c.Url)
    if !(label == "" && url == "") {
      url = FixExternalLink(url)
      list = append(list, (stru.Funder{label, url}))
    }
  }
  return list
}

func WriteToMarkdown(folder string, slug string, file []byte, content string) {
  _ = ioutil.WriteFile(fmt.Sprintf("%s/%s.md", folder, slug), []byte(fmt.Sprintf("---\n%s\n---\n%s", file, content)), 0644)
}

func WriteLastMod(folder string, lastmod time.Time, title string) {
  var meta stru.Index
  meta.Title = title
  meta.Lastmod = lastmod.Format(time.RFC3339)
  file, _ := yaml.Marshal(meta)
  _ = ioutil.WriteFile(fmt.Sprintf("%s/_index.md", folder), []byte(fmt.Sprintf("---\n%s---", file)), 0644)
}

func GetLastmod(updatedAt string, lastmod time.Time) time.Time {
  Updated_at, _ := time.Parse(time.RFC3339, updatedAt)
  if Updated_at.After(lastmod) {
    return Updated_at
  } else {
    return lastmod
  }
}

