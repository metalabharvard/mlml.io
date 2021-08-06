package main

import (
  "encoding/json"
  "fmt"
  "io/ioutil"
  "log"
  "net/http"
  "os"
  "github.com/goccy/go-yaml"
)

type Collaborator struct {
  Name string `json:"name"`
  Url string `json:"url"`
}

type PressArticle struct {
  Text string `json:"text"`
  Url string `json:"url"`
}

type Link struct {
  Text string `json:"text"`
  Url string `json:"url"`
}

type Member struct {
  Name string `json:"name"`
  Slug string `json:"slug"`
  IsAlumnus bool `json:"isAlumnus"`
}

type Event struct {
  Title string `json:"title"`
  Slug string `json:"slug"`
}

type Format struct {
  Url string `json:"url,omitempty"`
  Ext string `json:"ext,omitempty"`
  Width int `json:"width,omitempty"`
  Height int `json:"height,omitempty"`
}

type Formats struct {
  Large Format `json:"large,omitempty"`
  Medium Format `json:"medium,omitempty"`
  Small Format `json:"small,omitempty"`
  Thumbnail Format `json:"thumbnail,omitempty"`
}

type Cover struct {
  AlternativeText string `json:"alternativeText,omitempty"`
  Url string `json:"url,omitempty"`
  Width int `json:"width,omitempty"`
  Height int `json:"height,omitempty"`
  Formats Formats `json:"formats,omitempty"`
}

type Response struct {
  Title string `json:"title"`
  Intro string `json:"intro"`
  Start string `json:"start"`
  End string `json:"end"`
  Link string `json:"link,omitempty"`
  Description string `json:"description,omitempty"`
  Location string `json:"location"`
  Type string `json:"category"`
  IsFeatured bool `json:"isFeatured"`
  ExternalLink string `json:"externalLink"`
  Updated_at string `json:"updated_at,omitempty"`
  Created_at string `json:"created_at,omitempty"`
  Lastmod string `json:"lastmod"`
  Date string `json:"date"`
  Slug string `json:"slug"`
  Collaborators []Collaborator `json:"collaborators,omitempty"`
  PressArticle []PressArticle `json:"press_articles,omitempty"`
  Links []Link `json:"links,omitempty"`
  Events []Event `json:"events,omitempty"`
  Members []Member `json:"members,omitempty"`
  Cover Cover `json:"cover,omitempty"`
}

func main() {
  response, err := http.Get("https://metalab-strapi.herokuapp.com/projects")

  if err != nil {
    fmt.Print(err.Error())
    os.Exit(1)
  }

  responseData, err := ioutil.ReadAll(response.Body)
  if err != nil {
    log.Fatal(err)
  }

  var responseObject []Response
  json.Unmarshal(responseData, &responseObject)

  for _, element := range responseObject {
    content := element.Description

    element.Description = ""

    element.Date = element.Created_at
    element.Lastmod = element.Updated_at

    element.Created_at = ""
    element.Updated_at = ""

    file, _ := yaml.Marshal(element)
    _ = ioutil.WriteFile(fmt.Sprintf("content/projects/%s.md", element.Slug), []byte(fmt.Sprintf("---\n%s\n---\n%s", file, content)), 0644)
  }
}