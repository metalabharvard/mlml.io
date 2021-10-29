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
  "strings"
  "gopkg.in/yaml.v3"
)

type Project struct {
  Title string `yaml:"label"`
  Slug string `yaml:"slug"`
}

type Member struct {
  Name string `yaml:"label"`
  Slug string `yaml:"slug"`
}

type Event struct {
  Title string `yaml:"label"`
  Slug string `yaml:"slug"`
}

type Link struct {
  Label string `yaml:"label"`
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
  Time string `yaml:"time,omitempty"` // TODO: Delete this?
  Start_Time string `yaml:"start_time,omitempty"`
  Start_TimeUTC string `yaml:"start_time_utc,omitempty"`
  Start_TimeLocations Times `yaml:"start_time_locations,omitempty"`
  End_Time string `yaml:"end_time,omitempty"`
  End_TimeUTC string `yaml:"end_time_utc,omitempty"`
  End_TimeLocations Times `yaml:"end_time_locations,omitempty"`
  Timezone string `yaml:"timezone,omitempty"`
  TimezoneID string `yaml:"tzid,omitempty"`
  Intro string `yaml:"intro,omitempty"`
  Location string `yaml:"location,omitempty"`
  Category string `yaml:"category,omitempty"`
  Link string `yaml:"externalLink,omitempty"`
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
  Events []Event `yaml:"events,omitempty"`
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

type ProjectsByName []Project

func (a ProjectsByName) Len() int           { return len(a) }
func (a ProjectsByName) Less(i, j int) bool { return a[i].Title < a[j].Title }
func (a ProjectsByName) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }

type MembersByName []Member

func (a MembersByName) Len() int           { return len(a) }
func (a MembersByName) Less(i, j int) bool { return a[i].Name < a[j].Name }
func (a MembersByName) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }

// func getTopicIDs(topics []Topic) []string {
//   vsm := make([]string, len(topics))
//   for i, v := range topics {
//     vsm[i] = v.Topic
//   }
//   return vsm
// }

func getRelatedEvents(topics []Topic, allEvents []Response, slug string) []Event {
  var list []Event
  for _, t := range topics {
    // println(fmt.Sprintf("%s looking for events", t.Topic))
    for _, a := range allEvents {
      for _, s := range a.Topics {
        if s.Topic == t.Topic && a.Slug != slug {
          // println(fmt.Sprintf("%s found in %s", t.Topic, a.Title))
          // fmt.Println(Event{a.Title, a.Slug})
          list = append(list, (Event{a.Title, a.Slug}))
        }
      }
    }
  }
  return list
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

  FOLDER := "content/events/"

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

    element.Events = getRelatedEvents(element.Topics, responseObject, element.Slug)

    element.Topics = nil

    sort.Sort(MembersByName(element.Members))
    sort.Sort(ProjectsByName(element.Projects))

    file, _ := yaml.Marshal(element)
    _ = ioutil.WriteFile(fmt.Sprintf("%s/%s.md", FOLDER, element.Slug), []byte(fmt.Sprintf("---\n%s---\n%s", file, content)), 0644)
  }

  var meta Index
  meta.Lastmod = Lastmod.Format(time.RFC3339)
  file, _ := yaml.Marshal(meta)
  _ = ioutil.WriteFile(fmt.Sprintf("%s/_index.md", FOLDER), []byte(fmt.Sprintf("---\n%s---", file)), 0644)
  println(fmt.Sprintf("%d elements added", len(responseObject)))
  println("Requesting events finished")
}
