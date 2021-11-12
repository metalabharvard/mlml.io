package main

import (
  "encoding/json"
  "fmt"
  "io/ioutil"
  "log"
  "sort"
  "net/http"
  "os"
  "time"
  "gopkg.in/yaml.v3"
  "strings"
)

type Funder struct {
  Label string `yaml:"label"`
  Url string `yaml:"url"`
}

type Collaborator struct {
  Label string `yaml:"label"`
  Url string `yaml:"url"`
}

type PressArticle struct {
  Label string `yaml:"label"`
  Url string `yaml:"url"`
}

type Link struct {
  Label string `yaml:"label"`
  Url string `yaml:"url"`
}

type Member struct {
  Name string `yaml:"label"` // Careful: We are renaming the key here
  Slug string `yaml:"slug"`
  Twitter string `yaml:"twitter"`
}

type Event struct {
  Title string `yaml:"label"` // Careful: We are renaming the key here
  Slug string `yaml:"slug"`
}

type Project struct {
  Title string `yaml:"label"` // Careful: We are renaming the key here
  Slug string `yaml:"slug"`
}

type Format struct {
  Url string `yaml:"url,omitempty"`
  Ext string `yaml:"ext,omitempty"`
  Width int `yaml:"width,omitempty"`
  Height int `yaml:"height,omitempty"`
}

type Formats struct {
  Large Format `yaml:"large,omitempty"`
  Medium Format `yaml:"medium,omitempty"`
  Small Format `yaml:"small,omitempty"`
  Thumbnail Format `yaml:"thumbnail,omitempty"`
}

type Cover struct {
  AlternativeText string `yaml:"alternativeText,omitempty"`
  Url string `yaml:"url,omitempty"`
  Width int `yaml:"width,omitempty"`
  Height int `yaml:"height,omitempty"`
  Formats Formats `yaml:"formats,omitempty"`
}

type Topic struct {
  Topic string `yaml:"topic,omitempty"`
}

type Response struct {
  Title string `yaml:"title"`
  Subtitle string `yaml:"subtitle"`
  Fulltitle string `yaml:"fulltitle"`
  Intro string `yaml:"intro"`
  Start string `yaml:"start"`
  End string `yaml:"end"`
  DateString string `yaml:"datestring"`
  Description string `yaml:"description,omitempty"`
  Location string `yaml:"location"`
  Host string `yaml:"host"`
  Mediation string `yaml:"mediation"`
  Type string `yaml:"category"`
  IsFeatured bool `yaml:"isFeatured"`
  ExternalLink string `yaml:"externalLink"`
  Updated_at string `yaml:"updated_at,omitempty"`
  Created_at string `yaml:"created_at,omitempty"`
  Published_at string `yaml:"published_at,omitempty"` // Deleted by this script
  Lastmod string `yaml:"lastmod"`
  Date string `yaml:"date"`
  Slug string `yaml:"slug"`
  Collaborators []Collaborator `yaml:"collaborators,omitempty"`
  PressArticles []PressArticle `yaml:"press_articles,omitempty"`
  Links []Link `yaml:"links,omitempty"`
  Events []Event `yaml:"events,omitempty"`
  Members []Member `yaml:"members,omitempty"`
  Projects []Project `yaml:"projects,omitempty"`
  Cover Cover `yaml:"cover,omitempty"`
  Preview Cover `yaml:"preview,omitempty"`
  Topics []Topic `yaml:"topics,omitempty"`
  Gallery []Cover `yaml:"gallery,omitempty"`
  Funders []Funder `yaml:"funders,omitempty"`
  MembersTwitter []string `yaml:"members_twitter,omitempty"`
  Images []string `yaml:"images,omitempty"`
}

type Index struct {
  Lastmod string `yaml:"lastmod"`
}

type EventsByName []Event

func (a EventsByName) Len() int           { return len(a) }
func (a EventsByName) Less(i, j int) bool { return a[i].Title < a[j].Title }
func (a EventsByName) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }

type MembersByName []Member

func (a MembersByName) Len() int           { return len(a) }
func (a MembersByName) Less(i, j int) bool { return a[i].Name < a[j].Name }
func (a MembersByName) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }

type ProjectsByName []Project

func (a ProjectsByName) Len() int           { return len(a) }
func (a ProjectsByName) Less(i, j int) bool { return a[i].Title < a[j].Title }
func (a ProjectsByName) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }

// func getTopicIDs(topics []Topic) []string {
//   vsm := make([]string, len(topics))
//   for i, v := range topics {
//     vsm[i] = v.Topic
//   }
//   return vsm
// }

func getRelatedProjects(topics []Topic, allProjects []Response, slug string) []Project {
  var list []Project
  for _, t := range topics {
    // println(fmt.Sprintf("%s looking for topics", t.Topic))
    for _, a := range allProjects {
      for _, s := range a.Topics {
        if s.Topic == t.Topic && a.Slug != slug {
          // println(fmt.Sprintf("%s found in %s", t.Topic, a.Title))
          // fmt.Println(Project{a.Title, a.Slug})
          list = append(list, (Project{a.Title, a.Slug}))
        }
      }
    }
  }
  return list
}

func getDateYear(date time.Time) string {
  return date.Format("2006")
}

func getDateMonth(date time.Time) string {
  return date.Format("Jan")
}

func getDateFull(date time.Time) string {
  return date.Format("2006-Jan")
}

func getDatePrint(date time.Time) string {
  return date.Format("January 2006")
}

func getDateMonthPrint(date time.Time) string {
  return date.Format("January")
}

const shortForm = "2006-01-02"

