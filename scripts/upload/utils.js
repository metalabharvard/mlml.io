const get = require('lodash/get');
const kebabCase = require('lodash/kebabCase');
const trim = require('lodash/trim');
const isString = require('lodash/isString');
const padStart = require('lodash/padStart');
const isArray = require('lodash/isArray');
const isBoolean = require('lodash/isBoolean');
const { parse, format } = require('url');

function getAttribute (source, target, keySource, keyTarget) {
  const value = get(source, keySource);
  return addAttribute(target, keyTarget, value);
}

function addAttribute (target, keyTarget, value) {
  if (isBoolean(value) || (value && value.length)) {
    return {
      ...target,
      [keyTarget]: isString(value) ? trim(value) : value
    }
  } else {
    return target
  }
}

function getDate (source, isStart = true, isTime = false) {
  const year = get(source, 'year');
  const monthDayRaw = get(source, isStart ? 'startdate' : 'enddate');
  if (monthDayRaw) {
    const [month, day] = String(monthDayRaw).split('&#46;');
    if (month && day) {
      return `${year}-${padStart(month, 2, '0')}-${padStart(day, 2, '0')}${isTime ? 'T12:00:00.000Z' : ''}`;
    }
  }
  return `${year}-01-01${isTime ? 'T12:00:00.000Z' : ''}`
}

function getNameSlug (source) {
  const title = get(source, 'name');
  return kebabCase(title);
}

function getFullName (source) {
  const name = get(source, 'name');
  const lastname = get(source, 'lastname');
  return `${name} ${lastname}`
}

function getSlug (str) {
  return kebabCase(str);
}

function getAlumnusStatus (source) {
  const row = String(get(source, 'row'));
  return row === '4'
}

function getFormattedURL (source) {
  let raw = get(source, 'website');
  if (raw) {
    raw = raw.startsWith('http') ? raw : `http://${raw}`
    return format(parse(raw))
  } else {
    return ''
  }
}

function getLinks (source, keySource) {
  const raw = get(source, keySource);
  return (isArray(raw) ? raw : []).map(link => {
    let obj = {};
    obj = getAttribute(link, obj, 'title', 'label');
    obj = getAttribute(link, obj, 'url', 'url');
    return obj;
  });
}

function getCollaborators (source) {
  const collaborators = get(source, 'collaborators');
  if (collaborators) {
    return collaborators.split(',').map(collaborator => {
      let obj = {};
      obj = addAttribute(obj, 'label', collaborator);
      return obj;
    });
  } else {
    return []
  }
}

module.exports = {
  getAttribute,
  addAttribute,
  getDate,
  getNameSlug,
  getLinks,
  getCollaborators,
  getFormattedURL,
  getAlumnusStatus,
  getFullName,
  getSlug
}
