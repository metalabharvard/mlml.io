package main

import (
  "encoding/json"
  "fmt"
  "io/ioutil"
  "log"
  "net/http"
  "os"
  "time"
  "gopkg.in/yaml.v3"
)

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
  Name string `yaml:"name"`
  Slug string `yaml:"slug"`
  IsAlumnus bool `yaml:"isAlumnus"`
}

type Event struct {
  Title string `yaml:"title"`
  Slug string `yaml:"slug"`
}

type Project struct {
  Title string `yaml:"title"`
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
  Intro string `yaml:"intro"`
  Start string `yaml:"start"`
  End string `yaml:"end"`
  Link string `yaml:"link,omitempty"`
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
  PressArticle []PressArticle `yaml:"press_articles,omitempty"`
  Links []Link `yaml:"links,omitempty"`
  Events []Event `yaml:"events,omitempty"`
  Members []Member `yaml:"members,omitempty"`
  Projects []Project `yaml:"projects,omitempty"`
  Cover Cover `yaml:"cover,omitempty"`
  Topics []Topic `yaml:"topics,omitempty"`
  Gallery []Cover `yaml:"gallery,omitempty"`
}

type Index struct {
  Lastmod string `yaml:"lastmod"`
}

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