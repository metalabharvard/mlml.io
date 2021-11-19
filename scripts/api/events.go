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
  stru "api/structs"
)

type Project struct {
  Title string `yaml:"label"`
  Slug string `yaml:"slug"`
}

type Member struct {
  Name string `yaml:"label"`
  Slug string `yaml:"slug"`
  Twitter string `yaml:"twitter"`
}

type Event struct {
  Title string `yaml:"label"`
  Slug string `yaml:"slug"`
}

type Link struct {
  Label string `yaml:"label"`
  Url string `yaml:"url"`
}

type Times struct {
  Berlin string `yaml:"berlin"`
  Boston string `yaml:"boston"`
  // London string `yaml:"london"`
  // LosAngeles string `yaml:"los_angeles"`
}

type Topic struct {
  Topic string `yaml:"topic,omitempty"`
}

type Response struct {
  Title string `yaml:"title"`
  Subtitle string `yaml:"subtitle"`
  Fulltitle string `yaml:"fulltitle"`
  Status string `yaml:"status"`
  Outputs [2]string `yaml:outputs` // Added by this script
  // Time string `yaml:"time,omitempty"` // TODO: Delete this?
  Timezone string `yaml:"timezone,omitempty"`
  Start_Time string `yaml:"start_time,omitempty"` // This is used in the template to detect if start is present
  End_Time string `yaml:"end_time,omitempty"`
  Start_TimeUTC string `yaml:"start_time_utc,omitempty"` // Used for the iCal Event
  End_TimeUTC string `yaml:"end_time_utc,omitempty"` // Used for the iCal Event
  Start_TimeLocations Times `yaml:"start_time_locations,omitempty"` // This is used for the tabs
  End_TimeLocations Times `yaml:"end_time_locations,omitempty"` // This is used for the tabs
  TimezoneID string `yaml:"tzid,omitempty"` // Used for the iCal Event. Be aware of the renaming.
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
  Cover stru.Picture `yaml:"cover,omitempty"`
  Preview stru.Picture `yaml:"preview,omitempty"`
  YouTube string `yaml:"youtube,omitempty"`
  Vimeo string `yaml:"vimeo,omitempty"`
  Links []Link `yaml:"links,omitempty"`
  Topics []Topic `yaml:"topics,omitempty"`
  TopicIDs []string `yaml:"topicIDs,omitempty"`
  MembersTwitter []string `yaml:"members_twitter,omitempty"`
  Images []string `yaml:"images,omitempty"`
}

func trim(str string) string {
  return strings.TrimSpace(str)
}

func convertToPreviewImage(url string) string {
  var str string = strings.Replace(url, "upload/", "upload/ar_1200:600,c_crop/c_limit,h_1200,w_600/", 1)
  str = strings.Replace(str, ".gif", ".jpg", 1)
  return str
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

type EventsByName []Event

func (a EventsByName) Len() int           { return len(a) }
func (a EventsByName) Less(i, j int) bool { return a[i].Title < a[j].Title }
func (a EventsByName) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }

// func getTopicIDs(topics []Topic) []string {
//   vsm := make([]string, len(topics))
//   for i, v := range topics {
//     vsm[i] = v.Topic
//   }
//   return vsm
// }

func getMembersTwitter(members []Member) []string {
  var list []string
  for _, c := range members {
    if c.Twitter != "" {
      list = append(list, c.Twitter)
    }
  }
  return list
}


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

  FOLDER := "../../content/events/"

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
  locBoston, _ := time.LoadLocation("America/New_York")

  for _, element := range responseObject {
    Updated_at, _ := time.Parse(time.RFC3339, element.Updated_at)
    if Updated_at.After(Lastmod) {
      Lastmod = Updated_at
    }
    if len(element.Start_Time) > 1 {
      s := element.Start_Time
      e := element.Start_Time
      hasEndTime := element.End_Time != ""
      if hasEndTime {
        e = element.End_Time
      }
      tzid := "UTC"
      switch element.Timezone {
      case "Berlin":
        s = strings.Replace(s, "Z", "+02:00", 1)
        e = strings.Replace(e, "Z", "+02:00", 1)
        tzid = "Europe/Berlin"
      case "Boston":
        s = strings.Replace(s, "Z", "-04:00", 1)
        e = strings.Replace(e, "Z", "-04:00", 1)
        tzid = "America/Boston"
      }
      ts, _ := time.Parse(time.RFC3339, s)
      te, _ := time.Parse(time.RFC3339, e)
      // These are used for the iCal event
      element.Start_TimeUTC = ts.Format("20060102T150405Z")
      if hasEndTime {
        element.End_TimeUTC = te.Format("20060102T150405Z")
      } else {
        // Because we need a end time for the iCal event, we just add one hour to the start time
        element.End_TimeUTC = ts.Add(time.Hour * 1).Format("20060102T150405Z")
      }
      // These are used for the iCal event
      element.TimezoneID = tzid

      element.Start_Time = ts.Format(time.RFC3339)
      element.End_Time = te.Format(time.RFC3339)

      // This is used for the tabs
      element.Start_TimeLocations.Berlin = ts.In(locBerlin).Format(time.RFC3339)
      element.Start_TimeLocations.Boston = ts.In(locBoston).Format(time.RFC3339)
      element.End_TimeLocations.Berlin = te.In(locBerlin).Format(time.RFC3339)
      element.End_TimeLocations.Boston = te.In(locBoston).Format(time.RFC3339)
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

    element.Link = trim(element.Link)

    sort.Sort(MembersByName(element.Members))
    sort.Sort(ProjectsByName(element.Projects))
    sort.Sort(EventsByName(element.Events))

    element.MembersTwitter = getMembersTwitter(element.Members)

    if element.Preview.Url != "" {
      element.Images = []string{convertToPreviewImage(element.Preview.Url)}
    } else if element.Cover.Url != "" {
      element.Images = []string{convertToPreviewImage(element.Cover.Url)}
    }
    element.Preview = stru.Picture{}

    if element.Subtitle == "" {
      element.Fulltitle = element.Title
    } else {
      element.Fulltitle = fmt.Sprintf("%s: %s", element.Title, element.Subtitle)
    }

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
