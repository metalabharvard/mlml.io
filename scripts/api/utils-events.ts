import moment from "moment-timezone";

type EventUnprocessed = {
  start_date?: string;
  start_date_time?: string;
  start_time_utc?: string;
  end_time_utc?: string;
  timezone?: string;
  end_date?: string;
  end_date_time?: string;
  start_time?: string;
  end_time?: string;
};

interface EventProcessed {
  timezone?: string;
  timezoneAbbr: {
    berlin: string;
    boston: string;
  };
  start_time: string;
  end_time: string;
  start_time_utc: string;
  end_time_utc: string;
  start_time_locations: {
    berlin: string;
    boston: string;
  };
  end_time_locations: {
    berlin: string;
    boston: string;
  };
  tzid: string;
}

const locBerlin = "Europe/Berlin";
const locBoston = "America/New_York";
const locUTC = "Etc/GMT";

export function convertEventTimes(event: EventUnprocessed): EventProcessed {
  const obj: EventProcessed = {};
  if (typeof event.start_date !== "undefined" && event.start_date?.length > 1) {
    let start_time = "12:00:00"; // Annahme, kein START TIME verfügbar

    if (
      typeof event.start_date_time !== "undefined" &&
      event.start_date_time?.length > 1
    ) {
      // Nutzung des verfügbaren START TIME
      start_time = event.start_date_time;
    }

    const s = `${event.start_date}T${start_time}`;

    let end_date = event.start_date; // Annahme, kein END DATE verfügbar

    if (typeof event.end_date !== "undefined" && event.end_date?.length > 1) {
      // Nutzung des verfügbaren END DATE
      end_date = event.end_date;
    }

    let end_time = start_time; // Annahme, kein END TIME verfügbar

    if (
      typeof event.end_date_time !== "undefined" &&
      event.end_date_time?.length > 1
    ) {
      // Nutzung des verfügbaren END TIME
      end_time = event.end_date_time;
    }

    const e = `${end_date}T${end_time}`;

    let loc = locBoston;
    let tzid = "America/New_York";

    if (event.timezone === "Berlin") {
      loc = locBerlin;
      tzid = "Europe/Berlin";
    }

    const ts = moment.tz(s, "YYYY-MM-DDTHH:mm:ss", loc);
    let te = moment.tz(e, "YYYY-MM-DDTHH:mm:ss", loc);

    if (ts.isSameOrAfter(te)) {
      te = moment(ts).add(1, "hours"); // Default length of an event is one hour
    }

    obj.timezone = event.timezone;

    obj.timezoneAbbr = {
      berlin: ts.tz(locBerlin).format("z"),
      boston: ts.tz(locBoston).format("z"),
    };

    obj.start_time = ts.format();
    obj.end_time = te.format();

    obj.start_time_utc = ts.tz(locUTC).format();
    obj.end_time_utc = te.tz(locUTC).format();

    // Zuweisung der umgerechneten Zeiten zu den Standorten
    obj.start_time_locations = {
      berlin: ts.tz(locBerlin).format(),
      boston: ts.tz(locBoston).format(),
    };
    obj.end_time_locations = {
      berlin: te.tz(locBerlin).format(),
      boston: te.tz(locBoston).format(),
    };

    obj.tzid = tzid;
  }
  return obj;
}
