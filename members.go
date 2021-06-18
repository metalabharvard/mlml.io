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

type Event struct {
  Title string `json:"title"`
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

type Picture struct {
  AlternativeText string `json:"alternativeText"`
  Url string `json:"url"`
  Width int `json:"width"`
  Height int `json:"height"`
  Formats Formats `json:"formats"`
}

type Response struct {
  Name string `json:"name"`
  Roles []Role `json:"roles"`
  Twitter string `json:"twitter"`
  Mail string `json:"email"`
  Website string `json:"website"`
  Instagram string `json:"instagram"`
  Start string `json:"start"`
  Description bool `json:"description"`
  Updated_at string `json:"updated_at"`
  Created_at string `json:"created_at"`
  Slug string `json:"slug"`
  Events []Event `json:"events"`
  Projects []Project `json:"projects"`
  Picture Picture `json:"picture"`
}

func main() {
  response, err := http.Get("https://metalab-strapi.herokuapp.com/members")

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
    _ = ioutil.WriteFile(fmt.Sprintf("content/members/%s.md", element.Slug), file, 0644)
  }
}