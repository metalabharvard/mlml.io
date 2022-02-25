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
  "gopkg.in/yaml.v3"
  stru "api/structs"
  utils "api/utils"
)

func getDateYear(date time.Time) string {
  return date.Format("2006")
}

func getDateMonth(date time.Time) string {
  return date.Format("Jan")
}

func getDateFull(date time.Time) string {
  return date.Format("2006-Jan")
}

func getDatePrint(date time.Time) string {
  return date.Format("January 2006")
}

func getDateMonthPrint(date time.Time) string {
  return date.Format("January")
}

const shortForm = "2006-01-02"

func createTimeString(start string, end string) string {
  if (start != "" && end != "") {
    s, _ := time.Parse(shortForm, start)
    e, _ := time.Parse(shortForm, end)
    if getDateFull(s) == getDateFull(e) {
      return getDatePrint(s)
    } else {
      if (getDateYear(s) == getDateYear(e)) {
        return fmt.Sprintf("%s&ensp;–&ensp;%s", getDateMonthPrint(s), getDatePrint(e))
      } else {
        return fmt.Sprintf("%s&ensp;–&ensp;%s", getDatePrint(s), getDatePrint(e))
      }
    }
    return shortForm
  } else if (start != "") {
    s, _ := time.Parse(shortForm, start)
    return fmt.Sprintf("Since %s", getDatePrint(s))
  } else if (end != "") {
    e, _ := time.Parse(shortForm, end)
    return getDatePrint(e)
  } else {
    return ""
  }
}

func checkDates(start string, end string) bool {
  s, _ := time.Parse(shortForm, start)
  e, _ := time.Parse(shortForm, end)
  return s.After(e)
}

func main() {
  println("Requesting projects")
  response, err := http.Get("https://metalab-strapi.herokuapp.com/projects")

  var Lastmod time.Time;

  if err != nil {
    fmt.Print(err.Error())
    os.Exit(1)
  }

  responseData, err := ioutil.ReadAll(response.Body)
  if err != nil {
    log.Fatal(err)
  }

  FOLDER := "../../content/projects/"

  utils.CleanFolder(FOLDER)

  var responseObject []stru.ResponseProjects
  json.Unmarshal(responseData, &responseObject)

  for _, element := range responseObject {
    Lastmod = utils.GetLastmod(element.Updated_at, Lastmod)

    element.Title = utils.Trim(element.Title)

    content := element.Description

    element.Description = ""

    element.Date = utils.CreateDate(element.Start, element.End, element.Published_at)
    element.Lastmod = element.Updated_at

    element.Created_at = ""
    element.Updated_at = ""
    element.Published_at = ""

    element.Projects = utils.GetRelatedProjects(element.Topics, responseObject, element.Slug)
    element.Topics = nil

    element.Collaborators = utils.CleanCollaborators(element.Collaborators)
    element.Links = utils.CleanLinks(element.Links)
    element.Press_Articles = utils.CleanPressArticles(element.Press_Articles)
    element.Funders = utils.CleanFunders(element.Funders)

    element.Host = utils.Trim(element.Host)
    element.ExternalLink = utils.FixExternalLink(utils.Trim(element.ExternalLink))

    element.Projects = utils.CleanProjects(element.Projects)
    element.Events = utils.CleanEvents(element.Events)
    element.Members = utils.CleanMembers(element.Members)

    sort.Sort(stru.MembersByName(element.Members))
    sort.Sort(stru.EventsByName(element.Events))
    sort.Sort(stru.ProjectsByName(element.Projects))

    element.DateString = createTimeString(element.Start, element.End)

    element.MembersTwitter = utils.GetMembersTwitter(element.Members)

    element.Images = utils.CreatePreviewImage(element.Preview.Url, element.Cover.Url)
    element.Header = utils.CreateHeaderImage(element.Header, element.Cover, element.Preview)
    if element.IsFeatured {
      element.Feature = utils.CreateFeatureImage(element.Cover, element.Header, element.Preview)
    }
    element.Preview = stru.Picture{}

    element.Fulltitle = utils.CreateFulltitle(element.Title, element.Subtitle)

    element.Description = utils.CreateDescription(element.Intro)
    if element.Description == "" {
      println(fmt.Sprintf("%s has missing intro", element.Title))
    }

    if checkDates(element.Start, element.End) {
      println(fmt.Sprintf("%s has wrong dates", element.Title))
    }

    file, _ := yaml.Marshal(element)
    utils.WriteToMarkdown(FOLDER, element.Slug, file, content)
  }

  utils.WriteLastMod(FOLDER, Lastmod, "Projects")
  
  println(fmt.Sprintf("%d elements added", len(responseObject)))
  println("Requesting projects finished")
}