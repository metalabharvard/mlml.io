package main

import (
  "encoding/json"
  "fmt"
  "io/ioutil"
  "log"
  "net/http"
  "os"
  "time"
  "strings"
  "github.com/goccy/go-yaml"
)

type Project struct {
  Title string `json:"title"`
  Slug string `json:"slug"`
}

type Member struct {
  Name string `json:"name"`
  Slug string `json:"slug"`
  IsAlumnus bool `json:"isAlumnus"`
}

type Link struct {
  Text string `json:"text"`
  Url string `json:"url"`
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

type Times struct {
  Berlin string `json:"berlin"`
  NewYork string `json:"new_york"`
  London string `json:"london"`
  LosAngeles string `json:"los_angeles"`
}

type Response struct {
  Title string `json:"title"`
  Time string `json:"time"`
  StartTime string `json:"start_time"`
  StartTimeLocations Times `json:"start_time_locations"`
  EndTime string `json:"end_time"`
  Timezone string `json:"timezone"`
  Intro string `json:"intro"`
  Location string `json:"location"`
  Link string `json:"link"`
  Description string `json:"description,omitempty"`
  IsFeatured bool `json:"isFeatured"`
  IsOngoing bool `json:"isOngoing"`
  Updated_at string `json:"updated_at,omitempty"`
  Created_at string `json:"created_at,omitempty"`
  Lastmod string `json:"lastmod"`
  Date string `json:"date"`
  Slug string `json:"slug"`
  Members []Member `json:"members,omitempty"`
  Projects []Project `json:"projects,omitempty"`
  Cover Cover `json:"cover,omitempty"`
  YouTube string `json:"youtube,omitempty"`
  Vimeo string `json:"vimeo,omitempty"`
  Links []Link `json:"links,omitempty"`
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

  locBerlin, _ := time.LoadLocation("Europe/Berlin")
  locLondon, _ := time.LoadLocation("Europe/London")
  locNewYork, _ := time.LoadLocation("America/New_York")
  locLosAngeles, _ := time.LoadLocation("America/Los_Angeles")
  // locDefault, _ := time.LoadLocation("UTC")

  for _, element := range responseObject {
    if len(element.StartTime) > 1 {
      fmt.Println(element.StartTime)
      // loc := locDefault
      s := element.StartTime
      tz := "UTC"
      switch element.Timezone {
      case "Berlin":
        // loc = locBerlin
        s = strings.Replace(s, "Z", "+02:00", 1)
        tz = "CEST"
        println("It’s in Berlin!")
      case "London":
        // loc = locLondon
        println("It’s in London!")
        s = strings.Replace(s, "Z", "+01:00", 1)
        tz = "BST"
      case "New_York":
        // loc = locNewYork
        println("It’s in New York!")
        s = strings.Replace(s, "Z", "-04:00", 1)
        tz = "EDT"
      case "Los_Angeles":
        // loc = locLosAngeles
        println("It’s in Los Angeles!")
        s = strings.Replace(s, "Z", "-07:00", 1)
        tz = "PDT"
      }
      t, _ := time.Parse(time.RFC3339, s)
      element.StartTime = t.Format(time.RFC3339)
      element.StartTimeLocations.Berlin = t.In(locBerlin).Format(time.RFC3339)
      element.StartTimeLocations.London = t.In(locLondon).Format(time.RFC3339)
      element.StartTimeLocations.NewYork = t.In(locNewYork).Format(time.RFC3339)
      element.StartTimeLocations.LosAngeles = t.In(locLosAngeles).Format(time.RFC3339)
      element.Timezone = tz
      fmt.Println(t)
      fmt.Println(t.In(locBerlin))
      fmt.Println(t.In(locLondon))
      fmt.Println(t.In(locNewYork))
      fmt.Println(t.In(locLosAngeles))
    }

    content := element.Description

    element.Description = ""

    element.Date = element.Created_at
    element.Lastmod = element.Updated_at

    element.Created_at = ""
    element.Updated_at = ""

    file, _ := yaml.Marshal(element)
    _ = ioutil.WriteFile(fmt.Sprintf("content/events/%s.md", element.Slug), []byte(fmt.Sprintf("---\n%s\n---\n%s", file, content)), 0644)
  }
}