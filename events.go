package main

import (
  "encoding/json"
  "fmt"
  "io/ioutil"
  "log"
  "net/http"
  "os"
)

type Project struct {
  Title string `json:"title"`
  Slug string `json:"slug"`
}

type Member struct {
  Name string `json:"name"`
  Slug string `json:"slug"`
}

type Role struct {
  Role string `json:"role"`
  Position int `json:"position"`
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
  Time string `json:"time"`
  Intro string `json:"intro"`
  Location string `json:"location"`
  Link string `json:"link"`
  Description string `json:"description"`
  IsFeatured bool `json:"isFeatured"`
  IsOngoing bool `json:"isOngoing"`
  Updated_at string `json:"updated_at"`
  Created_at string `json:"created_at"`
  Slug string `json:"slug"`
  Members []Member `json:"members"`
  Projects []Project `json:"projects"`
  Cover Cover `json:"cover"`
}

func main() {
  response, err := http.Get("https://metalab-strapi.herokuapp.com/events")

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
    _ = ioutil.WriteFile(fmt.Sprintf("content/events/%s.md", element.Slug), file, 0644)
  }
}