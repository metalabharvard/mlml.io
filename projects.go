package main

import (
  "encoding/json"
  "fmt"
  "io/ioutil"
  "log"
  "net/http"
  "os"
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
  Url string `json:"url"`
  Ext string `json:"ext"`
  Width int `json:"width"`
  Height int `json:"height"`
}

type Formats struct {
  Large Format `json:"large"`
  Medium Format `json:"medium"`
  Small Format `json:"small"`
  Thumbnail Format `json:"thumbnail"`
}

type Cover struct {
  AlternativeText string `json:"alternativeText"`
  Url string `json:"url"`
  Width int `json:"width"`
  Height int `json:"height"`
  Formats Formats `json:"formats"`
}

type Response struct {
  Title string `json:"title"`
  Intro string `json:"intro"`
  Start string `json:"start"`
  End string `json:"end"`
  Link string `json:"link"`
  Description string `json:"description"`
  Location string `json:"location"`
  Type string `json:"category"`
  IsFeatured bool `json:"isFeatured"`
  ExternalLink string `json:"externalLink"`
  Updated_at string `json:"updated_at"`
  Created_at string `json:"created_at"`
  Slug string `json:"slug"`
  Collaborators []Collaborator `json:"collaborators"`
  PressArticle []PressArticle `json:"press_articles"`
  Links []Link `json:"links"`
  Events []Event `json:"events"`
  Members []Member `json:"members"`
  Cover Cover `json:"cover"`
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
    file, _ := json.MarshalIndent(element, "", " ")
    _ = ioutil.WriteFile(fmt.Sprintf("content/projects/%s.md", element.Slug), file, 0644)
  }
}