func createTimeString(start string, end string) string {
  if (start != "" && end != "") {
    s, _ := time.Parse(shortForm, start)
    e, _ := time.Parse(shortForm, end)
    if getDateFull(s) == getDateFull(e) {
      return getDatePrint(s)
    } else {
      if (getDateYear(s) == getDateYear(e)) {
        return fmt.Sprintf("%s&ensp;–&ensp;%s", getDateMonthPrint(s), getDatePrint(e))
      } else {
        return fmt.Sprintf("%s&ensp;–&ensp;%s", getDatePrint(s), getDatePrint(e))
      }
    }
    return shortForm
  } else if (start != "") {
    s, _ := time.Parse(shortForm, start)
    return fmt.Sprintf("Since %s", getDatePrint(s))
  } else if (end != "") {
    e, _ := time.Parse(shortForm, end)
    return getDatePrint(e)
  } else {
    return ""
  }
}

func checkDates(start string, end string) bool {
  s, _ := time.Parse(shortForm, start)
  e, _ := time.Parse(shortForm, end)
  return s.After(e)
}

func trim(str string) string {
  return strings.TrimSpace(str)
}

func getMembersTwitter(members []Member) []string {
  var list []string
  for _, c := range members {
    if c.Twitter != "" {
      list = append(list, c.Twitter)
    }
  }
  return list
}

func cleanCollaborators(collaborators []Collaborator) []Collaborator {
  var list []Collaborator
  for _, c := range collaborators {
    list = append(list, (Collaborator{trim(c.Label), trim(c.Url)}))
  }
  return list
}

func cleanLinks(Links []Link) []Link {
  var list []Link
  for _, c := range Links {
    list = append(list, (Link{trim(c.Label), trim(c.Url)}))
  }
  return list
}

func cleanPressArticles(PressArticles []PressArticle) []PressArticle {
  var list []PressArticle
  for _, c := range PressArticles {
    list = append(list, (PressArticle{trim(c.Label), trim(c.Url)}))
  }
  return list
}

func cleanFunders(Funders []Funder) []Funder {
  var list []Funder
  for _, c := range Funders {
    list = append(list, (Funder{trim(c.Label), trim(c.Url)}))
  }
  return list
}

func convertToPreviewImage(url string) string {
  var str string = strings.Replace(url, "upload/", "upload/ar_1200:600,c_crop/c_limit,h_1200,w_600/", 1)
  str = strings.Replace(str, ".gif", ".jpg", 1)
  return str
}

func main() {
  println("Requesting projects")
  response, err := http.Get("https://metalab-strapi.herokuapp.com/projects")

  var Lastmod time.Time;

  if err != nil {
    fmt.Print(err.Error())
    os.Exit(1)
  }

  responseData, err := ioutil.ReadAll(response.Body)
  if err != nil {
    log.Fatal(err)
  }

  FOLDER := "content/projects/"

  err = os.RemoveAll(FOLDER)
  if err != nil {
    log.Fatal(err)
  }

  err = os.Mkdir(FOLDER, 0755)
  if err != nil {
    log.Fatal(err)
  }

  var responseObject []Response
  json.Unmarshal(responseData, &responseObject)

  for _, element := range responseObject {
    Updated_at, _ := time.Parse(time.RFC3339, element.Updated_at)
    if Updated_at.After(Lastmod) {
      Lastmod = Updated_at
    }
    content := element.Description

    element.Description = ""

    element.Date = element.Created_at
    if len(element.Start) > 1 {
      element.Date = element.Start
    } else if len(element.End) > 1 {
      element.Date = element.End
    } else {
      element.Date = element.Published_at
    }
    element.Lastmod = element.Updated_at

    element.Created_at = ""
    element.Updated_at = ""
    element.Published_at = ""

    element.Projects = getRelatedProjects(element.Topics, responseObject, element.Slug)
    element.Topics = nil

    element.Collaborators = cleanCollaborators(element.Collaborators)
    element.Links = cleanLinks(element.Links)
    element.PressArticles = cleanPressArticles(element.PressArticles)
    element.Funders = cleanFunders(element.Funders)

    element.Host = trim(element.Host)
    element.ExternalLink = trim(element.ExternalLink)

    sort.Sort(MembersByName(element.Members))
    sort.Sort(EventsByName(element.Events))
    sort.Sort(ProjectsByName(element.Projects))

    element.DateString = createTimeString(element.Start, element.End)

    element.MembersTwitter = getMembersTwitter(element.Members)

    if element.Preview.Url != "" {
      element.Images = []string{convertToPreviewImage(element.Preview.Url)}
    } else if element.Cover.Url != "" {
      element.Images = []string{convertToPreviewImage(element.Cover.Url)}
    }
    element.Preview = Cover{}

    if element.Subtitle == "" {
      element.Fulltitle = element.Title
    } else {
      element.Fulltitle = fmt.Sprintf("%s: %s", element.Title, element.Subtitle)
    }

    if checkDates(element.Start, element.End) {
      println(fmt.Sprintf("%s has wrong dates", element.Title))
    }

    file, _ := yaml.Marshal(element)
    _ = ioutil.WriteFile(fmt.Sprintf("%s/%s.md", FOLDER, element.Slug), []byte(fmt.Sprintf("---\n%s\n---\n%s", file, content)), 0644)
  }

  var meta Index
  meta.Lastmod = Lastmod.Format(time.RFC3339)
  file, _ := yaml.Marshal(meta)
  _ = ioutil.WriteFile(fmt.Sprintf("%s/_index.md", FOLDER), []byte(fmt.Sprintf("---\n%s---", file)), 0644)
  println(fmt.Sprintf("%d elements added", len(responseObject)))
  println("Requesting projects finished")
}