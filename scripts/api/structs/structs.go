package structs

type ResponseEvents struct {
  Title string `yaml:"title"`
  Subtitle string `yaml:"subtitle"`
  Fulltitle string `yaml:"fulltitle"`
  Status string `yaml:"status"`
  Outputs [2]string `yaml:outputs` // Added by this script
  // Time string `yaml:"time,omitempty"` // TODO: Delete this?
  Timezone string `yaml:"timezone,omitempty"`
  Start_Time string `yaml:"start_time,omitempty"` // This is used in the template to detect if start is present
  Start_Date string `yaml:"start_date,omitempty"`
  Start_Date_Time string `yaml:"start_date_time,omitempty"`
  End_Time string `yaml:"end_time,omitempty"`
  End_Date string `yaml:"end_date,omitempty"`
  End_Date_Time string `yaml:"end_date_time,omitempty"`
  Start_TimeUTC string `yaml:"start_time_utc,omitempty"` // Used for the iCal Event
  End_TimeUTC string `yaml:"end_time_utc,omitempty"` // Used for the iCal Event
  Start_TimeLocations Times `yaml:"start_time_locations,omitempty"` // This is used for the tabs
  End_TimeLocations Times `yaml:"end_time_locations,omitempty"` // This is used for the tabs
  TimezoneID string `yaml:"tzid,omitempty"` // Used for the iCal Event. Be aware of the renaming.
  Intro string `yaml:"intro,omitempty"`
  Location string `yaml:"location,omitempty"`
  Category string `yaml:"category,omitempty"`
  Link string `yaml:"externalLink,omitempty"`
  Description string `yaml:"description,omitempty"` // Added by the script
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
  Cover Picture `yaml:"cover,omitempty"`
  Header Picture `yaml:"header,omitempty"`
  NoHeaderImage bool `yaml:"noHeaderImage"`
  Preview Picture `yaml:"preview,omitempty"`
  Feature Picture `yaml:"feature,omitempty"`
  Gallery []Picture `yaml:"gallery,omitempty"`
  YouTube string `yaml:"youtube,omitempty"`
  Vimeo string `yaml:"vimeo,omitempty"`
  Press_Articles []PressArticle `yaml:"press_articles,omitempty"`
  Links []Link `yaml:"links,omitempty"`
  Topics []Topic `yaml:"topics,omitempty"`
  TopicIDs []string `yaml:"topicIDs,omitempty"`
  MembersTwitter []string `yaml:"members_twitter,omitempty"`
  Images []string `yaml:"images,omitempty"`
}

type ResponseProjects struct {
  Title string `yaml:"title"`
  Subtitle string `yaml:"subtitle"`
  Fulltitle string `yaml:"fulltitle"`
  Intro string `yaml:"intro"`
  Start string `yaml:"start"`
  End string `yaml:"end"`
  DateString string `yaml:"datestring"`
  Description string `yaml:"description,omitempty"` // Added by the script
  Location string `yaml:"location"`
  Host string `yaml:"host"`
  Mediation string `yaml:"mediation"`
  Type string `yaml:"category"`
  IsFeatured bool `yaml:"isFeatured"`
  ExternalLink string `yaml:"externalLink"`
  Updated_at string `yaml:"updated_at,omitempty"`
  Created_at string `yaml:"created_at,omitempty"`
  Published_at string `yaml:"published_at,omitempty"` // Deleted by this script
  Lastmod string `yaml:"lastmod"`
  Date string `yaml:"date"`
  Slug string `yaml:"slug"`
  Collaborators []Collaborator `yaml:"collaborators,omitempty"`
  Press_Articles []PressArticle `yaml:"press_articles,omitempty"`
  Links []Link `yaml:"links,omitempty"`
  Events []Event `yaml:"events,omitempty"`
  Members []Member `yaml:"members,omitempty"`
  Projects []Project `yaml:"projects,omitempty"`
  Cover Picture `yaml:"cover,omitempty"`
  Preview Picture `yaml:"preview,omitempty"`
  Header Picture `yaml:"header,omitempty"`
  NoHeaderImage bool `yaml:"noHeaderImage"`
  Feature Picture `yaml:"feature,omitempty"`
  Topics []Topic `yaml:"topics,omitempty"`
  Gallery []Picture `yaml:"gallery,omitempty"`
  Funders []Funder `yaml:"funders,omitempty"`
  MembersTwitter []string `yaml:"members_twitter,omitempty"`
  Images []string `yaml:"images,omitempty"`
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

type Picture struct {
  AlternativeText string `yaml:"alternativeText,omitempty"`
  Caption string `yaml:"caption,omitempty"`
  Url string `yaml:"url,omitempty"`
  Width int `yaml:"width,omitempty"`
  Height int `yaml:"height,omitempty"`
  Ext string `yaml:"ext,omitempty"`
  Mime string `yaml:"mime,omitempty"`
  Formats Formats `yaml:"formats,omitempty"`
}

type Event struct {
  Title string `yaml:"label"` // Careful: We are renaming the key here
  Slug string `yaml:"slug"`
}

type Project struct {
  Title string `yaml:"label"` // Careful: We are renaming the key here
  Slug string `yaml:"slug"`
}

type Member struct {
  Name string `yaml:"label"` // Careful: We are renaming the key here
  Slug string `yaml:"slug"`
  Twitter string `yaml:"twitter,omitempty"` // We use this for Twitter authors in the header
}

type Link struct {
  Label string `yaml:"label,omitempty"`
  Url string `yaml:"url,omitempty"`
}

type Topic struct {
  Topic string `yaml:"topic,omitempty"`
}

type Index struct {
  Title string `yaml:"title"`
  Lastmod string `yaml:"lastmod"`
}

type Times struct {
  Berlin string `yaml:"berlin"`
  Boston string `yaml:"boston"`
}

type Funder struct {
  Label string `yaml:"label"`
  Url string `yaml:"url,omitempty"`
}

type Collaborator struct {
  Label string `yaml:"label,omitempty"`
  Url string `yaml:"url,omitempty"`
}

type PressArticle struct {
  Label string `yaml:"label"`
  Url string `yaml:"url,omitempty"`
}

type Role struct {
  Role string `yaml:"role"`
  Position int `yaml:"position"`
}

type ByRole []Role

func (a ByRole) Len() int           { return len(a) }
func (a ByRole) Less(i, j int) bool { return a[i].Position < a[j].Position }
func (a ByRole) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }

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
