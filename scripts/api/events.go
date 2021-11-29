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
  utils "api/utils"
)

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

  utils.CleanFolder(FOLDER)

  var responseObject []stru.ResponseEvents
  json.Unmarshal(responseData, &responseObject)

  locBerlin, _ := time.LoadLocation("Europe/Berlin")
  locBoston, _ := time.LoadLocation("America/New_York")

  for _, element := range responseObject {
    Lastmod = utils.GetLastmod(element.Updated_at, Lastmod)

    element.Title = utils.Trim(element.Title)

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

    element.Date = utils.CreateDate(element.Start_Time, element.End_Time, element.Published_at)
    element.Lastmod = element.Updated_at

    element.Created_at = ""
    element.Updated_at = ""
    element.Published_at = ""

    element.Outputs = [2]string{"HTML", "Calendar"}

    element.Events = utils.GetRelatedEvents(element.Topics, responseObject, element.Slug)

    element.Topics = nil

    element.Link = utils.Trim(element.Link)

    element.Projects = utils.CleanProjects(element.Projects)
    element.Events = utils.CleanEvents(element.Events)
    element.Members = utils.CleanMembers(element.Members)

    sort.Sort(stru.MembersByName(element.Members))
    sort.Sort(stru.ProjectsByName(element.Projects))
    sort.Sort(stru.EventsByName(element.Events))

    element.MembersTwitter = utils.GetMembersTwitter(element.Members)

    element.Images = utils.CreatePreviewImage(element.Preview.Url, element.Cover.Url)
    element.Header = utils.CreateHeaderImage(element.Header, element.Cover, element.Preview)

    element.Preview = stru.Picture{}

    element.Fulltitle = utils.CreateFulltitle(element.Title, element.Subtitle)

    element.Description = utils.CreateDescription(element.Subtitle, element.Intro)

    file, _ := yaml.Marshal(element)
    utils.WriteToMarkdown(FOLDER, element.Slug, file, content)
  }

  utils.WriteLastMod(FOLDER, Lastmod, "Events")
  println(fmt.Sprintf("%d elements added", len(responseObject)))
  println("Requesting events finished")
}
