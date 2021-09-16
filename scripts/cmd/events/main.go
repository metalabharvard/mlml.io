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
  "gopkg.in/yaml.v3"
)

type Project struct {
  Title string `yaml:"title"`
  Slug string `yaml:"slug"`
}

type Member struct {
  Name string `yaml:"name"`
  Slug string `yaml:"slug"`
  IsAlumnus bool `yaml:"isAlumnus"`
}

type Link struct {
  Text string `yaml:"text"`
  Url string `yaml:"url"`
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

type Times struct {
  Berlin string `yaml:"berlin"`
  NewYork string `yaml:"new_york"`
  London string `yaml:"london"`
  LosAngeles string `yaml:"los_angeles"`
}

type Topic struct {
  Topic string `yaml:"topic,omitempty"`
}

type Response struct {
  Title string `yaml:"title"`
  Outputs [2]string `yaml:outputs` // Added by this script
  Time string `yaml:"time"` // TODO: Delete this?
  Start_Time string `yaml:"start_time"`
  Start_TimeUTC string `yaml:"start_time_utc"`
  Start_TimeLocations Times `yaml:"start_time_locations"`
  End_Time string `yaml:"end_time"`
  End_TimeUTC string `yaml:"end_time_utc"`
  End_TimeLocations Times `yaml:"end_time_locations"`
  Timezone string `yaml:"timezone"`
  TimezoneID string `yaml:"tzid"`
  Intro string `yaml:"intro"`
  Location string `yaml:"location"`
  Host string `yaml:"host"`
  Category string `yaml:"category"`
  Link string `yaml:"link"`
  Description string `yaml:"description,omitempty"`
  IsFeatured bool `yaml:"isFeatured"`
  IsOngoing bool `yaml:"isOngoing"`
  Updated_at string `yaml:"updated_at,omitempty"` // Deleted by this script
  Created_at string `yaml:"created_at,omitempty"` // Deleted by this script
  Published_at string `yaml:"published_at,omitempty"` // Deleted by this script
  Lastmod string `yaml:"lastmod"` // Added by this script
  Date string `yaml:"date"` // Added by this script
  Slug string `yaml:"slug"`
  Members []Member `yaml:"members,omitempty"`
  Projects []Project `yaml:"projects,omitempty"`
  Cover Cover `yaml:"cover,omitempty"`
  YouTube string `yaml:"youtube,omitempty"`
  Vimeo string `yaml:"vimeo,omitempty"`
  Links []Link `yaml:"links,omitempty"`
  Topics []Topic `yaml:"topics,omitempty"`
  TopicIDs []string `yaml:"topicIDs,omitempty"`
}

type Index struct {
  Lastmod string `yaml:"lastmod"`
}

func getTopicIDs(topics []Topic) []string {
  vsm := make([]string, len(topics))
  for i, v := range topics {
    vsm[i] = v.Topic
  }
  return vsm
}

func main() {
  println("Requesting events")
  response, err := http.Get("https://metalab-strapi.herokuapp.com/events")

  var Lastmod time.Time;

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

  for _, element := range responseObject {
    Updated_at, _ := time.Parse(time.RFC3339, element.Updated_at)
    if Updated_at.After(Lastmod) {
      Lastmod = Updated_at
    }
    if len(element.Start_Time) > 1 {
      s := element.Start_Time
      tz := "UTC"
      tzid := "UTC"
      switch element.Timezone {
      case "Berlin":
        s = strings.Replace(s, "Z", "+02:00", 1)
        tz = "CEST"
        tzid = "Europe/Berlin"
        // println("It’s in Berlin!")
      case "London":
        // println("It’s in London!")
        s = strings.Replace(s, "Z", "+01:00", 1)
        tz = "BST"
        tzid = "Europe/London"
      case "New_York":
        // println("It’s in New York!")
        s = strings.Replace(s, "Z", "-04:00", 1)
        tz = "EDT"
        tzid = "America/New_York"
      case "Los_Angeles":
        // println("It’s in Los Angeles!")
        s = strings.Replace(s, "Z", "-07:00", 1)
        tz = "PDT"
        tzid = "America/Los_Angeles"
      }
      t, _ := time.Parse(time.RFC3339, s)
      element.Start_TimeUTC = t.Format("20060102T150405Z")
      element.Start_Time = t.Format(time.RFC3339)
      element.Start_TimeLocations.Berlin = t.In(locBerlin).Format(time.RFC3339)
      element.Start_TimeLocations.London = t.In(locLondon).Format(time.RFC3339)
      element.Start_TimeLocations.NewYork = t.In(locNewYork).Format(time.RFC3339)
      element.Start_TimeLocations.LosAngeles = t.In(locLosAngeles).Format(time.RFC3339)
      element.Timezone = tz
      element.TimezoneID = tzid
      element.End_TimeUTC = t.Add(time.Hour * 2).Format("20060102T150405Z") // TODO
    }

    content := element.Description

    element.Description = ""

    if len(element.Start_Time) > 1 {
      element.Date = element.Start_Time
    } else if len(element.End_Time) > 1 {
      element.Date = element.End_Time
    } else {
      element.Date = element.Published_at
    }
    element.Lastmod = element.Updated_at

    element.Created_at = ""
    element.Updated_at = ""
    element.Published_at = ""

    element.Outputs = [2]string{"HTML", "Calendar"}

    element.TopicIDs = getTopicIDs(element.Topics)

    element.Topics = nil

    file, _ := yaml.Marshal(element)
    _ = ioutil.WriteFile(fmt.Sprintf("content/events/%s.md", element.Slug), []byte(fmt.Sprintf("---\n%s---\n%s", file, content)), 0644)
  }

  var meta Index
  meta.Lastmod = Lastmod.Format(time.RFC3339)
  file, _ := yaml.Marshal(meta)
  _ = ioutil.WriteFile("content/events/_index.md", []byte(fmt.Sprintf("---\n%s---", file)), 0644)
  println("Requesting events finished")
}
