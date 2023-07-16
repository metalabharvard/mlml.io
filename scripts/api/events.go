package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"sort"
	"time"

	// "strings"
	stru "api/structs"
	utils "api/utils"

	"gopkg.in/yaml.v3"
)

func main() {
  println("Requesting events")
  response, err := http.Get("https://metalab-strapi.herokuapp.com/events?_limit=-1")

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

  // https://go.dev/src/time/zoneinfo_abbrs_windows.go
  locBerlin, _ := time.LoadLocation("Europe/Berlin")
  locBoston, _ := time.LoadLocation("America/New_York")
  locUTC, _ := time.LoadLocation("Etc/GMT")

  for _, element := range responseObject {
    Lastmod = utils.GetLastmod(element.Updated_at, Lastmod)

    element.Title = utils.Trim(element.Title)

    // println(element.Start_Date, element.Start_Date_Time, element.Slug)

    if len(element.Start_Date) > 1 {
      start_time := "12:00:00" // First, assume that we don’t have an START TIME
      if len(element.Start_Date_Time) > 1 { // If we have an START TIME, use that instead
        start_time = element.Start_Date_Time
      }
      s := fmt.Sprintf("%sT%s", element.Start_Date, start_time) // Format date and time in correct form

      end_date := element.Start_Date // First, let’s assume, we don’t have an END DATE
      if len(element.End_Date) > 1 { // If we have an END DATE, use that instead
        end_date = element.End_Date
      }
      end_time := start_time // First, let’s assume, we don’t have an END TIME
      if len(element.End_Date_Time) > 1 { // If we have an END TIME, use that instead
        end_time = element.End_Date_Time
      }
      e := fmt.Sprintf("%sT%s", end_date, end_time) // Format date and time in correct form

      loc := locBoston
      tzid := "America/New_York"
      if element.Timezone == "Berlin" {
        loc = locBerlin
        tzid = "Europe/Berlin"
      }

      // https://pkg.go.dev/time
      // https://pkg.go.dev/time#ParseInLocation
      ts, _ := time.ParseInLocation("2006-01-02T15:04:05", s, loc)
      te, _ := time.ParseInLocation("2006-01-02T15:04:05", e, loc)

      // https://riptutorial.com/go/example/32577/comparing-time
      if ts.After(te) || ts == te {
        te = ts.Add(time.Hour * 1)
      }

      // These are used for the iCal event
      element.Start_TimeUTC = ts.In(locUTC).Format("20060102T150405Z")
      element.End_TimeUTC = te.In(locUTC).Format("20060102T150405Z")
      // if hasEndTime {
      //   element.End_TimeUTC = te.Format("20060102T150405Z")
      // } else {
      //   // Because we need a end time for the iCal event, we just add one hour to the start time
      //   element.End_TimeUTC = ts.Add(time.Hour * 1).Format("20060102T150405Z")
      // }
      // These are used for the iCal event
      element.TimezoneID = tzid

      element.Start_Date_Time = ""
      element.End_Date_Time = ""

      element.Start_Date = ""
      element.End_Date = ""

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

    // We need to Date property for sorting
    element.Date = utils.CreateDate(element.End_Time, element.Start_Time, element.Published_at)
    element.Lastmod = element.Updated_at

    element.Created_at = ""
    element.Updated_at = ""
    element.Published_at = ""

    element.Outputs = [2]string{"HTML", "Calendar"}

    element.Events = utils.GetRelatedEvents(element.Topics, responseObject, element.Slug)

    element.Topics = nil

    element.AliasesClean = utils.CleanAliases(element.Aliases)
    element.Aliases = nil

    element.Link = utils.FixExternalLink(utils.Trim(element.Link))
    element.Intro = utils.Trim(element.Intro)

    element.Projects = utils.CleanProjects(element.Projects)
    element.Events = utils.CleanEvents(element.Events)
    element.Members = utils.CleanMembers(element.Members)

    element.Collaborators = utils.CleanCollaborators(element.Collaborators)
    element.Links = utils.CleanLinks(element.Links)
    element.Press_Articles = utils.CleanPressArticles(element.Press_Articles)
    element.Funders = utils.CleanFunders(element.Funders)

    sort.Sort(stru.MembersByName(element.Members))
    sort.Sort(stru.ProjectsByName(element.Projects))
    sort.Sort(stru.EventsByName(element.Events))

    element.MembersTwitter = utils.GetMembersTwitter(element.Members)

    element.Images = utils.CreatePreviewImage(element.Preview.Url, element.Cover.Url)
    element.Header = utils.CreateHeaderImage(element.Header, element.Cover, element.Preview)

    element.Preview = stru.Picture{}

    element.Fulltitle = utils.CreateFulltitle(element.Title, element.Subtitle)
    // if element.Description == "" {
    //   println(fmt.Sprintf("%s has missing intro", element.Title))
    // }

    utils.CheckImageDimensions(element.Cover, element.Title, "Cover")
    utils.CheckImageDimensions(element.Preview, element.Title, "Header")
    utils.CheckImageDimensions(element.Header, element.Title, "Header")
    utils.CheckImageDimensions(element.Feature, element.Title, "Header")
    element.Gallery = utils.CheckGalleryDimensions(element.Gallery, element.Title)

    element.Description = utils.CreateDescription(element.Intro)

    file, _ := yaml.Marshal(element)
    utils.WriteToMarkdown(FOLDER, element.Slug, file, content)
  }

  utils.WriteLastMod(FOLDER, Lastmod, "Events")
  println(fmt.Sprintf("%d elements added", len(responseObject)))
  println("Requesting events finished")
}
