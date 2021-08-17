(function () {
    'use strict';

    function noop$1() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop$1,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop$1;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /**
     * Fuse.js v6.4.6 - Lightweight fuzzy-search (http://fusejs.io)
     *
     * Copyright (c) 2021 Kiro Risk (http://kiro.me)
     * All Rights Reserved. Apache Software License 2.0
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     */

    function isArray$1(value) {
      return !Array.isArray
        ? getTag(value) === '[object Array]'
        : Array.isArray(value)
    }

    // Adapted from: https://github.com/lodash/lodash/blob/master/.internal/baseToString.js
    const INFINITY$3 = 1 / 0;
    function baseToString$1(value) {
      // Exit early for strings to avoid a performance hit in some environments.
      if (typeof value == 'string') {
        return value
      }
      let result = value + '';
      return result == '0' && 1 / value == -INFINITY$3 ? '-0' : result
    }

    function toString$1(value) {
      return value == null ? '' : baseToString$1(value)
    }

    function isString(value) {
      return typeof value === 'string'
    }

    function isNumber(value) {
      return typeof value === 'number'
    }

    // Adapted from: https://github.com/lodash/lodash/blob/master/isBoolean.js
    function isBoolean(value) {
      return (
        value === true ||
        value === false ||
        (isObjectLike$1(value) && getTag(value) == '[object Boolean]')
      )
    }

    function isObject$1(value) {
      return typeof value === 'object'
    }

    // Checks if `value` is object-like.
    function isObjectLike$1(value) {
      return isObject$1(value) && value !== null
    }

    function isDefined(value) {
      return value !== undefined && value !== null
    }

    function isBlank(value) {
      return !value.trim().length
    }

    // Gets the `toStringTag` of `value`.
    // Adapted from: https://github.com/lodash/lodash/blob/master/.internal/getTag.js
    function getTag(value) {
      return value == null
        ? value === undefined
          ? '[object Undefined]'
          : '[object Null]'
        : Object.prototype.toString.call(value)
    }

    const EXTENDED_SEARCH_UNAVAILABLE = 'Extended search is not available';

    const INCORRECT_INDEX_TYPE = "Incorrect 'index' type";

    const LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY = (key) =>
      `Invalid value for key ${key}`;

    const PATTERN_LENGTH_TOO_LARGE = (max) =>
      `Pattern length exceeds max of ${max}.`;

    const MISSING_KEY_PROPERTY = (name) => `Missing ${name} property in key`;

    const INVALID_KEY_WEIGHT_VALUE = (key) =>
      `Property 'weight' in key '${key}' must be a positive integer`;

    const hasOwn = Object.prototype.hasOwnProperty;

    class KeyStore {
      constructor(keys) {
        this._keys = [];
        this._keyMap = {};

        let totalWeight = 0;

        keys.forEach((key) => {
          let obj = createKey(key);

          totalWeight += obj.weight;

          this._keys.push(obj);
          this._keyMap[obj.id] = obj;

          totalWeight += obj.weight;
        });

        // Normalize weights so that their sum is equal to 1
        this._keys.forEach((key) => {
          key.weight /= totalWeight;
        });
      }
      get(keyId) {
        return this._keyMap[keyId]
      }
      keys() {
        return this._keys
      }
      toJSON() {
        return JSON.stringify(this._keys)
      }
    }

    function createKey(key) {
      let path = null;
      let id = null;
      let src = null;
      let weight = 1;

      if (isString(key) || isArray$1(key)) {
        src = key;
        path = createKeyPath(key);
        id = createKeyId(key);
      } else {
        if (!hasOwn.call(key, 'name')) {
          throw new Error(MISSING_KEY_PROPERTY('name'))
        }

        const name = key.name;
        src = name;

        if (hasOwn.call(key, 'weight')) {
          weight = key.weight;

          if (weight <= 0) {
            throw new Error(INVALID_KEY_WEIGHT_VALUE(name))
          }
        }

        path = createKeyPath(name);
        id = createKeyId(name);
      }

      return { path, id, weight, src }
    }

    function createKeyPath(key) {
      return isArray$1(key) ? key : key.split('.')
    }

    function createKeyId(key) {
      return isArray$1(key) ? key.join('.') : key
    }

    function get$1(obj, path) {
      let list = [];
      let arr = false;

      const deepGet = (obj, path, index) => {
        if (!isDefined(obj)) {
          return
        }
        if (!path[index]) {
          // If there's no path left, we've arrived at the object we care about.
          list.push(obj);
        } else {
          let key = path[index];

          const value = obj[key];

          if (!isDefined(value)) {
            return
          }

          // If we're at the last value in the path, and if it's a string/number/bool,
          // add it to the list
          if (
            index === path.length - 1 &&
            (isString(value) || isNumber(value) || isBoolean(value))
          ) {
            list.push(toString$1(value));
          } else if (isArray$1(value)) {
            arr = true;
            // Search each item in the array.
            for (let i = 0, len = value.length; i < len; i += 1) {
              deepGet(value[i], path, index + 1);
            }
          } else if (path.length) {
            // An object. Recurse further.
            deepGet(value, path, index + 1);
          }
        }
      };

      // Backwards compatibility (since path used to be a string)
      deepGet(obj, isString(path) ? path.split('.') : path, 0);

      return arr ? list : list[0]
    }

    const MatchOptions = {
      // Whether the matches should be included in the result set. When `true`, each record in the result
      // set will include the indices of the matched characters.
      // These can consequently be used for highlighting purposes.
      includeMatches: false,
      // When `true`, the matching function will continue to the end of a search pattern even if
      // a perfect match has already been located in the string.
      findAllMatches: false,
      // Minimum number of characters that must be matched before a result is considered a match
      minMatchCharLength: 1
    };

    const BasicOptions = {
      // When `true`, the algorithm continues searching to the end of the input even if a perfect
      // match is found before the end of the same input.
      isCaseSensitive: false,
      // When true, the matching function will continue to the end of a search pattern even if
      includeScore: false,
      // List of properties that will be searched. This also supports nested properties.
      keys: [],
      // Whether to sort the result list, by score
      shouldSort: true,
      // Default sort function: sort by ascending score, ascending index
      sortFn: (a, b) =>
        a.score === b.score ? (a.idx < b.idx ? -1 : 1) : a.score < b.score ? -1 : 1
    };

    const FuzzyOptions = {
      // Approximately where in the text is the pattern expected to be found?
      location: 0,
      // At what point does the match algorithm give up. A threshold of '0.0' requires a perfect match
      // (of both letters and location), a threshold of '1.0' would match anything.
      threshold: 0.6,
      // Determines how close the match must be to the fuzzy location (specified above).
      // An exact letter match which is 'distance' characters away from the fuzzy location
      // would score as a complete mismatch. A distance of '0' requires the match be at
      // the exact location specified, a threshold of '1000' would require a perfect match
      // to be within 800 characters of the fuzzy location to be found using a 0.8 threshold.
      distance: 100
    };

    const AdvancedOptions = {
      // When `true`, it enables the use of unix-like search commands
      useExtendedSearch: false,
      // The get function to use when fetching an object's properties.
      // The default will search nested paths *ie foo.bar.baz*
      getFn: get$1,
      // When `true`, search will ignore `location` and `distance`, so it won't matter
      // where in the string the pattern appears.
      // More info: https://fusejs.io/concepts/scoring-theory.html#fuzziness-score
      ignoreLocation: false,
      // When `true`, the calculation for the relevance score (used for sorting) will
      // ignore the field-length norm.
      // More info: https://fusejs.io/concepts/scoring-theory.html#field-length-norm
      ignoreFieldNorm: false
    };

    var Config = {
      ...BasicOptions,
      ...MatchOptions,
      ...FuzzyOptions,
      ...AdvancedOptions
    };

    const SPACE = /[^ ]+/g;

    // Field-length norm: the shorter the field, the higher the weight.
    // Set to 3 decimals to reduce index size.
    function norm(mantissa = 3) {
      const cache = new Map();
      const m = Math.pow(10, mantissa);

      return {
        get(value) {
          const numTokens = value.match(SPACE).length;

          if (cache.has(numTokens)) {
            return cache.get(numTokens)
          }

          const norm = 1 / Math.sqrt(numTokens);

          // In place of `toFixed(mantissa)`, for faster computation
          const n = parseFloat(Math.round(norm * m) / m);

          cache.set(numTokens, n);

          return n
        },
        clear() {
          cache.clear();
        }
      }
    }

    class FuseIndex {
      constructor({ getFn = Config.getFn } = {}) {
        this.norm = norm(3);
        this.getFn = getFn;
        this.isCreated = false;

        this.setIndexRecords();
      }
      setSources(docs = []) {
        this.docs = docs;
      }
      setIndexRecords(records = []) {
        this.records = records;
      }
      setKeys(keys = []) {
        this.keys = keys;
        this._keysMap = {};
        keys.forEach((key, idx) => {
          this._keysMap[key.id] = idx;
        });
      }
      create() {
        if (this.isCreated || !this.docs.length) {
          return
        }

        this.isCreated = true;

        // List is Array<String>
        if (isString(this.docs[0])) {
          this.docs.forEach((doc, docIndex) => {
            this._addString(doc, docIndex);
          });
        } else {
          // List is Array<Object>
          this.docs.forEach((doc, docIndex) => {
            this._addObject(doc, docIndex);
          });
        }

        this.norm.clear();
      }
      // Adds a doc to the end of the index
      add(doc) {
        const idx = this.size();

        if (isString(doc)) {
          this._addString(doc, idx);
        } else {
          this._addObject(doc, idx);
        }
      }
      // Removes the doc at the specified index of the index
      removeAt(idx) {
        this.records.splice(idx, 1);

        // Change ref index of every subsquent doc
        for (let i = idx, len = this.size(); i < len; i += 1) {
          this.records[i].i -= 1;
        }
      }
      getValueForItemAtKeyId(item, keyId) {
        return item[this._keysMap[keyId]]
      }
      size() {
        return this.records.length
      }
      _addString(doc, docIndex) {
        if (!isDefined(doc) || isBlank(doc)) {
          return
        }

        let record = {
          v: doc,
          i: docIndex,
          n: this.norm.get(doc)
        };

        this.records.push(record);
      }
      _addObject(doc, docIndex) {
        let record = { i: docIndex, $: {} };

        // Iterate over every key (i.e, path), and fetch the value at that key
        this.keys.forEach((key, keyIndex) => {
          // console.log(key)
          let value = this.getFn(doc, key.path);

          if (!isDefined(value)) {
            return
          }

          if (isArray$1(value)) {
            let subRecords = [];
            const stack = [{ nestedArrIndex: -1, value }];

            while (stack.length) {
              const { nestedArrIndex, value } = stack.pop();

              if (!isDefined(value)) {
                continue
              }

              if (isString(value) && !isBlank(value)) {
                let subRecord = {
                  v: value,
                  i: nestedArrIndex,
                  n: this.norm.get(value)
                };

                subRecords.push(subRecord);
              } else if (isArray$1(value)) {
                value.forEach((item, k) => {
                  stack.push({
                    nestedArrIndex: k,
                    value: item
                  });
                });
              }
            }
            record.$[keyIndex] = subRecords;
          } else if (!isBlank(value)) {
            let subRecord = {
              v: value,
              n: this.norm.get(value)
            };

            record.$[keyIndex] = subRecord;
          }
        });

        this.records.push(record);
      }
      toJSON() {
        return {
          keys: this.keys,
          records: this.records
        }
      }
    }

    function createIndex(keys, docs, { getFn = Config.getFn } = {}) {
      const myIndex = new FuseIndex({ getFn });
      myIndex.setKeys(keys.map(createKey));
      myIndex.setSources(docs);
      myIndex.create();
      return myIndex
    }

    function parseIndex(data, { getFn = Config.getFn } = {}) {
      const { keys, records } = data;
      const myIndex = new FuseIndex({ getFn });
      myIndex.setKeys(keys);
      myIndex.setIndexRecords(records);
      return myIndex
    }

    function computeScore(
      pattern,
      {
        errors = 0,
        currentLocation = 0,
        expectedLocation = 0,
        distance = Config.distance,
        ignoreLocation = Config.ignoreLocation
      } = {}
    ) {
      const accuracy = errors / pattern.length;

      if (ignoreLocation) {
        return accuracy
      }

      const proximity = Math.abs(expectedLocation - currentLocation);

      if (!distance) {
        // Dodge divide by zero error.
        return proximity ? 1.0 : accuracy
      }

      return accuracy + proximity / distance
    }

    function convertMaskToIndices(
      matchmask = [],
      minMatchCharLength = Config.minMatchCharLength
    ) {
      let indices = [];
      let start = -1;
      let end = -1;
      let i = 0;

      for (let len = matchmask.length; i < len; i += 1) {
        let match = matchmask[i];
        if (match && start === -1) {
          start = i;
        } else if (!match && start !== -1) {
          end = i - 1;
          if (end - start + 1 >= minMatchCharLength) {
            indices.push([start, end]);
          }
          start = -1;
        }
      }

      // (i-1 - start) + 1 => i - start
      if (matchmask[i - 1] && i - start >= minMatchCharLength) {
        indices.push([start, i - 1]);
      }

      return indices
    }

    // Machine word size
    const MAX_BITS = 32;

    function search(
      text,
      pattern,
      patternAlphabet,
      {
        location = Config.location,
        distance = Config.distance,
        threshold = Config.threshold,
        findAllMatches = Config.findAllMatches,
        minMatchCharLength = Config.minMatchCharLength,
        includeMatches = Config.includeMatches,
        ignoreLocation = Config.ignoreLocation
      } = {}
    ) {
      if (pattern.length > MAX_BITS) {
        throw new Error(PATTERN_LENGTH_TOO_LARGE(MAX_BITS))
      }

      const patternLen = pattern.length;
      // Set starting location at beginning text and initialize the alphabet.
      const textLen = text.length;
      // Handle the case when location > text.length
      const expectedLocation = Math.max(0, Math.min(location, textLen));
      // Highest score beyond which we give up.
      let currentThreshold = threshold;
      // Is there a nearby exact match? (speedup)
      let bestLocation = expectedLocation;

      // Performance: only computer matches when the minMatchCharLength > 1
      // OR if `includeMatches` is true.
      const computeMatches = minMatchCharLength > 1 || includeMatches;
      // A mask of the matches, used for building the indices
      const matchMask = computeMatches ? Array(textLen) : [];

      let index;

      // Get all exact matches, here for speed up
      while ((index = text.indexOf(pattern, bestLocation)) > -1) {
        let score = computeScore(pattern, {
          currentLocation: index,
          expectedLocation,
          distance,
          ignoreLocation
        });

        currentThreshold = Math.min(score, currentThreshold);
        bestLocation = index + patternLen;

        if (computeMatches) {
          let i = 0;
          while (i < patternLen) {
            matchMask[index + i] = 1;
            i += 1;
          }
        }
      }

      // Reset the best location
      bestLocation = -1;

      let lastBitArr = [];
      let finalScore = 1;
      let binMax = patternLen + textLen;

      const mask = 1 << (patternLen - 1);

      for (let i = 0; i < patternLen; i += 1) {
        // Scan for the best match; each iteration allows for one more error.
        // Run a binary search to determine how far from the match location we can stray
        // at this error level.
        let binMin = 0;
        let binMid = binMax;

        while (binMin < binMid) {
          const score = computeScore(pattern, {
            errors: i,
            currentLocation: expectedLocation + binMid,
            expectedLocation,
            distance,
            ignoreLocation
          });

          if (score <= currentThreshold) {
            binMin = binMid;
          } else {
            binMax = binMid;
          }

          binMid = Math.floor((binMax - binMin) / 2 + binMin);
        }

        // Use the result from this iteration as the maximum for the next.
        binMax = binMid;

        let start = Math.max(1, expectedLocation - binMid + 1);
        let finish = findAllMatches
          ? textLen
          : Math.min(expectedLocation + binMid, textLen) + patternLen;

        // Initialize the bit array
        let bitArr = Array(finish + 2);

        bitArr[finish + 1] = (1 << i) - 1;

        for (let j = finish; j >= start; j -= 1) {
          let currentLocation = j - 1;
          let charMatch = patternAlphabet[text.charAt(currentLocation)];

          if (computeMatches) {
            // Speed up: quick bool to int conversion (i.e, `charMatch ? 1 : 0`)
            matchMask[currentLocation] = +!!charMatch;
          }

          // First pass: exact match
          bitArr[j] = ((bitArr[j + 1] << 1) | 1) & charMatch;

          // Subsequent passes: fuzzy match
          if (i) {
            bitArr[j] |=
              ((lastBitArr[j + 1] | lastBitArr[j]) << 1) | 1 | lastBitArr[j + 1];
          }

          if (bitArr[j] & mask) {
            finalScore = computeScore(pattern, {
              errors: i,
              currentLocation,
              expectedLocation,
              distance,
              ignoreLocation
            });

            // This match will almost certainly be better than any existing match.
            // But check anyway.
            if (finalScore <= currentThreshold) {
              // Indeed it is
              currentThreshold = finalScore;
              bestLocation = currentLocation;

              // Already passed `loc`, downhill from here on in.
              if (bestLocation <= expectedLocation) {
                break
              }

              // When passing `bestLocation`, don't exceed our current distance from `expectedLocation`.
              start = Math.max(1, 2 * expectedLocation - bestLocation);
            }
          }
        }

        // No hope for a (better) match at greater error levels.
        const score = computeScore(pattern, {
          errors: i + 1,
          currentLocation: expectedLocation,
          expectedLocation,
          distance,
          ignoreLocation
        });

        if (score > currentThreshold) {
          break
        }

        lastBitArr = bitArr;
      }

      const result = {
        isMatch: bestLocation >= 0,
        // Count exact matches (those with a score of 0) to be "almost" exact
        score: Math.max(0.001, finalScore)
      };

      if (computeMatches) {
        const indices = convertMaskToIndices(matchMask, minMatchCharLength);
        if (!indices.length) {
          result.isMatch = false;
        } else if (includeMatches) {
          result.indices = indices;
        }
      }

      return result
    }

    function createPatternAlphabet(pattern) {
      let mask = {};

      for (let i = 0, len = pattern.length; i < len; i += 1) {
        const char = pattern.charAt(i);
        mask[char] = (mask[char] || 0) | (1 << (len - i - 1));
      }

      return mask
    }

    class BitapSearch {
      constructor(
        pattern,
        {
          location = Config.location,
          threshold = Config.threshold,
          distance = Config.distance,
          includeMatches = Config.includeMatches,
          findAllMatches = Config.findAllMatches,
          minMatchCharLength = Config.minMatchCharLength,
          isCaseSensitive = Config.isCaseSensitive,
          ignoreLocation = Config.ignoreLocation
        } = {}
      ) {
        this.options = {
          location,
          threshold,
          distance,
          includeMatches,
          findAllMatches,
          minMatchCharLength,
          isCaseSensitive,
          ignoreLocation
        };

        this.pattern = isCaseSensitive ? pattern : pattern.toLowerCase();

        this.chunks = [];

        if (!this.pattern.length) {
          return
        }

        const addChunk = (pattern, startIndex) => {
          this.chunks.push({
            pattern,
            alphabet: createPatternAlphabet(pattern),
            startIndex
          });
        };

        const len = this.pattern.length;

        if (len > MAX_BITS) {
          let i = 0;
          const remainder = len % MAX_BITS;
          const end = len - remainder;

          while (i < end) {
            addChunk(this.pattern.substr(i, MAX_BITS), i);
            i += MAX_BITS;
          }

          if (remainder) {
            const startIndex = len - MAX_BITS;
            addChunk(this.pattern.substr(startIndex), startIndex);
          }
        } else {
          addChunk(this.pattern, 0);
        }
      }

      searchIn(text) {
        const { isCaseSensitive, includeMatches } = this.options;

        if (!isCaseSensitive) {
          text = text.toLowerCase();
        }

        // Exact match
        if (this.pattern === text) {
          let result = {
            isMatch: true,
            score: 0
          };

          if (includeMatches) {
            result.indices = [[0, text.length - 1]];
          }

          return result
        }

        // Otherwise, use Bitap algorithm
        const {
          location,
          distance,
          threshold,
          findAllMatches,
          minMatchCharLength,
          ignoreLocation
        } = this.options;

        let allIndices = [];
        let totalScore = 0;
        let hasMatches = false;

        this.chunks.forEach(({ pattern, alphabet, startIndex }) => {
          const { isMatch, score, indices } = search(text, pattern, alphabet, {
            location: location + startIndex,
            distance,
            threshold,
            findAllMatches,
            minMatchCharLength,
            includeMatches,
            ignoreLocation
          });

          if (isMatch) {
            hasMatches = true;
          }

          totalScore += score;

          if (isMatch && indices) {
            allIndices = [...allIndices, ...indices];
          }
        });

        let result = {
          isMatch: hasMatches,
          score: hasMatches ? totalScore / this.chunks.length : 1
        };

        if (hasMatches && includeMatches) {
          result.indices = allIndices;
        }

        return result
      }
    }

    class BaseMatch {
      constructor(pattern) {
        this.pattern = pattern;
      }
      static isMultiMatch(pattern) {
        return getMatch(pattern, this.multiRegex)
      }
      static isSingleMatch(pattern) {
        return getMatch(pattern, this.singleRegex)
      }
      search(/*text*/) {}
    }

    function getMatch(pattern, exp) {
      const matches = pattern.match(exp);
      return matches ? matches[1] : null
    }

    // Token: 'file

    class ExactMatch extends BaseMatch {
      constructor(pattern) {
        super(pattern);
      }
      static get type() {
        return 'exact'
      }
      static get multiRegex() {
        return /^="(.*)"$/
      }
      static get singleRegex() {
        return /^=(.*)$/
      }
      search(text) {
        const isMatch = text === this.pattern;

        return {
          isMatch,
          score: isMatch ? 0 : 1,
          indices: [0, this.pattern.length - 1]
        }
      }
    }

    // Token: !fire

    class InverseExactMatch extends BaseMatch {
      constructor(pattern) {
        super(pattern);
      }
      static get type() {
        return 'inverse-exact'
      }
      static get multiRegex() {
        return /^!"(.*)"$/
      }
      static get singleRegex() {
        return /^!(.*)$/
      }
      search(text) {
        const index = text.indexOf(this.pattern);
        const isMatch = index === -1;

        return {
          isMatch,
          score: isMatch ? 0 : 1,
          indices: [0, text.length - 1]
        }
      }
    }

    // Token: ^file

    class PrefixExactMatch extends BaseMatch {
      constructor(pattern) {
        super(pattern);
      }
      static get type() {
        return 'prefix-exact'
      }
      static get multiRegex() {
        return /^\^"(.*)"$/
      }
      static get singleRegex() {
        return /^\^(.*)$/
      }
      search(text) {
        const isMatch = text.startsWith(this.pattern);

        return {
          isMatch,
          score: isMatch ? 0 : 1,
          indices: [0, this.pattern.length - 1]
        }
      }
    }

    // Token: !^fire

    class InversePrefixExactMatch extends BaseMatch {
      constructor(pattern) {
        super(pattern);
      }
      static get type() {
        return 'inverse-prefix-exact'
      }
      static get multiRegex() {
        return /^!\^"(.*)"$/
      }
      static get singleRegex() {
        return /^!\^(.*)$/
      }
      search(text) {
        const isMatch = !text.startsWith(this.pattern);

        return {
          isMatch,
          score: isMatch ? 0 : 1,
          indices: [0, text.length - 1]
        }
      }
    }

    // Token: .file$

    class SuffixExactMatch extends BaseMatch {
      constructor(pattern) {
        super(pattern);
      }
      static get type() {
        return 'suffix-exact'
      }
      static get multiRegex() {
        return /^"(.*)"\$$/
      }
      static get singleRegex() {
        return /^(.*)\$$/
      }
      search(text) {
        const isMatch = text.endsWith(this.pattern);

        return {
          isMatch,
          score: isMatch ? 0 : 1,
          indices: [text.length - this.pattern.length, text.length - 1]
        }
      }
    }

    // Token: !.file$

    class InverseSuffixExactMatch extends BaseMatch {
      constructor(pattern) {
        super(pattern);
      }
      static get type() {
        return 'inverse-suffix-exact'
      }
      static get multiRegex() {
        return /^!"(.*)"\$$/
      }
      static get singleRegex() {
        return /^!(.*)\$$/
      }
      search(text) {
        const isMatch = !text.endsWith(this.pattern);
        return {
          isMatch,
          score: isMatch ? 0 : 1,
          indices: [0, text.length - 1]
        }
      }
    }

    class FuzzyMatch extends BaseMatch {
      constructor(
        pattern,
        {
          location = Config.location,
          threshold = Config.threshold,
          distance = Config.distance,
          includeMatches = Config.includeMatches,
          findAllMatches = Config.findAllMatches,
          minMatchCharLength = Config.minMatchCharLength,
          isCaseSensitive = Config.isCaseSensitive,
          ignoreLocation = Config.ignoreLocation
        } = {}
      ) {
        super(pattern);
        this._bitapSearch = new BitapSearch(pattern, {
          location,
          threshold,
          distance,
          includeMatches,
          findAllMatches,
          minMatchCharLength,
          isCaseSensitive,
          ignoreLocation
        });
      }
      static get type() {
        return 'fuzzy'
      }
      static get multiRegex() {
        return /^"(.*)"$/
      }
      static get singleRegex() {
        return /^(.*)$/
      }
      search(text) {
        return this._bitapSearch.searchIn(text)
      }
    }

    // Token: 'file

    class IncludeMatch extends BaseMatch {
      constructor(pattern) {
        super(pattern);
      }
      static get type() {
        return 'include'
      }
      static get multiRegex() {
        return /^'"(.*)"$/
      }
      static get singleRegex() {
        return /^'(.*)$/
      }
      search(text) {
        let location = 0;
        let index;

        const indices = [];
        const patternLen = this.pattern.length;

        // Get all exact matches
        while ((index = text.indexOf(this.pattern, location)) > -1) {
          location = index + patternLen;
          indices.push([index, location - 1]);
        }

        const isMatch = !!indices.length;

        return {
          isMatch,
          score: isMatch ? 0 : 1,
          indices
        }
      }
    }

    // ❗Order is important. DO NOT CHANGE.
    const searchers = [
      ExactMatch,
      IncludeMatch,
      PrefixExactMatch,
      InversePrefixExactMatch,
      InverseSuffixExactMatch,
      SuffixExactMatch,
      InverseExactMatch,
      FuzzyMatch
    ];

    const searchersLen = searchers.length;

    // Regex to split by spaces, but keep anything in quotes together
    const SPACE_RE = / +(?=([^\"]*\"[^\"]*\")*[^\"]*$)/;
    const OR_TOKEN = '|';

    // Return a 2D array representation of the query, for simpler parsing.
    // Example:
    // "^core go$ | rb$ | py$ xy$" => [["^core", "go$"], ["rb$"], ["py$", "xy$"]]
    function parseQuery(pattern, options = {}) {
      return pattern.split(OR_TOKEN).map((item) => {
        let query = item
          .trim()
          .split(SPACE_RE)
          .filter((item) => item && !!item.trim());

        let results = [];
        for (let i = 0, len = query.length; i < len; i += 1) {
          const queryItem = query[i];

          // 1. Handle multiple query match (i.e, once that are quoted, like `"hello world"`)
          let found = false;
          let idx = -1;
          while (!found && ++idx < searchersLen) {
            const searcher = searchers[idx];
            let token = searcher.isMultiMatch(queryItem);
            if (token) {
              results.push(new searcher(token, options));
              found = true;
            }
          }

          if (found) {
            continue
          }

          // 2. Handle single query matches (i.e, once that are *not* quoted)
          idx = -1;
          while (++idx < searchersLen) {
            const searcher = searchers[idx];
            let token = searcher.isSingleMatch(queryItem);
            if (token) {
              results.push(new searcher(token, options));
              break
            }
          }
        }

        return results
      })
    }

    // These extended matchers can return an array of matches, as opposed
    // to a singl match
    const MultiMatchSet = new Set([FuzzyMatch.type, IncludeMatch.type]);

    /**
     * Command-like searching
     * ======================
     *
     * Given multiple search terms delimited by spaces.e.g. `^jscript .python$ ruby !java`,
     * search in a given text.
     *
     * Search syntax:
     *
     * | Token       | Match type                 | Description                            |
     * | ----------- | -------------------------- | -------------------------------------- |
     * | `jscript`   | fuzzy-match                | Items that fuzzy match `jscript`       |
     * | `=scheme`   | exact-match                | Items that are `scheme`                |
     * | `'python`   | include-match              | Items that include `python`            |
     * | `!ruby`     | inverse-exact-match        | Items that do not include `ruby`       |
     * | `^java`     | prefix-exact-match         | Items that start with `java`           |
     * | `!^earlang` | inverse-prefix-exact-match | Items that do not start with `earlang` |
     * | `.js$`      | suffix-exact-match         | Items that end with `.js`              |
     * | `!.go$`     | inverse-suffix-exact-match | Items that do not end with `.go`       |
     *
     * A single pipe character acts as an OR operator. For example, the following
     * query matches entries that start with `core` and end with either`go`, `rb`,
     * or`py`.
     *
     * ```
     * ^core go$ | rb$ | py$
     * ```
     */
    class ExtendedSearch {
      constructor(
        pattern,
        {
          isCaseSensitive = Config.isCaseSensitive,
          includeMatches = Config.includeMatches,
          minMatchCharLength = Config.minMatchCharLength,
          ignoreLocation = Config.ignoreLocation,
          findAllMatches = Config.findAllMatches,
          location = Config.location,
          threshold = Config.threshold,
          distance = Config.distance
        } = {}
      ) {
        this.query = null;
        this.options = {
          isCaseSensitive,
          includeMatches,
          minMatchCharLength,
          findAllMatches,
          ignoreLocation,
          location,
          threshold,
          distance
        };

        this.pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
        this.query = parseQuery(this.pattern, this.options);
      }

      static condition(_, options) {
        return options.useExtendedSearch
      }

      searchIn(text) {
        const query = this.query;

        if (!query) {
          return {
            isMatch: false,
            score: 1
          }
        }

        const { includeMatches, isCaseSensitive } = this.options;

        text = isCaseSensitive ? text : text.toLowerCase();

        let numMatches = 0;
        let allIndices = [];
        let totalScore = 0;

        // ORs
        for (let i = 0, qLen = query.length; i < qLen; i += 1) {
          const searchers = query[i];

          // Reset indices
          allIndices.length = 0;
          numMatches = 0;

          // ANDs
          for (let j = 0, pLen = searchers.length; j < pLen; j += 1) {
            const searcher = searchers[j];
            const { isMatch, indices, score } = searcher.search(text);

            if (isMatch) {
              numMatches += 1;
              totalScore += score;
              if (includeMatches) {
                const type = searcher.constructor.type;
                if (MultiMatchSet.has(type)) {
                  allIndices = [...allIndices, ...indices];
                } else {
                  allIndices.push(indices);
                }
              }
            } else {
              totalScore = 0;
              numMatches = 0;
              allIndices.length = 0;
              break
            }
          }

          // OR condition, so if TRUE, return
          if (numMatches) {
            let result = {
              isMatch: true,
              score: totalScore / numMatches
            };

            if (includeMatches) {
              result.indices = allIndices;
            }

            return result
          }
        }

        // Nothing was matched
        return {
          isMatch: false,
          score: 1
        }
      }
    }

    const registeredSearchers = [];

    function register(...args) {
      registeredSearchers.push(...args);
    }

    function createSearcher(pattern, options) {
      for (let i = 0, len = registeredSearchers.length; i < len; i += 1) {
        let searcherClass = registeredSearchers[i];
        if (searcherClass.condition(pattern, options)) {
          return new searcherClass(pattern, options)
        }
      }

      return new BitapSearch(pattern, options)
    }

    const LogicalOperator = {
      AND: '$and',
      OR: '$or'
    };

    const KeyType = {
      PATH: '$path',
      PATTERN: '$val'
    };

    const isExpression = (query) =>
      !!(query[LogicalOperator.AND] || query[LogicalOperator.OR]);

    const isPath = (query) => !!query[KeyType.PATH];

    const isLeaf = (query) =>
      !isArray$1(query) && isObject$1(query) && !isExpression(query);

    const convertToExplicit = (query) => ({
      [LogicalOperator.AND]: Object.keys(query).map((key) => ({
        [key]: query[key]
      }))
    });

    // When `auto` is `true`, the parse function will infer and initialize and add
    // the appropriate `Searcher` instance
    function parse(query, options, { auto = true } = {}) {
      const next = (query) => {
        let keys = Object.keys(query);

        const isQueryPath = isPath(query);

        if (!isQueryPath && keys.length > 1 && !isExpression(query)) {
          return next(convertToExplicit(query))
        }

        if (isLeaf(query)) {
          const key = isQueryPath ? query[KeyType.PATH] : keys[0];

          const pattern = isQueryPath ? query[KeyType.PATTERN] : query[key];

          if (!isString(pattern)) {
            throw new Error(LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(key))
          }

          const obj = {
            keyId: createKeyId(key),
            pattern
          };

          if (auto) {
            obj.searcher = createSearcher(pattern, options);
          }

          return obj
        }

        let node = {
          children: [],
          operator: keys[0]
        };

        keys.forEach((key) => {
          const value = query[key];

          if (isArray$1(value)) {
            value.forEach((item) => {
              node.children.push(next(item));
            });
          }
        });

        return node
      };

      if (!isExpression(query)) {
        query = convertToExplicit(query);
      }

      return next(query)
    }

    // Practical scoring function
    function computeScore$1(
      results,
      { ignoreFieldNorm = Config.ignoreFieldNorm }
    ) {
      results.forEach((result) => {
        let totalScore = 1;

        result.matches.forEach(({ key, norm, score }) => {
          const weight = key ? key.weight : null;

          totalScore *= Math.pow(
            score === 0 && weight ? Number.EPSILON : score,
            (weight || 1) * (ignoreFieldNorm ? 1 : norm)
          );
        });

        result.score = totalScore;
      });
    }

    function transformMatches(result, data) {
      const matches = result.matches;
      data.matches = [];

      if (!isDefined(matches)) {
        return
      }

      matches.forEach((match) => {
        if (!isDefined(match.indices) || !match.indices.length) {
          return
        }

        const { indices, value } = match;

        let obj = {
          indices,
          value
        };

        if (match.key) {
          obj.key = match.key.src;
        }

        if (match.idx > -1) {
          obj.refIndex = match.idx;
        }

        data.matches.push(obj);
      });
    }

    function transformScore(result, data) {
      data.score = result.score;
    }

    function format(
      results,
      docs,
      {
        includeMatches = Config.includeMatches,
        includeScore = Config.includeScore
      } = {}
    ) {
      const transformers = [];

      if (includeMatches) transformers.push(transformMatches);
      if (includeScore) transformers.push(transformScore);

      return results.map((result) => {
        const { idx } = result;

        const data = {
          item: docs[idx],
          refIndex: idx
        };

        if (transformers.length) {
          transformers.forEach((transformer) => {
            transformer(result, data);
          });
        }

        return data
      })
    }

    class Fuse {
      constructor(docs, options = {}, index) {
        this.options = { ...Config, ...options };

        if (
          this.options.useExtendedSearch &&
          !true
        ) {
          throw new Error(EXTENDED_SEARCH_UNAVAILABLE)
        }

        this._keyStore = new KeyStore(this.options.keys);

        this.setCollection(docs, index);
      }

      setCollection(docs, index) {
        this._docs = docs;

        if (index && !(index instanceof FuseIndex)) {
          throw new Error(INCORRECT_INDEX_TYPE)
        }

        this._myIndex =
          index ||
          createIndex(this.options.keys, this._docs, {
            getFn: this.options.getFn
          });
      }

      add(doc) {
        if (!isDefined(doc)) {
          return
        }

        this._docs.push(doc);
        this._myIndex.add(doc);
      }

      remove(predicate = (/* doc, idx */) => false) {
        const results = [];

        for (let i = 0, len = this._docs.length; i < len; i += 1) {
          const doc = this._docs[i];
          if (predicate(doc, i)) {
            this.removeAt(i);
            i -= 1;
            len -= 1;

            results.push(doc);
          }
        }

        return results
      }

      removeAt(idx) {
        this._docs.splice(idx, 1);
        this._myIndex.removeAt(idx);
      }

      getIndex() {
        return this._myIndex
      }

      search(query, { limit = -1 } = {}) {
        const {
          includeMatches,
          includeScore,
          shouldSort,
          sortFn,
          ignoreFieldNorm
        } = this.options;

        let results = isString(query)
          ? isString(this._docs[0])
            ? this._searchStringList(query)
            : this._searchObjectList(query)
          : this._searchLogical(query);

        computeScore$1(results, { ignoreFieldNorm });

        if (shouldSort) {
          results.sort(sortFn);
        }

        if (isNumber(limit) && limit > -1) {
          results = results.slice(0, limit);
        }

        return format(results, this._docs, {
          includeMatches,
          includeScore
        })
      }

      _searchStringList(query) {
        const searcher = createSearcher(query, this.options);
        const { records } = this._myIndex;
        const results = [];

        // Iterate over every string in the index
        records.forEach(({ v: text, i: idx, n: norm }) => {
          if (!isDefined(text)) {
            return
          }

          const { isMatch, score, indices } = searcher.searchIn(text);

          if (isMatch) {
            results.push({
              item: text,
              idx,
              matches: [{ score, value: text, norm, indices }]
            });
          }
        });

        return results
      }

      _searchLogical(query) {

        const expression = parse(query, this.options);

        const evaluate = (node, item, idx) => {
          if (!node.children) {
            const { keyId, searcher } = node;

            const matches = this._findMatches({
              key: this._keyStore.get(keyId),
              value: this._myIndex.getValueForItemAtKeyId(item, keyId),
              searcher
            });

            if (matches && matches.length) {
              return [
                {
                  idx,
                  item,
                  matches
                }
              ]
            }

            return []
          }

          /*eslint indent: [2, 2, {"SwitchCase": 1}]*/
          switch (node.operator) {
            case LogicalOperator.AND: {
              const res = [];
              for (let i = 0, len = node.children.length; i < len; i += 1) {
                const child = node.children[i];
                const result = evaluate(child, item, idx);
                if (result.length) {
                  res.push(...result);
                } else {
                  return []
                }
              }
              return res
            }
            case LogicalOperator.OR: {
              const res = [];
              for (let i = 0, len = node.children.length; i < len; i += 1) {
                const child = node.children[i];
                const result = evaluate(child, item, idx);
                if (result.length) {
                  res.push(...result);
                  break
                }
              }
              return res
            }
          }
        };

        const records = this._myIndex.records;
        const resultMap = {};
        const results = [];

        records.forEach(({ $: item, i: idx }) => {
          if (isDefined(item)) {
            let expResults = evaluate(expression, item, idx);

            if (expResults.length) {
              // Dedupe when adding
              if (!resultMap[idx]) {
                resultMap[idx] = { idx, item, matches: [] };
                results.push(resultMap[idx]);
              }
              expResults.forEach(({ matches }) => {
                resultMap[idx].matches.push(...matches);
              });
            }
          }
        });

        return results
      }

      _searchObjectList(query) {
        const searcher = createSearcher(query, this.options);
        const { keys, records } = this._myIndex;
        const results = [];

        // List is Array<Object>
        records.forEach(({ $: item, i: idx }) => {
          if (!isDefined(item)) {
            return
          }

          let matches = [];

          // Iterate over every key (i.e, path), and fetch the value at that key
          keys.forEach((key, keyIndex) => {
            matches.push(
              ...this._findMatches({
                key,
                value: item[keyIndex],
                searcher
              })
            );
          });

          if (matches.length) {
            results.push({
              idx,
              item,
              matches
            });
          }
        });

        return results
      }
      _findMatches({ key, value, searcher }) {
        if (!isDefined(value)) {
          return []
        }

        let matches = [];

        if (isArray$1(value)) {
          value.forEach(({ v: text, i: idx, n: norm }) => {
            if (!isDefined(text)) {
              return
            }

            const { isMatch, score, indices } = searcher.searchIn(text);

            if (isMatch) {
              matches.push({
                score,
                key,
                value: text,
                idx,
                norm,
                indices
              });
            }
          });
        } else {
          const { v: text, n: norm } = value;

          const { isMatch, score, indices } = searcher.searchIn(text);

          if (isMatch) {
            matches.push({ score, key, value: text, norm, indices });
          }
        }

        return matches
      }
    }

    Fuse.version = '6.4.6';
    Fuse.createIndex = createIndex;
    Fuse.parseIndex = parseIndex;
    Fuse.config = Config;

    {
      Fuse.parseQuery = parse;
    }

    {
      register(ExtendedSearch);
    }

    function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

    // Older browsers don't support event options, feature detect it.

    // Adopted and modified solution from Bohdan Didukh (2017)
    // https://stackoverflow.com/questions/41594997/ios-10-safari-prevent-scrolling-behind-a-fixed-overlay-and-maintain-scroll-posi

    var hasPassiveEvents = false;
    if (typeof window !== 'undefined') {
      var passiveTestOptions = {
        get passive() {
          hasPassiveEvents = true;
          return undefined;
        }
      };
      window.addEventListener('testPassive', null, passiveTestOptions);
      window.removeEventListener('testPassive', null, passiveTestOptions);
    }

    var isIosDevice = typeof window !== 'undefined' && window.navigator && window.navigator.platform && (/iP(ad|hone|od)/.test(window.navigator.platform) || window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);


    var locks = [];
    var documentListenerAdded = false;
    var initialClientY = -1;
    var previousBodyOverflowSetting = void 0;
    var previousBodyPaddingRight = void 0;

    // returns true if `el` should be allowed to receive touchmove events.
    var allowTouchMove = function allowTouchMove(el) {
      return locks.some(function (lock) {
        if (lock.options.allowTouchMove && lock.options.allowTouchMove(el)) {
          return true;
        }

        return false;
      });
    };

    var preventDefault = function preventDefault(rawEvent) {
      var e = rawEvent || window.event;

      // For the case whereby consumers adds a touchmove event listener to document.
      // Recall that we do document.addEventListener('touchmove', preventDefault, { passive: false })
      // in disableBodyScroll - so if we provide this opportunity to allowTouchMove, then
      // the touchmove event on document will break.
      if (allowTouchMove(e.target)) {
        return true;
      }

      // Do not prevent if the event has more than one touch (usually meaning this is a multi touch gesture like pinch to zoom).
      if (e.touches.length > 1) return true;

      if (e.preventDefault) e.preventDefault();

      return false;
    };

    var setOverflowHidden = function setOverflowHidden(options) {
      // If previousBodyPaddingRight is already set, don't set it again.
      if (previousBodyPaddingRight === undefined) {
        var _reserveScrollBarGap = !!options && options.reserveScrollBarGap === true;
        var scrollBarGap = window.innerWidth - document.documentElement.clientWidth;

        if (_reserveScrollBarGap && scrollBarGap > 0) {
          previousBodyPaddingRight = document.body.style.paddingRight;
          document.body.style.paddingRight = scrollBarGap + 'px';
        }
      }

      // If previousBodyOverflowSetting is already set, don't set it again.
      if (previousBodyOverflowSetting === undefined) {
        previousBodyOverflowSetting = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
    };

    var restoreOverflowSetting = function restoreOverflowSetting() {
      if (previousBodyPaddingRight !== undefined) {
        document.body.style.paddingRight = previousBodyPaddingRight;

        // Restore previousBodyPaddingRight to undefined so setOverflowHidden knows it
        // can be set again.
        previousBodyPaddingRight = undefined;
      }

      if (previousBodyOverflowSetting !== undefined) {
        document.body.style.overflow = previousBodyOverflowSetting;

        // Restore previousBodyOverflowSetting to undefined
        // so setOverflowHidden knows it can be set again.
        previousBodyOverflowSetting = undefined;
      }
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#Problems_and_solutions
    var isTargetElementTotallyScrolled = function isTargetElementTotallyScrolled(targetElement) {
      return targetElement ? targetElement.scrollHeight - targetElement.scrollTop <= targetElement.clientHeight : false;
    };

    var handleScroll = function handleScroll(event, targetElement) {
      var clientY = event.targetTouches[0].clientY - initialClientY;

      if (allowTouchMove(event.target)) {
        return false;
      }

      if (targetElement && targetElement.scrollTop === 0 && clientY > 0) {
        // element is at the top of its scroll.
        return preventDefault(event);
      }

      if (isTargetElementTotallyScrolled(targetElement) && clientY < 0) {
        // element is at the bottom of its scroll.
        return preventDefault(event);
      }

      event.stopPropagation();
      return true;
    };

    var disableBodyScroll = function disableBodyScroll(targetElement, options) {
      // targetElement must be provided
      if (!targetElement) {
        // eslint-disable-next-line no-console
        console.error('disableBodyScroll unsuccessful - targetElement must be provided when calling disableBodyScroll on IOS devices.');
        return;
      }

      // disableBodyScroll must not have been called on this targetElement before
      if (locks.some(function (lock) {
        return lock.targetElement === targetElement;
      })) {
        return;
      }

      var lock = {
        targetElement: targetElement,
        options: options || {}
      };

      locks = [].concat(_toConsumableArray(locks), [lock]);

      if (isIosDevice) {
        targetElement.ontouchstart = function (event) {
          if (event.targetTouches.length === 1) {
            // detect single touch.
            initialClientY = event.targetTouches[0].clientY;
          }
        };
        targetElement.ontouchmove = function (event) {
          if (event.targetTouches.length === 1) {
            // detect single touch.
            handleScroll(event, targetElement);
          }
        };

        if (!documentListenerAdded) {
          document.addEventListener('touchmove', preventDefault, hasPassiveEvents ? { passive: false } : undefined);
          documentListenerAdded = true;
        }
      } else {
        setOverflowHidden(options);
      }
    };

    var enableBodyScroll = function enableBodyScroll(targetElement) {
      if (!targetElement) {
        // eslint-disable-next-line no-console
        console.error('enableBodyScroll unsuccessful - targetElement must be provided when calling enableBodyScroll on IOS devices.');
        return;
      }

      locks = locks.filter(function (lock) {
        return lock.targetElement !== targetElement;
      });

      if (isIosDevice) {
        targetElement.ontouchstart = null;
        targetElement.ontouchmove = null;

        if (documentListenerAdded && locks.length === 0) {
          document.removeEventListener('touchmove', preventDefault, hasPassiveEvents ? { passive: false } : undefined);
          documentListenerAdded = false;
        }
      } else if (!locks.length) {
        restoreOverflowSetting();
      }
    };

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    /** Detect free variable `global` from Node.js. */
    var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

    var _freeGlobal = freeGlobal;

    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

    /** Used as a reference to the global object. */
    var root = _freeGlobal || freeSelf || Function('return this')();

    var _root = root;

    /** Built-in value references. */
    var Symbol = _root.Symbol;

    var _Symbol = Symbol;

    /**
     * A specialized version of `_.map` for arrays without support for iteratee
     * shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     */
    function arrayMap(array, iteratee) {
      var index = -1,
          length = array == null ? 0 : array.length,
          result = Array(length);

      while (++index < length) {
        result[index] = iteratee(array[index], index, array);
      }
      return result;
    }

    var _arrayMap = arrayMap;

    /**
     * Checks if `value` is classified as an `Array` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array, else `false`.
     * @example
     *
     * _.isArray([1, 2, 3]);
     * // => true
     *
     * _.isArray(document.body.children);
     * // => false
     *
     * _.isArray('abc');
     * // => false
     *
     * _.isArray(_.noop);
     * // => false
     */
    var isArray = Array.isArray;

    var isArray_1 = isArray;

    /** Used for built-in method references. */
    var objectProto$4 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$3 = objectProto$4.hasOwnProperty;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString$1 = objectProto$4.toString;

    /** Built-in value references. */
    var symToStringTag$1 = _Symbol ? _Symbol.toStringTag : undefined;

    /**
     * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the raw `toStringTag`.
     */
    function getRawTag(value) {
      var isOwn = hasOwnProperty$3.call(value, symToStringTag$1),
          tag = value[symToStringTag$1];

      try {
        value[symToStringTag$1] = undefined;
        var unmasked = true;
      } catch (e) {}

      var result = nativeObjectToString$1.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag$1] = tag;
        } else {
          delete value[symToStringTag$1];
        }
      }
      return result;
    }

    var _getRawTag = getRawTag;

    /** Used for built-in method references. */
    var objectProto$3 = Object.prototype;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString = objectProto$3.toString;

    /**
     * Converts `value` to a string using `Object.prototype.toString`.
     *
     * @private
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     */
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }

    var _objectToString = objectToString;

    /** `Object#toString` result references. */
    var nullTag = '[object Null]',
        undefinedTag = '[object Undefined]';

    /** Built-in value references. */
    var symToStringTag = _Symbol ? _Symbol.toStringTag : undefined;

    /**
     * The base implementation of `getTag` without fallbacks for buggy environments.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    function baseGetTag(value) {
      if (value == null) {
        return value === undefined ? undefinedTag : nullTag;
      }
      return (symToStringTag && symToStringTag in Object(value))
        ? _getRawTag(value)
        : _objectToString(value);
    }

    var _baseGetTag = baseGetTag;

    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return value != null && typeof value == 'object';
    }

    var isObjectLike_1 = isObjectLike;

    /** `Object#toString` result references. */
    var symbolTag = '[object Symbol]';

    /**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */
    function isSymbol(value) {
      return typeof value == 'symbol' ||
        (isObjectLike_1(value) && _baseGetTag(value) == symbolTag);
    }

    var isSymbol_1 = isSymbol;

    /** Used as references for various `Number` constants. */
    var INFINITY$2 = 1 / 0;

    /** Used to convert symbols to primitives and strings. */
    var symbolProto = _Symbol ? _Symbol.prototype : undefined,
        symbolToString = symbolProto ? symbolProto.toString : undefined;

    /**
     * The base implementation of `_.toString` which doesn't convert nullish
     * values to empty strings.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     */
    function baseToString(value) {
      // Exit early for strings to avoid a performance hit in some environments.
      if (typeof value == 'string') {
        return value;
      }
      if (isArray_1(value)) {
        // Recursively convert values (susceptible to call stack limits).
        return _arrayMap(value, baseToString) + '';
      }
      if (isSymbol_1(value)) {
        return symbolToString ? symbolToString.call(value) : '';
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY$2) ? '-0' : result;
    }

    var _baseToString = baseToString;

    /** Used to match a single whitespace character. */
    var reWhitespace = /\s/;

    /**
     * Used by `_.trim` and `_.trimEnd` to get the index of the last non-whitespace
     * character of `string`.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {number} Returns the index of the last non-whitespace character.
     */
    function trimmedEndIndex(string) {
      var index = string.length;

      while (index-- && reWhitespace.test(string.charAt(index))) {}
      return index;
    }

    var _trimmedEndIndex = trimmedEndIndex;

    /** Used to match leading whitespace. */
    var reTrimStart = /^\s+/;

    /**
     * The base implementation of `_.trim`.
     *
     * @private
     * @param {string} string The string to trim.
     * @returns {string} Returns the trimmed string.
     */
    function baseTrim(string) {
      return string
        ? string.slice(0, _trimmedEndIndex(string) + 1).replace(reTrimStart, '')
        : string;
    }

    var _baseTrim = baseTrim;

    /**
     * The base implementation of `_.slice` without an iteratee call guard.
     *
     * @private
     * @param {Array} array The array to slice.
     * @param {number} [start=0] The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns the slice of `array`.
     */
    function baseSlice(array, start, end) {
      var index = -1,
          length = array.length;

      if (start < 0) {
        start = -start > length ? 0 : (length + start);
      }
      end = end > length ? length : end;
      if (end < 0) {
        end += length;
      }
      length = start > end ? 0 : ((end - start) >>> 0);
      start >>>= 0;

      var result = Array(length);
      while (++index < length) {
        result[index] = array[index + start];
      }
      return result;
    }

    var _baseSlice = baseSlice;

    /**
     * Casts `array` to a slice if it's needed.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {number} start The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns the cast slice.
     */
    function castSlice(array, start, end) {
      var length = array.length;
      end = end === undefined ? length : end;
      return (!start && end >= length) ? array : _baseSlice(array, start, end);
    }

    var _castSlice = castSlice;

    /**
     * The base implementation of `_.findIndex` and `_.findLastIndex` without
     * support for iteratee shorthands.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {Function} predicate The function invoked per iteration.
     * @param {number} fromIndex The index to search from.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function baseFindIndex(array, predicate, fromIndex, fromRight) {
      var length = array.length,
          index = fromIndex + (fromRight ? 1 : -1);

      while ((fromRight ? index-- : ++index < length)) {
        if (predicate(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }

    var _baseFindIndex = baseFindIndex;

    /**
     * The base implementation of `_.isNaN` without support for number objects.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
     */
    function baseIsNaN(value) {
      return value !== value;
    }

    var _baseIsNaN = baseIsNaN;

    /**
     * A specialized version of `_.indexOf` which performs strict equality
     * comparisons of values, i.e. `===`.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} value The value to search for.
     * @param {number} fromIndex The index to search from.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function strictIndexOf(array, value, fromIndex) {
      var index = fromIndex - 1,
          length = array.length;

      while (++index < length) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    var _strictIndexOf = strictIndexOf;

    /**
     * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} value The value to search for.
     * @param {number} fromIndex The index to search from.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function baseIndexOf(array, value, fromIndex) {
      return value === value
        ? _strictIndexOf(array, value, fromIndex)
        : _baseFindIndex(array, _baseIsNaN, fromIndex);
    }

    var _baseIndexOf = baseIndexOf;

    /**
     * Used by `_.trim` and `_.trimEnd` to get the index of the last string symbol
     * that is not found in the character symbols.
     *
     * @private
     * @param {Array} strSymbols The string symbols to inspect.
     * @param {Array} chrSymbols The character symbols to find.
     * @returns {number} Returns the index of the last unmatched string symbol.
     */
    function charsEndIndex(strSymbols, chrSymbols) {
      var index = strSymbols.length;

      while (index-- && _baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
      return index;
    }

    var _charsEndIndex = charsEndIndex;

    /**
     * Used by `_.trim` and `_.trimStart` to get the index of the first string symbol
     * that is not found in the character symbols.
     *
     * @private
     * @param {Array} strSymbols The string symbols to inspect.
     * @param {Array} chrSymbols The character symbols to find.
     * @returns {number} Returns the index of the first unmatched string symbol.
     */
    function charsStartIndex(strSymbols, chrSymbols) {
      var index = -1,
          length = strSymbols.length;

      while (++index < length && _baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {}
      return index;
    }

    var _charsStartIndex = charsStartIndex;

    /**
     * Converts an ASCII `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function asciiToArray(string) {
      return string.split('');
    }

    var _asciiToArray = asciiToArray;

    /** Used to compose unicode character classes. */
    var rsAstralRange$1 = '\\ud800-\\udfff',
        rsComboMarksRange$1 = '\\u0300-\\u036f',
        reComboHalfMarksRange$1 = '\\ufe20-\\ufe2f',
        rsComboSymbolsRange$1 = '\\u20d0-\\u20ff',
        rsComboRange$1 = rsComboMarksRange$1 + reComboHalfMarksRange$1 + rsComboSymbolsRange$1,
        rsVarRange$1 = '\\ufe0e\\ufe0f';

    /** Used to compose unicode capture groups. */
    var rsZWJ$1 = '\\u200d';

    /** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
    var reHasUnicode = RegExp('[' + rsZWJ$1 + rsAstralRange$1  + rsComboRange$1 + rsVarRange$1 + ']');

    /**
     * Checks if `string` contains Unicode symbols.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {boolean} Returns `true` if a symbol is found, else `false`.
     */
    function hasUnicode(string) {
      return reHasUnicode.test(string);
    }

    var _hasUnicode = hasUnicode;

    /** Used to compose unicode character classes. */
    var rsAstralRange = '\\ud800-\\udfff',
        rsComboMarksRange = '\\u0300-\\u036f',
        reComboHalfMarksRange = '\\ufe20-\\ufe2f',
        rsComboSymbolsRange = '\\u20d0-\\u20ff',
        rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange,
        rsVarRange = '\\ufe0e\\ufe0f';

    /** Used to compose unicode capture groups. */
    var rsAstral = '[' + rsAstralRange + ']',
        rsCombo = '[' + rsComboRange + ']',
        rsFitz = '\\ud83c[\\udffb-\\udfff]',
        rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
        rsNonAstral = '[^' + rsAstralRange + ']',
        rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
        rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
        rsZWJ = '\\u200d';

    /** Used to compose unicode regexes. */
    var reOptMod = rsModifier + '?',
        rsOptVar = '[' + rsVarRange + ']?',
        rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
        rsSeq = rsOptVar + reOptMod + rsOptJoin,
        rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

    /** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
    var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

    /**
     * Converts a Unicode `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function unicodeToArray(string) {
      return string.match(reUnicode) || [];
    }

    var _unicodeToArray = unicodeToArray;

    /**
     * Converts `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function stringToArray(string) {
      return _hasUnicode(string)
        ? _unicodeToArray(string)
        : _asciiToArray(string);
    }

    var _stringToArray = stringToArray;

    /**
     * Converts `value` to a string. An empty string is returned for `null`
     * and `undefined` values. The sign of `-0` is preserved.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     * @example
     *
     * _.toString(null);
     * // => ''
     *
     * _.toString(-0);
     * // => '-0'
     *
     * _.toString([1, 2, 3]);
     * // => '1,2,3'
     */
    function toString(value) {
      return value == null ? '' : _baseToString(value);
    }

    var toString_1 = toString;

    /**
     * Removes leading and trailing whitespace or specified characters from `string`.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to trim.
     * @param {string} [chars=whitespace] The characters to trim.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {string} Returns the trimmed string.
     * @example
     *
     * _.trim('  abc  ');
     * // => 'abc'
     *
     * _.trim('-_-abc-_-', '_-');
     * // => 'abc'
     *
     * _.map(['  foo  ', '  bar  '], _.trim);
     * // => ['foo', 'bar']
     */
    function trim(string, chars, guard) {
      string = toString_1(string);
      if (string && (guard || chars === undefined)) {
        return _baseTrim(string);
      }
      if (!string || !(chars = _baseToString(chars))) {
        return string;
      }
      var strSymbols = _stringToArray(string),
          chrSymbols = _stringToArray(chars),
          start = _charsStartIndex(strSymbols, chrSymbols),
          end = _charsEndIndex(strSymbols, chrSymbols) + 1;

      return _castSlice(strSymbols, start, end).join('');
    }

    var trim_1 = trim;

    /**
     * Checks if `value` is the
     * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
     * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */
    function isObject(value) {
      var type = typeof value;
      return value != null && (type == 'object' || type == 'function');
    }

    var isObject_1 = isObject;

    /** `Object#toString` result references. */
    var asyncTag = '[object AsyncFunction]',
        funcTag = '[object Function]',
        genTag = '[object GeneratorFunction]',
        proxyTag = '[object Proxy]';

    /**
     * Checks if `value` is classified as a `Function` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     *
     * _.isFunction(/abc/);
     * // => false
     */
    function isFunction(value) {
      if (!isObject_1(value)) {
        return false;
      }
      // The use of `Object#toString` avoids issues with the `typeof` operator
      // in Safari 9 which returns 'object' for typed arrays and other constructors.
      var tag = _baseGetTag(value);
      return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }

    var isFunction_1 = isFunction;

    /** Used to detect overreaching core-js shims. */
    var coreJsData = _root['__core-js_shared__'];

    var _coreJsData = coreJsData;

    /** Used to detect methods masquerading as native. */
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(_coreJsData && _coreJsData.keys && _coreJsData.keys.IE_PROTO || '');
      return uid ? ('Symbol(src)_1.' + uid) : '';
    }());

    /**
     * Checks if `func` has its source masked.
     *
     * @private
     * @param {Function} func The function to check.
     * @returns {boolean} Returns `true` if `func` is masked, else `false`.
     */
    function isMasked(func) {
      return !!maskSrcKey && (maskSrcKey in func);
    }

    var _isMasked = isMasked;

    /** Used for built-in method references. */
    var funcProto$1 = Function.prototype;

    /** Used to resolve the decompiled source of functions. */
    var funcToString$1 = funcProto$1.toString;

    /**
     * Converts `func` to its source code.
     *
     * @private
     * @param {Function} func The function to convert.
     * @returns {string} Returns the source code.
     */
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString$1.call(func);
        } catch (e) {}
        try {
          return (func + '');
        } catch (e) {}
      }
      return '';
    }

    var _toSource = toSource;

    /**
     * Used to match `RegExp`
     * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
     */
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

    /** Used to detect host constructors (Safari). */
    var reIsHostCtor = /^\[object .+?Constructor\]$/;

    /** Used for built-in method references. */
    var funcProto = Function.prototype,
        objectProto$2 = Object.prototype;

    /** Used to resolve the decompiled source of functions. */
    var funcToString = funcProto.toString;

    /** Used to check objects for own properties. */
    var hasOwnProperty$2 = objectProto$2.hasOwnProperty;

    /** Used to detect if a method is native. */
    var reIsNative = RegExp('^' +
      funcToString.call(hasOwnProperty$2).replace(reRegExpChar, '\\$&')
      .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
    );

    /**
     * The base implementation of `_.isNative` without bad shim checks.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a native function,
     *  else `false`.
     */
    function baseIsNative(value) {
      if (!isObject_1(value) || _isMasked(value)) {
        return false;
      }
      var pattern = isFunction_1(value) ? reIsNative : reIsHostCtor;
      return pattern.test(_toSource(value));
    }

    var _baseIsNative = baseIsNative;

    /**
     * Gets the value at `key` of `object`.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {string} key The key of the property to get.
     * @returns {*} Returns the property value.
     */
    function getValue(object, key) {
      return object == null ? undefined : object[key];
    }

    var _getValue = getValue;

    /**
     * Gets the native function at `key` of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {string} key The key of the method to get.
     * @returns {*} Returns the function if it's native, else `undefined`.
     */
    function getNative(object, key) {
      var value = _getValue(object, key);
      return _baseIsNative(value) ? value : undefined;
    }

    var _getNative = getNative;

    /* Built-in method references that are verified to be native. */
    var nativeCreate = _getNative(Object, 'create');

    var _nativeCreate = nativeCreate;

    /**
     * Removes all key-value entries from the hash.
     *
     * @private
     * @name clear
     * @memberOf Hash
     */
    function hashClear() {
      this.__data__ = _nativeCreate ? _nativeCreate(null) : {};
      this.size = 0;
    }

    var _hashClear = hashClear;

    /**
     * Removes `key` and its value from the hash.
     *
     * @private
     * @name delete
     * @memberOf Hash
     * @param {Object} hash The hash to modify.
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function hashDelete(key) {
      var result = this.has(key) && delete this.__data__[key];
      this.size -= result ? 1 : 0;
      return result;
    }

    var _hashDelete = hashDelete;

    /** Used to stand-in for `undefined` hash values. */
    var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';

    /** Used for built-in method references. */
    var objectProto$1 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$1 = objectProto$1.hasOwnProperty;

    /**
     * Gets the hash value for `key`.
     *
     * @private
     * @name get
     * @memberOf Hash
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function hashGet(key) {
      var data = this.__data__;
      if (_nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED$1 ? undefined : result;
      }
      return hasOwnProperty$1.call(data, key) ? data[key] : undefined;
    }

    var _hashGet = hashGet;

    /** Used for built-in method references. */
    var objectProto = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty = objectProto.hasOwnProperty;

    /**
     * Checks if a hash value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf Hash
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function hashHas(key) {
      var data = this.__data__;
      return _nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
    }

    var _hashHas = hashHas;

    /** Used to stand-in for `undefined` hash values. */
    var HASH_UNDEFINED = '__lodash_hash_undefined__';

    /**
     * Sets the hash `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf Hash
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the hash instance.
     */
    function hashSet(key, value) {
      var data = this.__data__;
      this.size += this.has(key) ? 0 : 1;
      data[key] = (_nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
      return this;
    }

    var _hashSet = hashSet;

    /**
     * Creates a hash object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function Hash(entries) {
      var index = -1,
          length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `Hash`.
    Hash.prototype.clear = _hashClear;
    Hash.prototype['delete'] = _hashDelete;
    Hash.prototype.get = _hashGet;
    Hash.prototype.has = _hashHas;
    Hash.prototype.set = _hashSet;

    var _Hash = Hash;

    /**
     * Removes all key-value entries from the list cache.
     *
     * @private
     * @name clear
     * @memberOf ListCache
     */
    function listCacheClear() {
      this.__data__ = [];
      this.size = 0;
    }

    var _listCacheClear = listCacheClear;

    /**
     * Performs a
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * comparison between two values to determine if they are equivalent.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'a': 1 };
     * var other = { 'a': 1 };
     *
     * _.eq(object, object);
     * // => true
     *
     * _.eq(object, other);
     * // => false
     *
     * _.eq('a', 'a');
     * // => true
     *
     * _.eq('a', Object('a'));
     * // => false
     *
     * _.eq(NaN, NaN);
     * // => true
     */
    function eq(value, other) {
      return value === other || (value !== value && other !== other);
    }

    var eq_1 = eq;

    /**
     * Gets the index at which the `key` is found in `array` of key-value pairs.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} key The key to search for.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq_1(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }

    var _assocIndexOf = assocIndexOf;

    /** Used for built-in method references. */
    var arrayProto = Array.prototype;

    /** Built-in value references. */
    var splice = arrayProto.splice;

    /**
     * Removes `key` and its value from the list cache.
     *
     * @private
     * @name delete
     * @memberOf ListCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function listCacheDelete(key) {
      var data = this.__data__,
          index = _assocIndexOf(data, key);

      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      --this.size;
      return true;
    }

    var _listCacheDelete = listCacheDelete;

    /**
     * Gets the list cache value for `key`.
     *
     * @private
     * @name get
     * @memberOf ListCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function listCacheGet(key) {
      var data = this.__data__,
          index = _assocIndexOf(data, key);

      return index < 0 ? undefined : data[index][1];
    }

    var _listCacheGet = listCacheGet;

    /**
     * Checks if a list cache value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf ListCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function listCacheHas(key) {
      return _assocIndexOf(this.__data__, key) > -1;
    }

    var _listCacheHas = listCacheHas;

    /**
     * Sets the list cache `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf ListCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the list cache instance.
     */
    function listCacheSet(key, value) {
      var data = this.__data__,
          index = _assocIndexOf(data, key);

      if (index < 0) {
        ++this.size;
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }

    var _listCacheSet = listCacheSet;

    /**
     * Creates an list cache object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function ListCache(entries) {
      var index = -1,
          length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `ListCache`.
    ListCache.prototype.clear = _listCacheClear;
    ListCache.prototype['delete'] = _listCacheDelete;
    ListCache.prototype.get = _listCacheGet;
    ListCache.prototype.has = _listCacheHas;
    ListCache.prototype.set = _listCacheSet;

    var _ListCache = ListCache;

    /* Built-in method references that are verified to be native. */
    var Map$1 = _getNative(_root, 'Map');

    var _Map = Map$1;

    /**
     * Removes all key-value entries from the map.
     *
     * @private
     * @name clear
     * @memberOf MapCache
     */
    function mapCacheClear() {
      this.size = 0;
      this.__data__ = {
        'hash': new _Hash,
        'map': new (_Map || _ListCache),
        'string': new _Hash
      };
    }

    var _mapCacheClear = mapCacheClear;

    /**
     * Checks if `value` is suitable for use as unique object key.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
     */
    function isKeyable(value) {
      var type = typeof value;
      return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
        ? (value !== '__proto__')
        : (value === null);
    }

    var _isKeyable = isKeyable;

    /**
     * Gets the data for `map`.
     *
     * @private
     * @param {Object} map The map to query.
     * @param {string} key The reference key.
     * @returns {*} Returns the map data.
     */
    function getMapData(map, key) {
      var data = map.__data__;
      return _isKeyable(key)
        ? data[typeof key == 'string' ? 'string' : 'hash']
        : data.map;
    }

    var _getMapData = getMapData;

    /**
     * Removes `key` and its value from the map.
     *
     * @private
     * @name delete
     * @memberOf MapCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function mapCacheDelete(key) {
      var result = _getMapData(this, key)['delete'](key);
      this.size -= result ? 1 : 0;
      return result;
    }

    var _mapCacheDelete = mapCacheDelete;

    /**
     * Gets the map value for `key`.
     *
     * @private
     * @name get
     * @memberOf MapCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function mapCacheGet(key) {
      return _getMapData(this, key).get(key);
    }

    var _mapCacheGet = mapCacheGet;

    /**
     * Checks if a map value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf MapCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function mapCacheHas(key) {
      return _getMapData(this, key).has(key);
    }

    var _mapCacheHas = mapCacheHas;

    /**
     * Sets the map `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf MapCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the map cache instance.
     */
    function mapCacheSet(key, value) {
      var data = _getMapData(this, key),
          size = data.size;

      data.set(key, value);
      this.size += data.size == size ? 0 : 1;
      return this;
    }

    var _mapCacheSet = mapCacheSet;

    /**
     * Creates a map cache object to store key-value pairs.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function MapCache(entries) {
      var index = -1,
          length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `MapCache`.
    MapCache.prototype.clear = _mapCacheClear;
    MapCache.prototype['delete'] = _mapCacheDelete;
    MapCache.prototype.get = _mapCacheGet;
    MapCache.prototype.has = _mapCacheHas;
    MapCache.prototype.set = _mapCacheSet;

    var _MapCache = MapCache;

    /* Built-in method references that are verified to be native. */
    var Set$1 = _getNative(_root, 'Set');

    var _Set = Set$1;

    /**
     * This method returns `undefined`.
     *
     * @static
     * @memberOf _
     * @since 2.3.0
     * @category Util
     * @example
     *
     * _.times(2, _.noop);
     * // => [undefined, undefined]
     */
    function noop() {
      // No operation performed.
    }

    var noop_1 = noop;

    /**
     * Converts `set` to an array of its values.
     *
     * @private
     * @param {Object} set The set to convert.
     * @returns {Array} Returns the values.
     */
    function setToArray(set) {
      var index = -1,
          result = Array(set.size);

      set.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }

    var _setToArray = setToArray;

    /** Used as references for various `Number` constants. */
    var INFINITY$1 = 1 / 0;

    /**
     * Creates a set object of `values`.
     *
     * @private
     * @param {Array} values The values to add to the set.
     * @returns {Object} Returns the new set.
     */
    !(_Set && (1 / _setToArray(new _Set([,-0]))[1]) == INFINITY$1) ? noop_1 : function(values) {
      return new _Set(values);
    };

    /** Used to match property names within property paths. */
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
        reIsPlainProp = /^\w*$/;

    /**
     * Checks if `value` is a property name and not a property path.
     *
     * @private
     * @param {*} value The value to check.
     * @param {Object} [object] The object to query keys on.
     * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
     */
    function isKey(value, object) {
      if (isArray_1(value)) {
        return false;
      }
      var type = typeof value;
      if (type == 'number' || type == 'symbol' || type == 'boolean' ||
          value == null || isSymbol_1(value)) {
        return true;
      }
      return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
        (object != null && value in Object(object));
    }

    var _isKey = isKey;

    /** Error message constants. */
    var FUNC_ERROR_TEXT = 'Expected a function';

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided, it determines the cache key for storing the result based on the
     * arguments provided to the memoized function. By default, the first argument
     * provided to the memoized function is used as the map cache key. The `func`
     * is invoked with the `this` binding of the memoized function.
     *
     * **Note:** The cache is exposed as the `cache` property on the memoized
     * function. Its creation may be customized by replacing the `_.memoize.Cache`
     * constructor with one whose instances implement the
     * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
     * method interface of `clear`, `delete`, `get`, `has`, and `set`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] The function to resolve the cache key.
     * @returns {Function} Returns the new memoized function.
     * @example
     *
     * var object = { 'a': 1, 'b': 2 };
     * var other = { 'c': 3, 'd': 4 };
     *
     * var values = _.memoize(_.values);
     * values(object);
     * // => [1, 2]
     *
     * values(other);
     * // => [3, 4]
     *
     * object.a = 2;
     * values(object);
     * // => [1, 2]
     *
     * // Modify the result cache.
     * values.cache.set(object, ['a', 'b']);
     * values(object);
     * // => ['a', 'b']
     *
     * // Replace `_.memoize.Cache`.
     * _.memoize.Cache = WeakMap;
     */
    function memoize(func, resolver) {
      if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var memoized = function() {
        var args = arguments,
            key = resolver ? resolver.apply(this, args) : args[0],
            cache = memoized.cache;

        if (cache.has(key)) {
          return cache.get(key);
        }
        var result = func.apply(this, args);
        memoized.cache = cache.set(key, result) || cache;
        return result;
      };
      memoized.cache = new (memoize.Cache || _MapCache);
      return memoized;
    }

    // Expose `MapCache`.
    memoize.Cache = _MapCache;

    var memoize_1 = memoize;

    /** Used as the maximum memoize cache size. */
    var MAX_MEMOIZE_SIZE = 500;

    /**
     * A specialized version of `_.memoize` which clears the memoized function's
     * cache when it exceeds `MAX_MEMOIZE_SIZE`.
     *
     * @private
     * @param {Function} func The function to have its output memoized.
     * @returns {Function} Returns the new memoized function.
     */
    function memoizeCapped(func) {
      var result = memoize_1(func, function(key) {
        if (cache.size === MAX_MEMOIZE_SIZE) {
          cache.clear();
        }
        return key;
      });

      var cache = result.cache;
      return result;
    }

    var _memoizeCapped = memoizeCapped;

    /** Used to match property names within property paths. */
    var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

    /** Used to match backslashes in property paths. */
    var reEscapeChar = /\\(\\)?/g;

    /**
     * Converts `string` to a property path array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the property path array.
     */
    var stringToPath = _memoizeCapped(function(string) {
      var result = [];
      if (string.charCodeAt(0) === 46 /* . */) {
        result.push('');
      }
      string.replace(rePropName, function(match, number, quote, subString) {
        result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
      });
      return result;
    });

    var _stringToPath = stringToPath;

    /**
     * Casts `value` to a path array if it's not one.
     *
     * @private
     * @param {*} value The value to inspect.
     * @param {Object} [object] The object to query keys on.
     * @returns {Array} Returns the cast property path array.
     */
    function castPath(value, object) {
      if (isArray_1(value)) {
        return value;
      }
      return _isKey(value, object) ? [value] : _stringToPath(toString_1(value));
    }

    var _castPath = castPath;

    /** Used as references for various `Number` constants. */
    var INFINITY = 1 / 0;

    /**
     * Converts `value` to a string key if it's not a string or symbol.
     *
     * @private
     * @param {*} value The value to inspect.
     * @returns {string|symbol} Returns the key.
     */
    function toKey(value) {
      if (typeof value == 'string' || isSymbol_1(value)) {
        return value;
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }

    var _toKey = toKey;

    /**
     * The base implementation of `_.get` without support for default values.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @returns {*} Returns the resolved value.
     */
    function baseGet(object, path) {
      path = _castPath(path, object);

      var index = 0,
          length = path.length;

      while (object != null && index < length) {
        object = object[_toKey(path[index++])];
      }
      return (index && index == length) ? object : undefined;
    }

    var _baseGet = baseGet;

    /**
     * Gets the value at `path` of `object`. If the resolved value is
     * `undefined`, the `defaultValue` is returned in its place.
     *
     * @static
     * @memberOf _
     * @since 3.7.0
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @param {*} [defaultValue] The value returned for `undefined` resolved values.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }] };
     *
     * _.get(object, 'a[0].b.c');
     * // => 3
     *
     * _.get(object, ['a', '0', 'b', 'c']);
     * // => 3
     *
     * _.get(object, 'a.b.c', 'default');
     * // => 'default'
     */
    function get(object, path, defaultValue) {
      var result = object == null ? undefined : _baseGet(object, path);
      return result === undefined ? defaultValue : result;
    }

    var get_1 = get;

    /* svelte/Search.svelte generated by Svelte v3.41.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i][0];
    	child_ctx[5] = list[i][1];
    	child_ctx[26] = list[i][2];
    	child_ctx[27] = list[i][3];
    	child_ctx[28] = list[i][4];
    	child_ctx[29] = list[i][5];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	child_ctx[34] = i;
    	return child_ctx;
    }

    // (163:2) {#if results.length}
    function create_if_block(ctx) {
    	let section;
    	let h2;
    	let t0_value = /*noun*/ ctx[26] + "";
    	let t0;
    	let t1;
    	let small;
    	let t2_value = /*results*/ ctx[5].length + "";
    	let t2;
    	let h2_id_value;
    	let h2_aria_label_value;
    	let t3;
    	let div;
    	let t4;
    	let each_value_1 = /*results*/ ctx[5];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			section = element("section");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			small = element("small");
    			t2 = text(t2_value);
    			t3 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			attr(small, "class", "search-result-counter");
    			attr(h2, "id", h2_id_value = `results-${/*id*/ ctx[25]}`);
    			attr(h2, "aria-label", h2_aria_label_value = `Search results for ${/*noun*/ ctx[26]}`);
    			attr(div, "role", "feed");
    			attr(div, "aria-busy", "false");
    			attr(div, "aria-labelledby", "results-projects");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, h2);
    			append(h2, t0);
    			append(h2, t1);
    			append(h2, small);
    			append(small, t2);
    			append(section, t3);
    			append(section, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append(section, t4);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*resultsTotal*/ 16 && t0_value !== (t0_value = /*noun*/ ctx[26] + "")) set_data(t0, t0_value);
    			if (dirty[0] & /*resultsTotal*/ 16 && t2_value !== (t2_value = /*results*/ ctx[5].length + "")) set_data(t2, t2_value);

    			if (dirty[0] & /*resultsTotal*/ 16 && h2_id_value !== (h2_id_value = `results-${/*id*/ ctx[25]}`)) {
    				attr(h2, "id", h2_id_value);
    			}

    			if (dirty[0] & /*resultsTotal*/ 16 && h2_aria_label_value !== (h2_aria_label_value = `Search results for ${/*noun*/ ctx[26]}`)) {
    				attr(h2, "aria-label", h2_aria_label_value);
    			}

    			if (dirty[0] & /*resultsTotal, tabIndex, handleKeyDownResult*/ 536) {
    				each_value_1 = /*results*/ ctx[5];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (167:4) {#each results as result, i}
    function create_each_block_1(ctx) {
    	let a;
    	let span0;
    	let t0_value = get_1(/*result*/ ctx[32], /*title*/ ctx[27]) + "";
    	let t0;
    	let span0_id_value;
    	let t1;
    	let span1;
    	let t2_value = get_1(/*result*/ ctx[32], /*subtitle*/ ctx[28]) + "";
    	let t2;
    	let t3;
    	let a_href_value;
    	let a_aria_posinset_value;
    	let a_aria_setsize_value;
    	let a_aria_labelledby_value;
    	let a_id_value;
    	let mounted;
    	let dispose;

    	function focus_handler() {
    		return /*focus_handler*/ ctx[17](/*index*/ ctx[29], /*i*/ ctx[34]);
    	}

    	return {
    		c() {
    			a = element("a");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			attr(span0, "class", "result-title");
    			attr(span0, "id", span0_id_value = `search-result-${/*id*/ ctx[25]}-${/*i*/ ctx[34]}`);
    			attr(span1, "class", "result-subtitle");
    			attr(a, "role", "article");
    			attr(a, "href", a_href_value = "/" + get_1(/*result*/ ctx[32], 'slug'));
    			attr(a, "aria-posinset", a_aria_posinset_value = /*i*/ ctx[34] + 1);
    			attr(a, "aria-setsize", a_aria_setsize_value = /*results*/ ctx[5].length);
    			attr(a, "tabindex", "0");
    			attr(a, "aria-labelledby", a_aria_labelledby_value = `search-result-${/*id*/ ctx[25]}-${/*i*/ ctx[34]}`);
    			attr(a, "id", a_id_value = `result-index-${/*index*/ ctx[29] + /*i*/ ctx[34]}`);
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			append(a, span0);
    			append(span0, t0);
    			append(a, t1);
    			append(a, span1);
    			append(span1, t2);
    			append(a, t3);

    			if (!mounted) {
    				dispose = [
    					listen(a, "blur", /*blur_handler*/ ctx[16]),
    					listen(a, "focus", focus_handler),
    					listen(a, "keydown", /*handleKeyDownResult*/ ctx[9])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*resultsTotal*/ 16 && t0_value !== (t0_value = get_1(/*result*/ ctx[32], /*title*/ ctx[27]) + "")) set_data(t0, t0_value);

    			if (dirty[0] & /*resultsTotal*/ 16 && span0_id_value !== (span0_id_value = `search-result-${/*id*/ ctx[25]}-${/*i*/ ctx[34]}`)) {
    				attr(span0, "id", span0_id_value);
    			}

    			if (dirty[0] & /*resultsTotal*/ 16 && t2_value !== (t2_value = get_1(/*result*/ ctx[32], /*subtitle*/ ctx[28]) + "")) set_data(t2, t2_value);

    			if (dirty[0] & /*resultsTotal*/ 16 && a_href_value !== (a_href_value = "/" + get_1(/*result*/ ctx[32], 'slug'))) {
    				attr(a, "href", a_href_value);
    			}

    			if (dirty[0] & /*resultsTotal*/ 16 && a_aria_setsize_value !== (a_aria_setsize_value = /*results*/ ctx[5].length)) {
    				attr(a, "aria-setsize", a_aria_setsize_value);
    			}

    			if (dirty[0] & /*resultsTotal*/ 16 && a_aria_labelledby_value !== (a_aria_labelledby_value = `search-result-${/*id*/ ctx[25]}-${/*i*/ ctx[34]}`)) {
    				attr(a, "aria-labelledby", a_aria_labelledby_value);
    			}

    			if (dirty[0] & /*resultsTotal*/ 16 && a_id_value !== (a_id_value = `result-index-${/*index*/ ctx[29] + /*i*/ ctx[34]}`)) {
    				attr(a, "id", a_id_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (162:2) {#each resultsTotal as [id, results, noun, title, subtitle, index]}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*results*/ ctx[5].length && create_if_block(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*results*/ ctx[5].length) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let input_1;
    	let input_1_aria_hidden_value;
    	let t0;
    	let button;
    	let svg;
    	let path;
    	let circle;
    	let line0;
    	let line1;
    	let line2;
    	let button_title_value;
    	let t1;
    	let div1;
    	let div0;
    	let mounted;
    	let dispose;
    	let each_value = /*resultsTotal*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			input_1 = element("input");
    			t0 = space();
    			button = element("button");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			circle = svg_element("circle");
    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			line2 = svg_element("line");
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(input_1, "type", "search");
    			attr(input_1, "id", "page-search-input");
    			attr(input_1, "placeholder", "Type to search…");
    			attr(input_1, "role", "search");
    			attr(input_1, "aria-hidden", input_1_aria_hidden_value = Boolean(!/*isOpen*/ ctx[2]));
    			toggle_class(input_1, "hasTerm", /*hasTerm*/ ctx[1]);
    			attr(path, "stroke", "none");
    			attr(path, "d", "M0 0h24v24H0z");
    			attr(path, "fill", "none");
    			attr(circle, "cx", "10");
    			attr(circle, "cy", "10");
    			attr(circle, "r", "7");
    			attr(circle, "class", "s0");
    			attr(line0, "x1", "21");
    			attr(line0, "y1", "21");
    			attr(line0, "x2", "15");
    			attr(line0, "y2", "15");
    			attr(line0, "class", "s0");
    			attr(line1, "x1", "18");
    			attr(line1, "y1", "6");
    			attr(line1, "x2", "6");
    			attr(line1, "y2", "18");
    			attr(line1, "class", "s1");
    			attr(line2, "x1", "6");
    			attr(line2, "y1", "6");
    			attr(line2, "x2", "18");
    			attr(line2, "y2", "18");
    			attr(line2, "class", "s1");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "class", "trigger-icon icon icon-tabler icon-tabler-search");
    			attr(svg, "width", "24");
    			attr(svg, "height", "24");
    			attr(svg, "viewBox", "0 0 24 24");
    			attr(svg, "stroke-width", "2");
    			attr(svg, "stroke", "currentColor");
    			attr(svg, "fill", "none");
    			attr(svg, "stroke-linecap", "round");
    			attr(svg, "stroke-linejoin", "round");
    			toggle_class(svg, "isOpen", /*isOpen*/ ctx[2]);
    			attr(button, "class", "search-trigger");
    			attr(button, "id", "search-trigger");
    			attr(button, "title", button_title_value = `Click to ${/*isOpen*/ ctx[2] ? 'close' : 'open'} the search field`);
    			attr(div0, "class", "grid-wide");
    			attr(div1, "class", "search-results grid");
    			toggle_class(div1, "hasTerm", /*hasTerm*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, input_1, anchor);
    			/*input_1_binding*/ ctx[15](input_1);
    			insert(target, t0, anchor);
    			insert(target, button, anchor);
    			append(button, svg);
    			append(svg, path);
    			append(svg, circle);
    			append(svg, line0);
    			append(svg, line1);
    			append(svg, line2);
    			insert(target, t1, anchor);
    			insert(target, div1, anchor);
    			append(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			/*div1_binding*/ ctx[18](div1);

    			if (!mounted) {
    				dispose = [
    					listen(window, "keydown", /*handleKeyDown*/ ctx[7]),
    					listen(input_1, "input", /*handleInput*/ ctx[6]),
    					listen(input_1, "keydown", /*handleKeyDownInput*/ ctx[8]),
    					listen(input_1, "blur", /*handleBlur*/ ctx[11]),
    					listen(button, "click", /*handleTriggerClick*/ ctx[10])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*isOpen*/ 4 && input_1_aria_hidden_value !== (input_1_aria_hidden_value = Boolean(!/*isOpen*/ ctx[2]))) {
    				attr(input_1, "aria-hidden", input_1_aria_hidden_value);
    			}

    			if (dirty[0] & /*hasTerm*/ 2) {
    				toggle_class(input_1, "hasTerm", /*hasTerm*/ ctx[1]);
    			}

    			if (dirty[0] & /*isOpen*/ 4) {
    				toggle_class(svg, "isOpen", /*isOpen*/ ctx[2]);
    			}

    			if (dirty[0] & /*isOpen*/ 4 && button_title_value !== (button_title_value = `Click to ${/*isOpen*/ ctx[2] ? 'close' : 'open'} the search field`)) {
    				attr(button, "title", button_title_value);
    			}

    			if (dirty[0] & /*resultsTotal, tabIndex, handleKeyDownResult*/ 536) {
    				each_value = /*resultsTotal*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*hasTerm*/ 2) {
    				toggle_class(div1, "hasTerm", /*hasTerm*/ ctx[1]);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(input_1);
    			/*input_1_binding*/ ctx[15](null);
    			if (detaching) detach(t0);
    			if (detaching) detach(button);
    			if (detaching) detach(t1);
    			if (detaching) detach(div1);
    			destroy_each(each_blocks, detaching);
    			/*div1_binding*/ ctx[18](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let resultsTotal;
    	let input; // Input field
    	let results; // Input field
    	let resultsMembers = []; // Filtered items
    	let resultsEvents = []; // Filtered items
    	let resultsProjects = []; // Filtered items
    	let fuseMembers; // Fuse instance
    	let fuseEvents; // Fuse instance
    	let fuseProjects; // Fuse instance
    	let hasTerm = false;
    	let isOpen = false;
    	let tabIndex = 0;

    	function handleInput() {
    		const term = trim_1(input.value);
    		$$invalidate(1, hasTerm = Boolean(term.length));

    		if (hasTerm && fuseMembers && fuseEvents && fuseEvents) {
    			$$invalidate(12, resultsMembers = fuseMembers.search(term).map(d => d.item));
    			$$invalidate(13, resultsEvents = fuseEvents.search(term).map(d => d.item));
    			$$invalidate(14, resultsProjects = fuseProjects.search(term).map(d => d.item));
    			disableBodyScroll(results);
    		} else {
    			$$invalidate(12, resultsMembers = []);
    			$$invalidate(13, resultsEvents = []);
    			$$invalidate(14, resultsProjects = []);
    			enableBodyScroll(results);
    		}
    	}

    	onMount(async () => {
    		fetch('/content.json').then(res => res.json()).then(data => {
    			const { members, events, projects } = data;

    			fuseMembers = new Fuse(members,
    			{
    					threshold: 0.4,
    					keys: [{ name: 'name', weight: 2 }, 'role', 'slug']
    				});

    			fuseEvents = new Fuse(events,
    			{
    					threshold: 0.4,
    					keys: [
    						{ name: 'title', weight: 2 },
    						{ name: 'intro', weight: 1.5 },
    						'description',
    						'members',
    						'slug'
    					]
    				});

    			fuseProjects = new Fuse(projects,
    			{
    					threshold: 0.4,
    					keys: [
    						{ name: 'title', weight: 2 },
    						{ name: 'intro', weight: 1.5 },
    						'description',
    						'members',
    						'slug'
    					]
    				});
    		});
    	});

    	function closeSearch() {
    		input.blur();
    		$$invalidate(0, input.value = '', input);
    		handleInput();
    		$$invalidate(2, isOpen = false);
    	}

    	function handleKeyDown(event) {
    		const { key, target } = event;

    		if (key === 'Escape') {
    			closeSearch();
    		}
    	}

    	function handleKeyDownInput(event) {
    		// console.log({ event })
    		const { key, target, keyCode } = event;

    		if (trim_1(input.value)) {
    			if (keyCode === 40) {
    				document.getElementById(`result-index-${tabIndex}`).focus();
    			} // event.preventDefault();
    		} else {
    			if (key === 'Tab') {
    				closeSearch();
    			}
    		}
    	}

    	function handleKeyDownResult(event) {
    		const { keyCode } = event;

    		if (keyCode === 40 || keyCode === 38) {
    			// event.preventDefault();
    			if (keyCode === 40) {
    				document.getElementById(`result-index-${tabIndex + 1}`).focus();
    			} else {
    				if (tabIndex === 0) {
    					input.focus();
    				} else {
    					document.getElementById(`result-index-${tabIndex - 1}`).focus();
    				}
    			}
    		}
    	}

    	function handleTriggerClick() {
    		if (isOpen) {
    			closeSearch();
    		} else {
    			input.focus();
    			$$invalidate(2, isOpen = true);
    		}
    	}

    	function handleBlur(e) {
    		setTimeout(
    			() => {
    				if (document.activeElement.id !== 'search-trigger' && !hasTerm) {
    					$$invalidate(2, isOpen = false);
    				}
    			},
    			0
    		);
    	}

    	function input_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			input = $$value;
    			$$invalidate(0, input);
    		});
    	}

    	const blur_handler = () => $$invalidate(3, tabIndex = 0);
    	const focus_handler = (index, i) => $$invalidate(3, tabIndex = index + i);

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			results = $$value;
    			$$invalidate(5, results);
    		});
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*resultsMembers, resultsEvents, resultsProjects*/ 28672) {
    			resultsMembers.length + resultsEvents.length + resultsProjects.length;
    		}

    		if ($$self.$$.dirty[0] & /*resultsProjects, resultsEvents, resultsMembers*/ 28672) {
    			$$invalidate(4, resultsTotal = [
    				['project', resultsProjects, 'Projects', 'title', 'intro', 0],
    				[
    					'event',
    					resultsEvents,
    					'Events',
    					'title',
    					'intro',
    					resultsProjects.length
    				],
    				[
    					'member',
    					resultsMembers,
    					'Members',
    					'name',
    					'role',
    					resultsProjects.length + resultsEvents.length
    				]
    			]);
    		}
    	};

    	return [
    		input,
    		hasTerm,
    		isOpen,
    		tabIndex,
    		resultsTotal,
    		results,
    		handleInput,
    		handleKeyDown,
    		handleKeyDownInput,
    		handleKeyDownResult,
    		handleTriggerClick,
    		handleBlur,
    		resultsMembers,
    		resultsEvents,
    		resultsProjects,
    		input_1_binding,
    		blur_handler,
    		focus_handler,
    		div1_binding
    	];
    }

    class Search extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);
    	}
    }

    const targetSearch = document.getElementById('page-search');
    if (targetSearch) new Search({ target: targetSearch });

}());
//# sourceMappingURL=svelte.js.map
