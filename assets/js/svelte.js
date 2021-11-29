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

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || from);
    }

    /** @ignore */
    var ENTRIES = 'ENTRIES';
    /** @ignore */
    var KEYS = 'KEYS';
    /** @ignore */
    var VALUES = 'VALUES';
    /** @ignore */
    var LEAF = '';
    /**
     * @private
     */
    var TreeIterator = /** @class */ (function () {
        function TreeIterator(set, type) {
            var node = set._tree;
            var keys = Object.keys(node);
            this.set = set;
            this._type = type;
            this._path = keys.length > 0 ? [{ node: node, keys: keys }] : [];
        }
        TreeIterator.prototype.next = function () {
            var value = this.dive();
            this.backtrack();
            return value;
        };
        TreeIterator.prototype.dive = function () {
            if (this._path.length === 0) {
                return { done: true, value: undefined };
            }
            var _a = last$1(this._path), node = _a.node, keys = _a.keys;
            if (last$1(keys) === LEAF) {
                return { done: false, value: this.result() };
            }
            this._path.push({ node: node[last$1(keys)], keys: Object.keys(node[last$1(keys)]) });
            return this.dive();
        };
        TreeIterator.prototype.backtrack = function () {
            if (this._path.length === 0) {
                return;
            }
            last$1(this._path).keys.pop();
            if (last$1(this._path).keys.length > 0) {
                return;
            }
            this._path.pop();
            this.backtrack();
        };
        TreeIterator.prototype.key = function () {
            return this.set._prefix + this._path
                .map(function (_a) {
                var keys = _a.keys;
                return last$1(keys);
            })
                .filter(function (key) { return key !== LEAF; })
                .join('');
        };
        TreeIterator.prototype.value = function () {
            return last$1(this._path).node[LEAF];
        };
        TreeIterator.prototype.result = function () {
            if (this._type === VALUES) {
                return this.value();
            }
            if (this._type === KEYS) {
                return this.key();
            }
            return [this.key(), this.value()];
        };
        TreeIterator.prototype[Symbol.iterator] = function () {
            return this;
        };
        return TreeIterator;
    }());
    var last$1 = function (array) {
        return array[array.length - 1];
    };

    var NONE = 0;
    var CHANGE = 1;
    var ADD = 2;
    var DELETE = 3;
    /**
     * @ignore
     */
    var fuzzySearch = function (node, query, maxDistance) {
        var stack = [{ distance: 0, i: 0, key: '', node: node }];
        var results = {};
        var innerStack = [];
        var _loop_1 = function () {
            var _a = stack.pop(), node_1 = _a.node, distance = _a.distance, key = _a.key, i = _a.i, edit = _a.edit;
            Object.keys(node_1).forEach(function (k) {
                if (k === LEAF) {
                    var totDistance = distance + (query.length - i);
                    var _a = __read(results[key] || [null, Infinity], 2), d = _a[1];
                    if (totDistance <= maxDistance && totDistance < d) {
                        results[key] = [node_1[k], totDistance];
                    }
                }
                else {
                    withinDistance(query, k, maxDistance - distance, i, edit, innerStack).forEach(function (_a) {
                        var d = _a.distance, i = _a.i, edit = _a.edit;
                        stack.push({ node: node_1[k], distance: distance + d, key: key + k, i: i, edit: edit });
                    });
                }
            });
        };
        while (stack.length > 0) {
            _loop_1();
        }
        return results;
    };
    /**
     * @ignore
     */
    var withinDistance = function (a, b, maxDistance, i, edit, stack) {
        stack.push({ distance: 0, ia: i, ib: 0, edit: edit });
        var results = [];
        while (stack.length > 0) {
            var _a = stack.pop(), distance = _a.distance, ia = _a.ia, ib = _a.ib, edit_1 = _a.edit;
            if (ib === b.length) {
                results.push({ distance: distance, i: ia, edit: edit_1 });
                continue;
            }
            if (a[ia] === b[ib]) {
                stack.push({ distance: distance, ia: ia + 1, ib: ib + 1, edit: NONE });
            }
            else {
                if (distance >= maxDistance) {
                    continue;
                }
                if (edit_1 !== ADD) {
                    stack.push({ distance: distance + 1, ia: ia, ib: ib + 1, edit: DELETE });
                }
                if (ia < a.length) {
                    if (edit_1 !== DELETE) {
                        stack.push({ distance: distance + 1, ia: ia + 1, ib: ib, edit: ADD });
                    }
                    if (edit_1 !== DELETE && edit_1 !== ADD) {
                        stack.push({ distance: distance + 1, ia: ia + 1, ib: ib + 1, edit: CHANGE });
                    }
                }
            }
        }
        return results;
    };

    /**
     * A class implementing the same interface as a standard JavaScript
     * [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
     * with string keys, but adding support for efficiently searching entries with
     * prefix or fuzzy search. This class is used internally by [[MiniSearch]] as
     * the inverted index data structure. The implementation is a radix tree
     * (compressed prefix tree).
     *
     * Since this class can be of general utility beyond _MiniSearch_, it is
     * exported by the `minisearch` package and can be imported (or required) as
     * `minisearch/SearchableMap`.
     *
     * @typeParam T  The type of the values stored in the map.
     */
    var SearchableMap = /** @class */ (function () {
        /**
         * The constructor is normally called without arguments, creating an empty
         * map. In order to create a [[SearchableMap]] from an iterable or from an
         * object, check [[SearchableMap.from]] and [[SearchableMap.fromObject]].
         *
         * The constructor arguments are for internal use, when creating derived
         * mutable views of a map at a prefix.
         */
        function SearchableMap(tree, prefix) {
            if (tree === void 0) { tree = {}; }
            if (prefix === void 0) { prefix = ''; }
            this._tree = tree;
            this._prefix = prefix;
        }
        /**
         * Creates and returns a mutable view of this [[SearchableMap]], containing only
         * entries that share the given prefix.
         *
         * ### Usage:
         *
         * ```javascript
         * let map = new SearchableMap()
         * map.set("unicorn", 1)
         * map.set("universe", 2)
         * map.set("university", 3)
         * map.set("unique", 4)
         * map.set("hello", 5)
         *
         * let uni = map.atPrefix("uni")
         * uni.get("unique") // => 4
         * uni.get("unicorn") // => 1
         * uni.get("hello") // => undefined
         *
         * let univer = map.atPrefix("univer")
         * univer.get("unique") // => undefined
         * univer.get("universe") // => 2
         * univer.get("university") // => 3
         * ```
         *
         * @param prefix  The prefix
         * @return A [[SearchableMap]] representing a mutable view of the original Map at the given prefix
         */
        SearchableMap.prototype.atPrefix = function (prefix) {
            var _a;
            if (!prefix.startsWith(this._prefix)) {
                throw new Error('Mismatched prefix');
            }
            var _b = __read(trackDown(this._tree, prefix.slice(this._prefix.length)), 2), node = _b[0], path = _b[1];
            if (node === undefined) {
                var _c = __read(last(path), 2), parentNode = _c[0], key_1 = _c[1];
                var nodeKey = Object.keys(parentNode).find(function (k) { return k !== LEAF && k.startsWith(key_1); });
                if (nodeKey !== undefined) {
                    return new SearchableMap((_a = {}, _a[nodeKey.slice(key_1.length)] = parentNode[nodeKey], _a), prefix);
                }
            }
            return new SearchableMap(node || {}, prefix);
        };
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/clear
         */
        SearchableMap.prototype.clear = function () {
            delete this._size;
            this._tree = {};
        };
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/delete
         * @param key  Key to delete
         */
        SearchableMap.prototype.delete = function (key) {
            delete this._size;
            return remove(this._tree, key);
        };
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/entries
         * @return An iterator iterating through `[key, value]` entries.
         */
        SearchableMap.prototype.entries = function () {
            return new TreeIterator(this, ENTRIES);
        };
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
         * @param fn  Iteration function
         */
        SearchableMap.prototype.forEach = function (fn) {
            var e_1, _a;
            try {
                for (var _b = __values(this), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), key = _d[0], value = _d[1];
                    fn(key, value, this);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        /**
         * Returns a key-value object of all the entries that have a key within the
         * given edit distance from the search key. The keys of the returned object are
         * the matching keys, while the values are two-elements arrays where the first
         * element is the value associated to the key, and the second is the edit
         * distance of the key to the search key.
         *
         * ### Usage:
         *
         * ```javascript
         * let map = new SearchableMap()
         * map.set('hello', 'world')
         * map.set('hell', 'yeah')
         * map.set('ciao', 'mondo')
         *
         * // Get all entries that match the key 'hallo' with a maximum edit distance of 2
         * map.fuzzyGet('hallo', 2)
         * // => { "hello": ["world", 1], "hell": ["yeah", 2] }
         *
         * // In the example, the "hello" key has value "world" and edit distance of 1
         * // (change "e" to "a"), the key "hell" has value "yeah" and edit distance of 2
         * // (change "e" to "a", delete "o")
         * ```
         *
         * @param key  The search key
         * @param maxEditDistance  The maximum edit distance (Levenshtein)
         * @return A key-value object of the matching keys to their value and edit distance
         */
        SearchableMap.prototype.fuzzyGet = function (key, maxEditDistance) {
            return fuzzySearch(this._tree, key, maxEditDistance);
        };
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/get
         * @param key  Key to get
         * @return Value associated to the key, or `undefined` if the key is not
         * found.
         */
        SearchableMap.prototype.get = function (key) {
            var node = lookup(this._tree, key);
            return node !== undefined ? node[LEAF] : undefined;
        };
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/has
         * @param key  Key
         * @return True if the key is in the map, false otherwise
         */
        SearchableMap.prototype.has = function (key) {
            var node = lookup(this._tree, key);
            return node !== undefined && node.hasOwnProperty(LEAF);
        };
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/keys
         * @return An `Iterable` iterating through keys
         */
        SearchableMap.prototype.keys = function () {
            return new TreeIterator(this, KEYS);
        };
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/set
         * @param key  Key to set
         * @param value  Value to associate to the key
         * @return The [[SearchableMap]] itself, to allow chaining
         */
        SearchableMap.prototype.set = function (key, value) {
            if (typeof key !== 'string') {
                throw new Error('key must be a string');
            }
            delete this._size;
            var node = createPath(this._tree, key);
            node[LEAF] = value;
            return this;
        };
        Object.defineProperty(SearchableMap.prototype, "size", {
            /**
             * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/size
             */
            get: function () {
                var _this = this;
                if (this._size) {
                    return this._size;
                }
                /** @ignore */
                this._size = 0;
                this.forEach(function () { _this._size += 1; });
                return this._size;
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Updates the value at the given key using the provided function. The function
         * is called with the current value at the key, and its return value is used as
         * the new value to be set.
         *
         * ### Example:
         *
         * ```javascript
         * // Increment the current value by one
         * searchableMap.update('somekey', (currentValue) => currentValue == null ? 0 : currentValue + 1)
         * ```
         *
         * @param key  The key to update
         * @param fn  The function used to compute the new value from the current one
         * @return The [[SearchableMap]] itself, to allow chaining
         */
        SearchableMap.prototype.update = function (key, fn) {
            if (typeof key !== 'string') {
                throw new Error('key must be a string');
            }
            delete this._size;
            var node = createPath(this._tree, key);
            node[LEAF] = fn(node[LEAF]);
            return this;
        };
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/values
         * @return An `Iterable` iterating through values.
         */
        SearchableMap.prototype.values = function () {
            return new TreeIterator(this, VALUES);
        };
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
         */
        SearchableMap.prototype[Symbol.iterator] = function () {
            return this.entries();
        };
        /**
         * Creates a [[SearchableMap]] from an `Iterable` of entries
         *
         * @param entries  Entries to be inserted in the [[SearchableMap]]
         * @return A new [[SearchableMap]] with the given entries
         */
        SearchableMap.from = function (entries) {
            var e_2, _a;
            var tree = new SearchableMap();
            try {
                for (var entries_1 = __values(entries), entries_1_1 = entries_1.next(); !entries_1_1.done; entries_1_1 = entries_1.next()) {
                    var _b = __read(entries_1_1.value, 2), key = _b[0], value = _b[1];
                    tree.set(key, value);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (entries_1_1 && !entries_1_1.done && (_a = entries_1.return)) _a.call(entries_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return tree;
        };
        /**
         * Creates a [[SearchableMap]] from the iterable properties of a JavaScript object
         *
         * @param object  Object of entries for the [[SearchableMap]]
         * @return A new [[SearchableMap]] with the given entries
         */
        SearchableMap.fromObject = function (object) {
            return SearchableMap.from(Object.entries(object));
        };
        return SearchableMap;
    }());
    var trackDown = function (tree, key, path) {
        if (path === void 0) { path = []; }
        if (key.length === 0 || tree == null) {
            return [tree, path];
        }
        var nodeKey = Object.keys(tree).find(function (k) { return k !== LEAF && key.startsWith(k); });
        if (nodeKey === undefined) {
            path.push([tree, key]); // performance: update in place
            return trackDown(undefined, '', path);
        }
        path.push([tree, nodeKey]); // performance: update in place
        return trackDown(tree[nodeKey], key.slice(nodeKey.length), path);
    };
    var lookup = function (tree, key) {
        if (key.length === 0 || tree == null) {
            return tree;
        }
        var nodeKey = Object.keys(tree).find(function (k) { return k !== LEAF && key.startsWith(k); });
        if (nodeKey === undefined) {
            return undefined;
        }
        return lookup(tree[nodeKey], key.slice(nodeKey.length));
    };
    var createPath = function (tree, key) {
        var _a;
        if (key.length === 0 || tree == null) {
            return tree;
        }
        var nodeKey = Object.keys(tree).find(function (k) { return k !== LEAF && key.startsWith(k); });
        if (nodeKey === undefined) {
            var toSplit = Object.keys(tree).find(function (k) { return k !== LEAF && k.startsWith(key[0]); });
            if (toSplit === undefined) {
                tree[key] = {};
            }
            else {
                var prefix = commonPrefix(key, toSplit);
                tree[prefix] = (_a = {}, _a[toSplit.slice(prefix.length)] = tree[toSplit], _a);
                delete tree[toSplit];
                return createPath(tree[prefix], key.slice(prefix.length));
            }
            return tree[key];
        }
        return createPath(tree[nodeKey], key.slice(nodeKey.length));
    };
    var commonPrefix = function (a, b, i, length, prefix) {
        if (i === void 0) { i = 0; }
        if (length === void 0) { length = Math.min(a.length, b.length); }
        if (prefix === void 0) { prefix = ''; }
        if (i >= length) {
            return prefix;
        }
        if (a[i] !== b[i]) {
            return prefix;
        }
        return commonPrefix(a, b, i + 1, length, prefix + a[i]);
    };
    var remove = function (tree, key) {
        var _a = __read(trackDown(tree, key), 2), node = _a[0], path = _a[1];
        if (node === undefined) {
            return;
        }
        delete node[LEAF];
        var keys = Object.keys(node);
        if (keys.length === 0) {
            cleanup(path);
        }
        if (keys.length === 1) {
            merge(path, keys[0], node[keys[0]]);
        }
    };
    var cleanup = function (path) {
        if (path.length === 0) {
            return;
        }
        var _a = __read(last(path), 2), node = _a[0], key = _a[1];
        delete node[key];
        var keys = Object.keys(node);
        if (keys.length === 0) {
            cleanup(path.slice(0, -1));
        }
        if (keys.length === 1 && keys[0] !== LEAF) {
            merge(path.slice(0, -1), keys[0], node[keys[0]]);
        }
    };
    var merge = function (path, key, value) {
        if (path.length === 0) {
            return;
        }
        var _a = __read(last(path), 2), node = _a[0], nodeKey = _a[1];
        node[nodeKey + key] = value;
        delete node[nodeKey];
    };
    var last = function (array) {
        return array[array.length - 1];
    };

    var _a;
    var OR = 'or';
    var AND = 'and';
    /**
     * [[MiniSearch]] is the main entrypoint class, implementing a full-text search
     * engine in memory.
     *
     * @typeParam T  The type of the documents being indexed.
     *
     * ### Basic example:
     *
     * ```javascript
     * const documents = [
     *   {
     *     id: 1,
     *     title: 'Moby Dick',
     *     text: 'Call me Ishmael. Some years ago...',
     *     category: 'fiction'
     *   },
     *   {
     *     id: 2,
     *     title: 'Zen and the Art of Motorcycle Maintenance',
     *     text: 'I can see by my watch...',
     *     category: 'fiction'
     *   },
     *   {
     *     id: 3,
     *     title: 'Neuromancer',
     *     text: 'The sky above the port was...',
     *     category: 'fiction'
     *   },
     *   {
     *     id: 4,
     *     title: 'Zen and the Art of Archery',
     *     text: 'At first sight it must seem...',
     *     category: 'non-fiction'
     *   },
     *   // ...and more
     * ]
     *
     * // Create a search engine that indexes the 'title' and 'text' fields for
     * // full-text search. Search results will include 'title' and 'category' (plus the
     * // id field, that is always stored and returned)
     * const miniSearch = new MiniSearch({
     *   fields: ['title', 'text'],
     *   storeFields: ['title', 'category']
     * })
     *
     * // Add documents to the index
     * miniSearch.addAll(documents)
     *
     * // Search for documents:
     * let results = miniSearch.search('zen art motorcycle')
     * // => [
     * //   { id: 2, title: 'Zen and the Art of Motorcycle Maintenance', category: 'fiction', score: 2.77258 },
     * //   { id: 4, title: 'Zen and the Art of Archery', category: 'non-fiction', score: 1.38629 }
     * // ]
     * ```
     */
    var MiniSearch = /** @class */ (function () {
        /**
         * @param options  Configuration options
         *
         * ### Examples:
         *
         * ```javascript
         * // Create a search engine that indexes the 'title' and 'text' fields of your
         * // documents:
         * const miniSearch = new MiniSearch({ fields: ['title', 'text'] })
         * ```
         *
         * ### ID Field:
         *
         * ```javascript
         * // Your documents are assumed to include a unique 'id' field, but if you want
         * // to use a different field for document identification, you can set the
         * // 'idField' option:
         * const miniSearch = new MiniSearch({ idField: 'key', fields: ['title', 'text'] })
         * ```
         *
         * ### Options and defaults:
         *
         * ```javascript
         * // The full set of options (here with their default value) is:
         * const miniSearch = new MiniSearch({
         *   // idField: field that uniquely identifies a document
         *   idField: 'id',
         *
         *   // extractField: function used to get the value of a field in a document.
         *   // By default, it assumes the document is a flat object with field names as
         *   // property keys and field values as string property values, but custom logic
         *   // can be implemented by setting this option to a custom extractor function.
         *   extractField: (document, fieldName) => document[fieldName],
         *
         *   // tokenize: function used to split fields into individual terms. By
         *   // default, it is also used to tokenize search queries, unless a specific
         *   // `tokenize` search option is supplied. When tokenizing an indexed field,
         *   // the field name is passed as the second argument.
         *   tokenize: (string, _fieldName) => string.split(SPACE_OR_PUNCTUATION),
         *
         *   // processTerm: function used to process each tokenized term before
         *   // indexing. It can be used for stemming and normalization. Return a falsy
         *   // value in order to discard a term. By default, it is also used to process
         *   // search queries, unless a specific `processTerm` option is supplied as a
         *   // search option. When processing a term from a indexed field, the field
         *   // name is passed as the second argument.
         *   processTerm: (term, _fieldName) => term.toLowerCase(),
         *
         *   // searchOptions: default search options, see the `search` method for
         *   // details
         *   searchOptions: undefined,
         *
         *   // fields: document fields to be indexed. Mandatory, but not set by default
         *   fields: undefined
         *
         *   // storeFields: document fields to be stored and returned as part of the
         *   // search results.
         *   storeFields: []
         * })
         * ```
         */
        function MiniSearch(options) {
            if ((options === null || options === void 0 ? void 0 : options.fields) == null) {
                throw new Error('MiniSearch: option "fields" must be provided');
            }
            this._options = __assign(__assign(__assign({}, defaultOptions), options), { searchOptions: __assign(__assign({}, defaultSearchOptions), (options.searchOptions || {})) });
            this._index = new SearchableMap();
            this._documentCount = 0;
            this._documentIds = {};
            this._fieldIds = {};
            this._fieldLength = {};
            this._averageFieldLength = {};
            this._nextId = 0;
            this._storedFields = {};
            this.addFields(this._options.fields);
        }
        /**
         * Adds a document to the index
         *
         * @param document  The document to be indexed
         */
        MiniSearch.prototype.add = function (document) {
            var _this = this;
            var _a = this._options, extractField = _a.extractField, tokenize = _a.tokenize, processTerm = _a.processTerm, fields = _a.fields, idField = _a.idField;
            var id = extractField(document, idField);
            if (id == null) {
                throw new Error("MiniSearch: document does not have ID field \"" + idField + "\"");
            }
            var shortDocumentId = this.addDocumentId(id);
            this.saveStoredFields(shortDocumentId, document);
            fields.forEach(function (field) {
                var fieldValue = extractField(document, field);
                if (fieldValue == null) {
                    return;
                }
                var tokens = tokenize(fieldValue.toString(), field);
                _this.addFieldLength(shortDocumentId, _this._fieldIds[field], _this.documentCount - 1, tokens.length);
                tokens.forEach(function (term) {
                    var processedTerm = processTerm(term, field);
                    if (processedTerm) {
                        _this.addTerm(_this._fieldIds[field], shortDocumentId, processedTerm);
                    }
                });
            });
        };
        /**
         * Adds all the given documents to the index
         *
         * @param documents  An array of documents to be indexed
         */
        MiniSearch.prototype.addAll = function (documents) {
            var _this = this;
            documents.forEach(function (document) { return _this.add(document); });
        };
        /**
         * Adds all the given documents to the index asynchronously.
         *
         * Returns a promise that resolves (to `undefined`) when the indexing is done.
         * This method is useful when index many documents, to avoid blocking the main
         * thread. The indexing is performed asynchronously and in chunks.
         *
         * @param documents  An array of documents to be indexed
         * @param options  Configuration options
         * @return A promise resolving to `undefined` when the indexing is done
         */
        MiniSearch.prototype.addAllAsync = function (documents, options) {
            var _this = this;
            if (options === void 0) { options = {}; }
            var _a = options.chunkSize, chunkSize = _a === void 0 ? 10 : _a;
            var acc = { chunk: [], promise: Promise.resolve() };
            var _b = documents.reduce(function (_a, document, i) {
                var chunk = _a.chunk, promise = _a.promise;
                chunk.push(document);
                if ((i + 1) % chunkSize === 0) {
                    return {
                        chunk: [],
                        promise: promise
                            .then(function () { return new Promise(function (resolve) { return setTimeout(resolve, 0); }); })
                            .then(function () { return _this.addAll(chunk); })
                    };
                }
                else {
                    return { chunk: chunk, promise: promise };
                }
            }, acc), chunk = _b.chunk, promise = _b.promise;
            return promise.then(function () { return _this.addAll(chunk); });
        };
        /**
         * Removes the given document from the index.
         *
         * The document to delete must NOT have changed between indexing and deletion,
         * otherwise the index will be corrupted. Therefore, when reindexing a document
         * after a change, the correct order of operations is:
         *
         *   1. remove old version
         *   2. apply changes
         *   3. index new version
         *
         * @param document  The document to be removed
         */
        MiniSearch.prototype.remove = function (document) {
            var _this = this;
            var _a = this._options, tokenize = _a.tokenize, processTerm = _a.processTerm, extractField = _a.extractField, fields = _a.fields, idField = _a.idField;
            var id = extractField(document, idField);
            if (id == null) {
                throw new Error("MiniSearch: document does not have ID field \"" + idField + "\"");
            }
            var _b = __read(Object.entries(this._documentIds)
                .find(function (_a) {
                var _b = __read(_a, 2); _b[0]; var longId = _b[1];
                return id === longId;
            }) || [], 1), shortDocumentId = _b[0];
            if (shortDocumentId == null) {
                throw new Error("MiniSearch: cannot remove document with ID " + id + ": it is not in the index");
            }
            fields.forEach(function (field) {
                var fieldValue = extractField(document, field);
                if (fieldValue == null) {
                    return;
                }
                var tokens = tokenize(fieldValue.toString(), field);
                tokens.forEach(function (term) {
                    var processedTerm = processTerm(term, field);
                    if (processedTerm) {
                        _this.removeTerm(_this._fieldIds[field], shortDocumentId, processedTerm);
                    }
                });
                _this.removeFieldLength(shortDocumentId, _this._fieldIds[field], _this.documentCount, tokens.length);
            });
            delete this._storedFields[shortDocumentId];
            delete this._documentIds[shortDocumentId];
            delete this._fieldLength[shortDocumentId];
            this._documentCount -= 1;
        };
        /**
         * Removes all the given documents from the index. If called with no arguments,
         * it removes _all_ documents from the index.
         *
         * @param documents  The documents to be removed. If this argument is omitted,
         * all documents are removed. Note that, for removing all documents, it is
         * more efficient to call this method with no arguments than to pass all
         * documents.
         */
        MiniSearch.prototype.removeAll = function (documents) {
            var _this = this;
            if (documents) {
                documents.forEach(function (document) { return _this.remove(document); });
            }
            else if (arguments.length > 0) {
                throw new Error('Expected documents to be present. Omit the argument to remove all documents.');
            }
            else {
                this._index = new SearchableMap();
                this._documentCount = 0;
                this._documentIds = {};
                this._fieldLength = {};
                this._averageFieldLength = {};
                this._storedFields = {};
                this._nextId = 0;
            }
        };
        /**
         * Search for documents matching the given search query.
         *
         * The result is a list of scored document IDs matching the query, sorted by
         * descending score, and each including data about which terms were matched and
         * in which fields.
         *
         * ### Basic usage:
         *
         * ```javascript
         * // Search for "zen art motorcycle" with default options: terms have to match
         * // exactly, and individual terms are joined with OR
         * miniSearch.search('zen art motorcycle')
         * // => [ { id: 2, score: 2.77258, match: { ... } }, { id: 4, score: 1.38629, match: { ... } } ]
         * ```
         *
         * ### Restrict search to specific fields:
         *
         * ```javascript
         * // Search only in the 'title' field
         * miniSearch.search('zen', { fields: ['title'] })
         * ```
         *
         * ### Field boosting:
         *
         * ```javascript
         * // Boost a field
         * miniSearch.search('zen', { boost: { title: 2 } })
         * ```
         *
         * ### Prefix search:
         *
         * ```javascript
         * // Search for "moto" with prefix search (it will match documents
         * // containing terms that start with "moto" or "neuro")
         * miniSearch.search('moto neuro', { prefix: true })
         * ```
         *
         * ### Fuzzy search:
         *
         * ```javascript
         * // Search for "ismael" with fuzzy search (it will match documents containing
         * // terms similar to "ismael", with a maximum edit distance of 0.2 term.length
         * // (rounded to nearest integer)
         * miniSearch.search('ismael', { fuzzy: 0.2 })
         * ```
         *
         * ### Combining strategies:
         *
         * ```javascript
         * // Mix of exact match, prefix search, and fuzzy search
         * miniSearch.search('ismael mob', {
         *  prefix: true,
         *  fuzzy: 0.2
         * })
         * ```
         *
         * ### Advanced prefix and fuzzy search:
         *
         * ```javascript
         * // Perform fuzzy and prefix search depending on the search term. Here
         * // performing prefix and fuzzy search only on terms longer than 3 characters
         * miniSearch.search('ismael mob', {
         *  prefix: term => term.length > 3
         *  fuzzy: term => term.length > 3 ? 0.2 : null
         * })
         * ```
         *
         * ### Combine with AND:
         *
         * ```javascript
         * // Combine search terms with AND (to match only documents that contain both
         * // "motorcycle" and "art")
         * miniSearch.search('motorcycle art', { combineWith: 'AND' })
         * ```
         *
         * ### Filtering results:
         *
         * ```javascript
         * // Filter only results in the 'fiction' category (assuming that 'category'
         * // is a stored field)
         * miniSearch.search('motorcycle art', {
         *   filter: (result) => result.category === 'fiction'
         * })
         * ```
         *
         * ### Advanced combination of queries:
         *
         * It is possible to combine different subqueries with OR and AND, and even
         * with different search options, by passing a query expression tree object as
         * the first argument, instead of a string.
         *
         * ```javascript
         * // Search for documents that contain "zen" AND ("motorcycle" OR "archery")
         * miniSearch.search({
         *   combineWith: 'AND',
         *   queries: [
         *     'zen',
         *     {
         *       combineWith: 'OR',
         *       queries: ['motorcycle', 'archery']
         *     }
         *   ]
         * })
         * ```
         *
         * Each node in the expression tree can be either a string, or an object that
         * supports all `SearchOptions` fields, plus a `queries` array field for
         * subqueries.
         *
         * Note that, while this can become complicated to do by hand for complex or
         * deeply nested queries, it provides a formalized expression tree API for
         * external libraries that implement a parser for custom query languages.
         *
         * @param query  Search query
         * @param options  Search options. Each option, if not given, defaults to the corresponding value of `searchOptions` given to the constructor, or to the library default.
         */
        MiniSearch.prototype.search = function (query, searchOptions) {
            var _this = this;
            if (searchOptions === void 0) { searchOptions = {}; }
            var combinedResults = this.executeQuery(query, searchOptions);
            return Object.entries(combinedResults)
                .reduce(function (results, _a) {
                var _b = __read(_a, 2), docId = _b[0], _c = _b[1], score = _c.score, match = _c.match, terms = _c.terms;
                var result = {
                    id: _this._documentIds[docId],
                    terms: uniq(terms),
                    score: score,
                    match: match
                };
                Object.assign(result, _this._storedFields[docId]);
                if (searchOptions.filter == null || searchOptions.filter(result)) {
                    results.push(result);
                }
                return results;
            }, [])
                .sort(function (_a, _b) {
                var a = _a.score;
                var b = _b.score;
                return a < b ? 1 : -1;
            });
        };
        /**
         * Provide suggestions for the given search query
         *
         * The result is a list of suggested modified search queries, derived from the
         * given search query, each with a relevance score, sorted by descending score.
         *
         * ### Basic usage:
         *
         * ```javascript
         * // Get suggestions for 'neuro':
         * miniSearch.autoSuggest('neuro')
         * // => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 0.46240 } ]
         * ```
         *
         * ### Multiple words:
         *
         * ```javascript
         * // Get suggestions for 'zen ar':
         * miniSearch.autoSuggest('zen ar')
         * // => [
         * //  { suggestion: 'zen archery art', terms: [ 'zen', 'archery', 'art' ], score: 1.73332 },
         * //  { suggestion: 'zen art', terms: [ 'zen', 'art' ], score: 1.21313 }
         * // ]
         * ```
         *
         * ### Fuzzy suggestions:
         *
         * ```javascript
         * // Correct spelling mistakes using fuzzy search:
         * miniSearch.autoSuggest('neromancer', { fuzzy: 0.2 })
         * // => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 1.03998 } ]
         * ```
         *
         * ### Filtering:
         *
         * ```javascript
         * // Get suggestions for 'zen ar', but only within the 'fiction' category
         * // (assuming that 'category' is a stored field):
         * miniSearch.autoSuggest('zen ar', {
         *   filter: (result) => result.category === 'fiction'
         * })
         * // => [
         * //  { suggestion: 'zen archery art', terms: [ 'zen', 'archery', 'art' ], score: 1.73332 },
         * //  { suggestion: 'zen art', terms: [ 'zen', 'art' ], score: 1.21313 }
         * // ]
         * ```
         *
         * @param queryString  Query string to be expanded into suggestions
         * @param options  Search options. The supported options and default values
         * are the same as for the `search` method, except that by default prefix
         * search is performed on the last term in the query.
         * @return  A sorted array of suggestions sorted by relevance score.
         */
        MiniSearch.prototype.autoSuggest = function (queryString, options) {
            if (options === void 0) { options = {}; }
            options = __assign(__assign({}, defaultAutoSuggestOptions), options);
            var suggestions = this.search(queryString, options).reduce(function (suggestions, _a) {
                var score = _a.score, terms = _a.terms;
                var phrase = terms.join(' ');
                if (suggestions[phrase] == null) {
                    suggestions[phrase] = { score: score, terms: terms, count: 1 };
                }
                else {
                    suggestions[phrase].score += score;
                    suggestions[phrase].count += 1;
                }
                return suggestions;
            }, {});
            return Object.entries(suggestions)
                .map(function (_a) {
                var _b = __read(_a, 2), suggestion = _b[0], _c = _b[1], score = _c.score, terms = _c.terms, count = _c.count;
                return ({ suggestion: suggestion, terms: terms, score: score / count });
            })
                .sort(function (_a, _b) {
                var a = _a.score;
                var b = _b.score;
                return a < b ? 1 : -1;
            });
        };
        Object.defineProperty(MiniSearch.prototype, "documentCount", {
            /**
             * Number of documents in the index
             */
            get: function () {
                return this._documentCount;
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Deserializes a JSON index (serialized with `miniSearch.toJSON()`) and
         * instantiates a MiniSearch instance. It should be given the same options
         * originally used when serializing the index.
         *
         * ### Usage:
         *
         * ```javascript
         * // If the index was serialized with:
         * let miniSearch = new MiniSearch({ fields: ['title', 'text'] })
         * miniSearch.addAll(documents)
         *
         * const json = JSON.stringify(miniSearch)
         * // It can later be deserialized like this:
         * miniSearch = MiniSearch.loadJSON(json, { fields: ['title', 'text'] })
         * ```
         *
         * @param json  JSON-serialized index
         * @param options  configuration options, same as the constructor
         * @return An instance of MiniSearch deserialized from the given JSON.
         */
        MiniSearch.loadJSON = function (json, options) {
            if (options == null) {
                throw new Error('MiniSearch: loadJSON should be given the same options used when serializing the index');
            }
            return MiniSearch.loadJS(JSON.parse(json), options);
        };
        /**
         * Returns the default value of an option. It will throw an error if no option
         * with the given name exists.
         *
         * @param optionName  Name of the option
         * @return The default value of the given option
         *
         * ### Usage:
         *
         * ```javascript
         * // Get default tokenizer
         * MiniSearch.getDefault('tokenize')
         *
         * // Get default term processor
         * MiniSearch.getDefault('processTerm')
         *
         * // Unknown options will throw an error
         * MiniSearch.getDefault('notExisting')
         * // => throws 'MiniSearch: unknown option "notExisting"'
         * ```
         */
        MiniSearch.getDefault = function (optionName) {
            if (defaultOptions.hasOwnProperty(optionName)) {
                return getOwnProperty(defaultOptions, optionName);
            }
            else {
                throw new Error("MiniSearch: unknown option \"" + optionName + "\"");
            }
        };
        /**
         * @ignore
         */
        MiniSearch.loadJS = function (js, options) {
            var index = js.index, documentCount = js.documentCount, nextId = js.nextId, documentIds = js.documentIds, fieldIds = js.fieldIds, fieldLength = js.fieldLength, averageFieldLength = js.averageFieldLength, storedFields = js.storedFields;
            var miniSearch = new MiniSearch(options);
            miniSearch._index = new SearchableMap(index._tree, index._prefix);
            miniSearch._documentCount = documentCount;
            miniSearch._nextId = nextId;
            miniSearch._documentIds = documentIds;
            miniSearch._fieldIds = fieldIds;
            miniSearch._fieldLength = fieldLength;
            miniSearch._averageFieldLength = averageFieldLength;
            miniSearch._fieldIds = fieldIds;
            miniSearch._storedFields = storedFields || {};
            return miniSearch;
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.executeQuery = function (query, searchOptions) {
            var _this = this;
            if (searchOptions === void 0) { searchOptions = {}; }
            if (typeof query === 'string') {
                return this.executeSearch(query, searchOptions);
            }
            else {
                var results = query.queries.map(function (subquery) {
                    var options = __assign(__assign(__assign({}, searchOptions), query), { queries: undefined });
                    return _this.executeQuery(subquery, options);
                });
                return this.combineResults(results, query.combineWith);
            }
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.executeSearch = function (queryString, searchOptions) {
            var _this = this;
            if (searchOptions === void 0) { searchOptions = {}; }
            var _a = this._options, tokenize = _a.tokenize, processTerm = _a.processTerm, globalSearchOptions = _a.searchOptions;
            var options = __assign(__assign({ tokenize: tokenize, processTerm: processTerm }, globalSearchOptions), searchOptions);
            var searchTokenize = options.tokenize, searchProcessTerm = options.processTerm;
            var terms = searchTokenize(queryString)
                .map(function (term) { return searchProcessTerm(term); })
                .filter(function (term) { return !!term; });
            var queries = terms.map(termToQuerySpec(options));
            var results = queries.map(function (query) { return _this.executeQuerySpec(query, options); });
            return this.combineResults(results, options.combineWith);
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.executeQuerySpec = function (query, searchOptions) {
            var _this = this;
            var options = __assign(__assign({}, this._options.searchOptions), searchOptions);
            var boosts = (options.fields || this._options.fields).reduce(function (boosts, field) {
                var _a;
                return (__assign(__assign({}, boosts), (_a = {}, _a[field] = getOwnProperty(boosts, field) || 1, _a)));
            }, options.boost || {});
            var boostDocument = options.boostDocument, weights = options.weights;
            var _a = __assign(__assign({}, defaultSearchOptions.weights), weights), fuzzyWeight = _a.fuzzy, prefixWeight = _a.prefix;
            var exactMatch = this.termResults(query.term, boosts, boostDocument, this._index.get(query.term));
            if (!query.fuzzy && !query.prefix) {
                return exactMatch;
            }
            var results = [exactMatch];
            if (query.prefix) {
                this._index.atPrefix(query.term).forEach(function (term, data) {
                    var weightedDistance = (0.3 * (term.length - query.term.length)) / term.length;
                    results.push(_this.termResults(term, boosts, boostDocument, data, prefixWeight, weightedDistance));
                });
            }
            if (query.fuzzy) {
                var fuzzy = (query.fuzzy === true) ? 0.2 : query.fuzzy;
                var maxDistance = fuzzy < 1 ? Math.round(query.term.length * fuzzy) : fuzzy;
                Object.entries(this._index.fuzzyGet(query.term, maxDistance)).forEach(function (_a) {
                    var _b = __read(_a, 2), term = _b[0], _c = __read(_b[1], 2), data = _c[0], distance = _c[1];
                    var weightedDistance = distance / term.length;
                    results.push(_this.termResults(term, boosts, boostDocument, data, fuzzyWeight, weightedDistance));
                });
            }
            return results.reduce(combinators[OR], {});
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.combineResults = function (results, combineWith) {
            if (combineWith === void 0) { combineWith = OR; }
            if (results.length === 0) {
                return {};
            }
            var operator = combineWith.toLowerCase();
            return results.reduce(combinators[operator], null) || {};
        };
        /**
         * Allows serialization of the index to JSON, to possibly store it and later
         * deserialize it with `MiniSearch.loadJSON`.
         *
         * Normally one does not directly call this method, but rather call the
         * standard JavaScript `JSON.stringify()` passing the `MiniSearch` instance,
         * and JavaScript will internally call this method. Upon deserialization, one
         * must pass to `loadJSON` the same options used to create the original
         * instance that was serialized.
         *
         * ### Usage:
         *
         * ```javascript
         * // Serialize the index:
         * let miniSearch = new MiniSearch({ fields: ['title', 'text'] })
         * miniSearch.addAll(documents)
         * const json = JSON.stringify(miniSearch)
         *
         * // Later, to deserialize it:
         * miniSearch = MiniSearch.loadJSON(json, { fields: ['title', 'text'] })
         * ```
         *
         * @return A plain-object serializeable representation of the search index.
         */
        MiniSearch.prototype.toJSON = function () {
            return {
                index: this._index,
                documentCount: this._documentCount,
                nextId: this._nextId,
                documentIds: this._documentIds,
                fieldIds: this._fieldIds,
                fieldLength: this._fieldLength,
                averageFieldLength: this._averageFieldLength,
                storedFields: this._storedFields
            };
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.termResults = function (term, boosts, boostDocument, indexData, weight, editDistance) {
            var _this = this;
            if (editDistance === void 0) { editDistance = 0; }
            if (indexData == null) {
                return {};
            }
            return Object.entries(boosts).reduce(function (results, _a) {
                var _b = __read(_a, 2), field = _b[0], boost = _b[1];
                var fieldId = _this._fieldIds[field];
                var _c = indexData[fieldId] || { ds: {} }, df = _c.df, ds = _c.ds;
                Object.entries(ds).forEach(function (_a) {
                    var _b = __read(_a, 2), documentId = _b[0], tf = _b[1];
                    var docBoost = boostDocument ? boostDocument(_this._documentIds[documentId], term) : 1;
                    if (!docBoost) {
                        return;
                    }
                    var normalizedLength = _this._fieldLength[documentId][fieldId] / _this._averageFieldLength[fieldId];
                    results[documentId] = results[documentId] || { score: 0, match: {}, terms: [] };
                    results[documentId].terms.push(term);
                    results[documentId].match[term] = getOwnProperty(results[documentId].match, term) || [];
                    results[documentId].score += docBoost * score(tf, df, _this._documentCount, normalizedLength, boost, editDistance);
                    results[documentId].match[term].push(field);
                });
                return results;
            }, {});
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.addTerm = function (fieldId, documentId, term) {
            this._index.update(term, function (indexData) {
                var _a;
                indexData = indexData || {};
                var fieldIndex = indexData[fieldId] || { df: 0, ds: {} };
                if (fieldIndex.ds[documentId] == null) {
                    fieldIndex.df += 1;
                }
                fieldIndex.ds[documentId] = (fieldIndex.ds[documentId] || 0) + 1;
                return __assign(__assign({}, indexData), (_a = {}, _a[fieldId] = fieldIndex, _a));
            });
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.removeTerm = function (fieldId, documentId, term) {
            var _this = this;
            if (!this._index.has(term)) {
                this.warnDocumentChanged(documentId, fieldId, term);
                return;
            }
            this._index.update(term, function (indexData) {
                var _a;
                var fieldIndex = indexData[fieldId];
                if (fieldIndex == null || fieldIndex.ds[documentId] == null) {
                    _this.warnDocumentChanged(documentId, fieldId, term);
                    return indexData;
                }
                if (fieldIndex.ds[documentId] <= 1) {
                    if (fieldIndex.df <= 1) {
                        delete indexData[fieldId];
                        return indexData;
                    }
                    fieldIndex.df -= 1;
                }
                if (fieldIndex.ds[documentId] <= 1) {
                    delete fieldIndex.ds[documentId];
                    return indexData;
                }
                fieldIndex.ds[documentId] -= 1;
                return __assign(__assign({}, indexData), (_a = {}, _a[fieldId] = fieldIndex, _a));
            });
            if (Object.keys(this._index.get(term)).length === 0) {
                this._index.delete(term);
            }
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.warnDocumentChanged = function (shortDocumentId, fieldId, term) {
            if (console == null || console.warn == null) {
                return;
            }
            var fieldName = Object.entries(this._fieldIds).find(function (_a) {
                var _b = __read(_a, 2); _b[0]; var id = _b[1];
                return id === fieldId;
            })[0];
            console.warn("MiniSearch: document with ID " + this._documentIds[shortDocumentId] + " has changed before removal: term \"" + term + "\" was not present in field \"" + fieldName + "\". Removing a document after it has changed can corrupt the index!");
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.addDocumentId = function (documentId) {
            var shortDocumentId = this._nextId.toString(36);
            this._documentIds[shortDocumentId] = documentId;
            this._documentCount += 1;
            this._nextId += 1;
            return shortDocumentId;
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.addFields = function (fields) {
            var _this = this;
            fields.forEach(function (field, i) { _this._fieldIds[field] = i; });
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.addFieldLength = function (documentId, fieldId, count, length) {
            this._averageFieldLength[fieldId] = this._averageFieldLength[fieldId] || 0;
            var totalLength = (this._averageFieldLength[fieldId] * count) + length;
            this._fieldLength[documentId] = this._fieldLength[documentId] || {};
            this._fieldLength[documentId][fieldId] = length;
            this._averageFieldLength[fieldId] = totalLength / (count + 1);
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.removeFieldLength = function (documentId, fieldId, count, length) {
            var totalLength = (this._averageFieldLength[fieldId] * count) - length;
            this._averageFieldLength[fieldId] = totalLength / (count - 1);
        };
        /**
         * @ignore
         */
        MiniSearch.prototype.saveStoredFields = function (documentId, doc) {
            var _this = this;
            var _a = this._options, storeFields = _a.storeFields, extractField = _a.extractField;
            if (storeFields == null || storeFields.length === 0) {
                return;
            }
            this._storedFields[documentId] = this._storedFields[documentId] || {};
            storeFields.forEach(function (fieldName) {
                var fieldValue = extractField(doc, fieldName);
                if (fieldValue === undefined) {
                    return;
                }
                _this._storedFields[documentId][fieldName] = fieldValue;
            });
        };
        return MiniSearch;
    }());
    var getOwnProperty = function (object, property) {
        return Object.prototype.hasOwnProperty.call(object, property) ? object[property] : undefined;
    };
    var combinators = (_a = {},
        _a[OR] = function (a, b) {
            return Object.entries(b).reduce(function (combined, _a) {
                var _b;
                var _c = __read(_a, 2), documentId = _c[0], _d = _c[1], score = _d.score, match = _d.match, terms = _d.terms;
                if (combined[documentId] == null) {
                    combined[documentId] = { score: score, match: match, terms: terms };
                }
                else {
                    combined[documentId].score += score;
                    combined[documentId].score *= 1.5;
                    (_b = combined[documentId].terms).push.apply(_b, __spreadArray([], __read(terms)));
                    Object.assign(combined[documentId].match, match);
                }
                return combined;
            }, a || {});
        },
        _a[AND] = function (a, b) {
            if (a == null) {
                return b;
            }
            return Object.entries(b).reduce(function (combined, _a) {
                var _b = __read(_a, 2), documentId = _b[0], _c = _b[1], score = _c.score, match = _c.match, terms = _c.terms;
                if (a[documentId] === undefined) {
                    return combined;
                }
                combined[documentId] = combined[documentId] || {};
                combined[documentId].score = a[documentId].score + score;
                combined[documentId].match = __assign(__assign({}, a[documentId].match), match);
                combined[documentId].terms = __spreadArray(__spreadArray([], __read(a[documentId].terms)), __read(terms));
                return combined;
            }, {});
        },
        _a);
    var tfIdf = function (tf, df, n) { return tf * Math.log(n / df); };
    var score = function (termFrequency, documentFrequency, documentCount, normalizedLength, boost, editDistance) {
        var weight = boost / (1 + (0.333 * boost * editDistance));
        return weight * tfIdf(termFrequency, documentFrequency, documentCount) / normalizedLength;
    };
    var termToQuerySpec = function (options) { return function (term, i, terms) {
        var fuzzy = (typeof options.fuzzy === 'function')
            ? options.fuzzy(term, i, terms)
            : (options.fuzzy || false);
        var prefix = (typeof options.prefix === 'function')
            ? options.prefix(term, i, terms)
            : (options.prefix === true);
        return { term: term, fuzzy: fuzzy, prefix: prefix };
    }; };
    var uniq = function (array) {
        return array.filter(function (element, i, array) { return array.indexOf(element) === i; });
    };
    var defaultOptions = {
        idField: 'id',
        extractField: function (document, fieldName) { return document[fieldName]; },
        tokenize: function (text, fieldName) { return text.split(SPACE_OR_PUNCTUATION); },
        processTerm: function (term, fieldName) { return term.toLowerCase(); },
        fields: undefined,
        searchOptions: undefined,
        storeFields: []
    };
    var defaultSearchOptions = {
        combineWith: OR,
        prefix: false,
        fuzzy: false,
        boost: {},
        weights: { fuzzy: 0.9, prefix: 0.75 }
    };
    var defaultAutoSuggestOptions = {
        prefix: function (term, i, terms) {
            return i === terms.length - 1;
        }
    };
    // This regular expression matches any Unicode space or punctuation character
    // Adapted from https://unicode.org/cldr/utility/list-unicodeset.jsp?a=%5Cp%7BZ%7D%5Cp%7BP%7D&abb=on&c=on&esc=on
    var SPACE_OR_PUNCTUATION = /[\n\r -#%-*,-/:;?@[-\]_{}\u00A0\u00A1\u00A7\u00AB\u00B6\u00B7\u00BB\u00BF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u1680\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2000-\u200A\u2010-\u2029\u202F-\u2043\u2045-\u2051\u2053-\u205F\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u3000-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]+/u;

    var MiniSearch$1 = MiniSearch;

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

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    /** Detect free variable `global` from Node.js. */
    var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

    var _freeGlobal = freeGlobal;

    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

    /** Used as a reference to the global object. */
    var root = _freeGlobal || freeSelf || Function('return this')();

    var _root = root;

    /** Built-in value references. */
    var Symbol$1 = _root.Symbol;

    var _Symbol = Symbol$1;

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
    var INFINITY$3 = 1 / 0;

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
      return (result == '0' && (1 / value) == -INFINITY$3) ? '-0' : result;
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
    var rsAstralRange$2 = '\\ud800-\\udfff',
        rsComboMarksRange$2 = '\\u0300-\\u036f',
        reComboHalfMarksRange$2 = '\\ufe20-\\ufe2f',
        rsComboSymbolsRange$2 = '\\u20d0-\\u20ff',
        rsComboRange$2 = rsComboMarksRange$2 + reComboHalfMarksRange$2 + rsComboSymbolsRange$2,
        rsVarRange$2 = '\\ufe0e\\ufe0f';

    /** Used to compose unicode capture groups. */
    var rsZWJ$2 = '\\u200d';

    /** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
    var reHasUnicode = RegExp('[' + rsZWJ$2 + rsAstralRange$2  + rsComboRange$2 + rsVarRange$2 + ']');

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
    var rsAstralRange$1 = '\\ud800-\\udfff',
        rsComboMarksRange$1 = '\\u0300-\\u036f',
        reComboHalfMarksRange$1 = '\\ufe20-\\ufe2f',
        rsComboSymbolsRange$1 = '\\u20d0-\\u20ff',
        rsComboRange$1 = rsComboMarksRange$1 + reComboHalfMarksRange$1 + rsComboSymbolsRange$1,
        rsVarRange$1 = '\\ufe0e\\ufe0f';

    /** Used to compose unicode capture groups. */
    var rsAstral$1 = '[' + rsAstralRange$1 + ']',
        rsCombo$1 = '[' + rsComboRange$1 + ']',
        rsFitz$1 = '\\ud83c[\\udffb-\\udfff]',
        rsModifier$1 = '(?:' + rsCombo$1 + '|' + rsFitz$1 + ')',
        rsNonAstral$1 = '[^' + rsAstralRange$1 + ']',
        rsRegional$1 = '(?:\\ud83c[\\udde6-\\uddff]){2}',
        rsSurrPair$1 = '[\\ud800-\\udbff][\\udc00-\\udfff]',
        rsZWJ$1 = '\\u200d';

    /** Used to compose unicode regexes. */
    var reOptMod$1 = rsModifier$1 + '?',
        rsOptVar$1 = '[' + rsVarRange$1 + ']?',
        rsOptJoin$1 = '(?:' + rsZWJ$1 + '(?:' + [rsNonAstral$1, rsRegional$1, rsSurrPair$1].join('|') + ')' + rsOptVar$1 + reOptMod$1 + ')*',
        rsSeq$1 = rsOptVar$1 + reOptMod$1 + rsOptJoin$1,
        rsSymbol$1 = '(?:' + [rsNonAstral$1 + rsCombo$1 + '?', rsCombo$1, rsRegional$1, rsSurrPair$1, rsAstral$1].join('|') + ')';

    /** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
    var reUnicode$1 = RegExp(rsFitz$1 + '(?=' + rsFitz$1 + ')|' + rsSymbol$1 + rsSeq$1, 'g');

    /**
     * Converts a Unicode `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function unicodeToArray(string) {
      return string.match(reUnicode$1) || [];
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
    var INFINITY$2 = 1 / 0;

    /**
     * Creates a set object of `values`.
     *
     * @private
     * @param {Array} values The values to add to the set.
     * @returns {Object} Returns the new set.
     */
    !(_Set && (1 / _setToArray(new _Set([,-0]))[1]) == INFINITY$2) ? noop_1 : function(values) {
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
    var INFINITY$1 = 1 / 0;

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
      return (result == '0' && (1 / value) == -INFINITY$1) ? '-0' : result;
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

    /** `Object#toString` result references. */
    var regexpTag = '[object RegExp]';

    /**
     * The base implementation of `_.isRegExp` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a regexp, else `false`.
     */
    function baseIsRegExp(value) {
      return isObjectLike_1(value) && _baseGetTag(value) == regexpTag;
    }

    var _baseIsRegExp = baseIsRegExp;

    /**
     * The base implementation of `_.unary` without support for storing metadata.
     *
     * @private
     * @param {Function} func The function to cap arguments for.
     * @returns {Function} Returns the new capped function.
     */
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }

    var _baseUnary = baseUnary;

    var _nodeUtil = createCommonjsModule(function (module, exports) {
    /** Detect free variable `exports`. */
    var freeExports = exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports;

    /** Detect free variable `process` from Node.js. */
    var freeProcess = moduleExports && _freeGlobal.process;

    /** Used to access faster Node.js helpers. */
    var nodeUtil = (function() {
      try {
        // Use `util.types` for Node.js 10+.
        var types = freeModule && freeModule.require && freeModule.require('util').types;

        if (types) {
          return types;
        }

        // Legacy `process.binding('util')` for Node.js < 10.
        return freeProcess && freeProcess.binding && freeProcess.binding('util');
      } catch (e) {}
    }());

    module.exports = nodeUtil;
    });

    /* Node.js helper references. */
    var nodeIsRegExp = _nodeUtil && _nodeUtil.isRegExp;

    /**
     * Checks if `value` is classified as a `RegExp` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a regexp, else `false`.
     * @example
     *
     * _.isRegExp(/abc/);
     * // => true
     *
     * _.isRegExp('/abc/');
     * // => false
     */
    var isRegExp = nodeIsRegExp ? _baseUnary(nodeIsRegExp) : _baseIsRegExp;

    var isRegExp_1 = isRegExp;

    /**
     * The base implementation of `_.property` without support for deep paths.
     *
     * @private
     * @param {string} key The key of the property to get.
     * @returns {Function} Returns the new accessor function.
     */
    function baseProperty(key) {
      return function(object) {
        return object == null ? undefined : object[key];
      };
    }

    var _baseProperty = baseProperty;

    /**
     * Gets the size of an ASCII `string`.
     *
     * @private
     * @param {string} string The string inspect.
     * @returns {number} Returns the string size.
     */
    var asciiSize = _baseProperty('length');

    var _asciiSize = asciiSize;

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
     * Gets the size of a Unicode `string`.
     *
     * @private
     * @param {string} string The string inspect.
     * @returns {number} Returns the string size.
     */
    function unicodeSize(string) {
      var result = reUnicode.lastIndex = 0;
      while (reUnicode.test(string)) {
        ++result;
      }
      return result;
    }

    var _unicodeSize = unicodeSize;

    /**
     * Gets the number of symbols in `string`.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {number} Returns the string size.
     */
    function stringSize(string) {
      return _hasUnicode(string)
        ? _unicodeSize(string)
        : _asciiSize(string);
    }

    var _stringSize = stringSize;

    /** Used as references for various `Number` constants. */
    var NAN = 0 / 0;

    /** Used to detect bad signed hexadecimal string values. */
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

    /** Used to detect binary string values. */
    var reIsBinary = /^0b[01]+$/i;

    /** Used to detect octal string values. */
    var reIsOctal = /^0o[0-7]+$/i;

    /** Built-in method references without a dependency on `root`. */
    var freeParseInt = parseInt;

    /**
     * Converts `value` to a number.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to process.
     * @returns {number} Returns the number.
     * @example
     *
     * _.toNumber(3.2);
     * // => 3.2
     *
     * _.toNumber(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toNumber(Infinity);
     * // => Infinity
     *
     * _.toNumber('3.2');
     * // => 3.2
     */
    function toNumber(value) {
      if (typeof value == 'number') {
        return value;
      }
      if (isSymbol_1(value)) {
        return NAN;
      }
      if (isObject_1(value)) {
        var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
        value = isObject_1(other) ? (other + '') : other;
      }
      if (typeof value != 'string') {
        return value === 0 ? value : +value;
      }
      value = _baseTrim(value);
      var isBinary = reIsBinary.test(value);
      return (isBinary || reIsOctal.test(value))
        ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
        : (reIsBadHex.test(value) ? NAN : +value);
    }

    var toNumber_1 = toNumber;

    /** Used as references for various `Number` constants. */
    var INFINITY = 1 / 0,
        MAX_INTEGER = 1.7976931348623157e+308;

    /**
     * Converts `value` to a finite number.
     *
     * @static
     * @memberOf _
     * @since 4.12.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted number.
     * @example
     *
     * _.toFinite(3.2);
     * // => 3.2
     *
     * _.toFinite(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toFinite(Infinity);
     * // => 1.7976931348623157e+308
     *
     * _.toFinite('3.2');
     * // => 3.2
     */
    function toFinite(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber_1(value);
      if (value === INFINITY || value === -INFINITY) {
        var sign = (value < 0 ? -1 : 1);
        return sign * MAX_INTEGER;
      }
      return value === value ? value : 0;
    }

    var toFinite_1 = toFinite;

    /**
     * Converts `value` to an integer.
     *
     * **Note:** This method is loosely based on
     * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted integer.
     * @example
     *
     * _.toInteger(3.2);
     * // => 3
     *
     * _.toInteger(Number.MIN_VALUE);
     * // => 0
     *
     * _.toInteger(Infinity);
     * // => 1.7976931348623157e+308
     *
     * _.toInteger('3.2');
     * // => 3
     */
    function toInteger(value) {
      var result = toFinite_1(value),
          remainder = result % 1;

      return result === result ? (remainder ? result - remainder : result) : 0;
    }

    var toInteger_1 = toInteger;

    /** Used as default options for `_.truncate`. */
    var DEFAULT_TRUNC_LENGTH = 30,
        DEFAULT_TRUNC_OMISSION = '...';

    /** Used to match `RegExp` flags from their coerced string values. */
    var reFlags = /\w*$/;

    /**
     * Truncates `string` if it's longer than the given maximum string length.
     * The last characters of the truncated string are replaced with the omission
     * string which defaults to "...".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to truncate.
     * @param {Object} [options={}] The options object.
     * @param {number} [options.length=30] The maximum string length.
     * @param {string} [options.omission='...'] The string to indicate text is omitted.
     * @param {RegExp|string} [options.separator] The separator pattern to truncate to.
     * @returns {string} Returns the truncated string.
     * @example
     *
     * _.truncate('hi-diddly-ho there, neighborino');
     * // => 'hi-diddly-ho there, neighbo...'
     *
     * _.truncate('hi-diddly-ho there, neighborino', {
     *   'length': 24,
     *   'separator': ' '
     * });
     * // => 'hi-diddly-ho there,...'
     *
     * _.truncate('hi-diddly-ho there, neighborino', {
     *   'length': 24,
     *   'separator': /,? +/
     * });
     * // => 'hi-diddly-ho there...'
     *
     * _.truncate('hi-diddly-ho there, neighborino', {
     *   'omission': ' [...]'
     * });
     * // => 'hi-diddly-ho there, neig [...]'
     */
    function truncate(string, options) {
      var length = DEFAULT_TRUNC_LENGTH,
          omission = DEFAULT_TRUNC_OMISSION;

      if (isObject_1(options)) {
        var separator = 'separator' in options ? options.separator : separator;
        length = 'length' in options ? toInteger_1(options.length) : length;
        omission = 'omission' in options ? _baseToString(options.omission) : omission;
      }
      string = toString_1(string);

      var strLength = string.length;
      if (_hasUnicode(string)) {
        var strSymbols = _stringToArray(string);
        strLength = strSymbols.length;
      }
      if (length >= strLength) {
        return string;
      }
      var end = length - _stringSize(omission);
      if (end < 1) {
        return omission;
      }
      var result = strSymbols
        ? _castSlice(strSymbols, 0, end).join('')
        : string.slice(0, end);

      if (separator === undefined) {
        return result + omission;
      }
      if (strSymbols) {
        end += (result.length - end);
      }
      if (isRegExp_1(separator)) {
        if (string.slice(end).search(separator)) {
          var match,
              substring = result;

          if (!separator.global) {
            separator = RegExp(separator.source, toString_1(reFlags.exec(separator)) + 'g');
          }
          separator.lastIndex = 0;
          while ((match = separator.exec(substring))) {
            var newEnd = match.index;
          }
          result = result.slice(0, newEnd === undefined ? end : newEnd);
        }
      } else if (string.indexOf(_baseToString(separator), end) != end) {
        var index = result.lastIndexOf(separator);
        if (index > -1) {
          result = result.slice(0, index);
        }
      }
      return result + omission;
    }

    var truncate_1 = truncate;

    /* svelte/Search.svelte generated by Svelte v3.41.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i][0];
    	child_ctx[1] = list[i][1];
    	child_ctx[31] = list[i][2];
    	child_ctx[32] = list[i][3];
    	child_ctx[33] = list[i][4];
    	child_ctx[34] = list[i][5];
    	child_ctx[35] = list[i][6];
    	child_ctx[36] = list[i][7];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[39] = list[i];
    	child_ctx[41] = i;
    	return child_ctx;
    }

    // (227:4) {:else}
    function create_else_block(ctx) {
    	let h2;

    	return {
    		c() {
    			h2 = element("h2");
    			h2.textContent = "No results found.";
    			attr(h2, "class", "grid-wide");
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);
    		},
    		p: noop$1,
    		d(detaching) {
    			if (detaching) detach(h2);
    		}
    	};
    }

    // (200:4) {#if hasAnyResults}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*resultsTotal*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*isSearchBusy, resultsTotal, tabIndex, handleKeyDownResult, formatSubtitle, formatTitle*/ 9825) {
    				each_value = /*resultsTotal*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (202:6) {#if results.length}
    function create_if_block_1(ctx) {
    	let section;
    	let h2;
    	let t0_value = /*noun*/ ctx[31] + "";
    	let t0;
    	let h2_id_value;
    	let h2_aria_label_value;
    	let t1;
    	let div;
    	let t2;
    	let each_value_1 = /*results*/ ctx[1];
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
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			attr(h2, "id", h2_id_value = `results-${/*id*/ ctx[30]}`);
    			attr(h2, "aria-label", h2_aria_label_value = `Search results for ${/*noun*/ ctx[31]}`);
    			attr(div, "role", "feed");
    			attr(div, "aria-busy", /*isSearchBusy*/ ctx[6]);
    			attr(div, "aria-labelledby", "results-projects");
    			attr(section, "class", "grid-wide");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, h2);
    			append(h2, t0);
    			append(section, t1);
    			append(section, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append(section, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*resultsTotal*/ 1 && t0_value !== (t0_value = /*noun*/ ctx[31] + "")) set_data(t0, t0_value);

    			if (dirty[0] & /*resultsTotal*/ 1 && h2_id_value !== (h2_id_value = `results-${/*id*/ ctx[30]}`)) {
    				attr(h2, "id", h2_id_value);
    			}

    			if (dirty[0] & /*resultsTotal*/ 1 && h2_aria_label_value !== (h2_aria_label_value = `Search results for ${/*noun*/ ctx[31]}`)) {
    				attr(h2, "aria-label", h2_aria_label_value);
    			}

    			if (dirty[0] & /*resultsTotal, tabIndex, handleKeyDownResult, formatSubtitle, formatTitle*/ 9761) {
    				each_value_1 = /*results*/ ctx[1];
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

    			if (dirty[0] & /*isSearchBusy*/ 64) {
    				attr(div, "aria-busy", /*isSearchBusy*/ ctx[6]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (206:10) {#each results as result, i}
    function create_each_block_1(ctx) {
    	let a;
    	let span0;
    	let t0_value = /*formatTitle*/ ctx[10](get_1(/*result*/ ctx[39], /*title*/ ctx[32])) + "";
    	let t0;
    	let span0_id_value;
    	let t1;
    	let span1;
    	let t2_value = /*formatSubtitle*/ ctx[9](get_1(/*result*/ ctx[39], /*subtitle*/ ctx[33])) + "";
    	let t2;
    	let t3;
    	let span2;
    	let t4_value = (get_1(/*result*/ ctx[39], /*footer*/ ctx[34]) || '') + "";
    	let t4;
    	let t5;
    	let a_href_value;
    	let a_aria_posinset_value;
    	let a_aria_setsize_value;
    	let a_aria_labelledby_value;
    	let a_id_value;
    	let mounted;
    	let dispose;

    	function focus_handler() {
    		return /*focus_handler*/ ctx[21](/*index*/ ctx[35], /*i*/ ctx[41]);
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
    			span2 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			attr(span0, "class", "result-title");
    			attr(span0, "id", span0_id_value = `search-result-${/*id*/ ctx[30]}-${/*i*/ ctx[41]}`);
    			attr(span1, "class", "result-subtitle");
    			attr(span2, "class", "result-footer");
    			attr(a, "role", "article");
    			attr(a, "href", a_href_value = "/" + /*path*/ ctx[36] + "/" + get_1(/*result*/ ctx[39], 'id'));
    			attr(a, "aria-posinset", a_aria_posinset_value = /*i*/ ctx[41] + 1);
    			attr(a, "aria-setsize", a_aria_setsize_value = /*results*/ ctx[1].length);
    			attr(a, "tabindex", "0");
    			attr(a, "aria-labelledby", a_aria_labelledby_value = `search-result-${/*id*/ ctx[30]}-${/*i*/ ctx[41]}`);
    			attr(a, "id", a_id_value = `result-index-${/*index*/ ctx[35] + /*i*/ ctx[41]}`);
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			append(a, span0);
    			append(span0, t0);
    			append(a, t1);
    			append(a, span1);
    			append(span1, t2);
    			append(a, t3);
    			append(a, span2);
    			append(span2, t4);
    			append(a, t5);

    			if (!mounted) {
    				dispose = [
    					listen(a, "blur", /*blur_handler*/ ctx[20]),
    					listen(a, "focus", focus_handler),
    					listen(a, "keydown", /*handleKeyDownResult*/ ctx[13])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*resultsTotal*/ 1 && t0_value !== (t0_value = /*formatTitle*/ ctx[10](get_1(/*result*/ ctx[39], /*title*/ ctx[32])) + "")) set_data(t0, t0_value);

    			if (dirty[0] & /*resultsTotal*/ 1 && span0_id_value !== (span0_id_value = `search-result-${/*id*/ ctx[30]}-${/*i*/ ctx[41]}`)) {
    				attr(span0, "id", span0_id_value);
    			}

    			if (dirty[0] & /*resultsTotal*/ 1 && t2_value !== (t2_value = /*formatSubtitle*/ ctx[9](get_1(/*result*/ ctx[39], /*subtitle*/ ctx[33])) + "")) set_data(t2, t2_value);
    			if (dirty[0] & /*resultsTotal*/ 1 && t4_value !== (t4_value = (get_1(/*result*/ ctx[39], /*footer*/ ctx[34]) || '') + "")) set_data(t4, t4_value);

    			if (dirty[0] & /*resultsTotal*/ 1 && a_href_value !== (a_href_value = "/" + /*path*/ ctx[36] + "/" + get_1(/*result*/ ctx[39], 'id'))) {
    				attr(a, "href", a_href_value);
    			}

    			if (dirty[0] & /*resultsTotal*/ 1 && a_aria_setsize_value !== (a_aria_setsize_value = /*results*/ ctx[1].length)) {
    				attr(a, "aria-setsize", a_aria_setsize_value);
    			}

    			if (dirty[0] & /*resultsTotal*/ 1 && a_aria_labelledby_value !== (a_aria_labelledby_value = `search-result-${/*id*/ ctx[30]}-${/*i*/ ctx[41]}`)) {
    				attr(a, "aria-labelledby", a_aria_labelledby_value);
    			}

    			if (dirty[0] & /*resultsTotal*/ 1 && a_id_value !== (a_id_value = `result-index-${/*index*/ ctx[35] + /*i*/ ctx[41]}`)) {
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

    // (201:6) {#each resultsTotal as [id, results, noun, title, subtitle, footer, index, path]}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*results*/ ctx[1].length && create_if_block_1(ctx);

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
    			if (/*results*/ ctx[1].length) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
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
    	let path0;
    	let circle;
    	let path1;
    	let path2;
    	let button_title_value;
    	let t1;
    	let div1;
    	let div0;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*hasAnyResults*/ ctx[7]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			input_1 = element("input");
    			t0 = space();
    			button = element("button");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			circle = svg_element("circle");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			if_block.c();
    			attr(input_1, "type", "search");
    			attr(input_1, "id", "page-search-input");
    			attr(input_1, "placeholder", "Type to search…");
    			attr(input_1, "role", "search");
    			attr(input_1, "aria-hidden", input_1_aria_hidden_value = Boolean(!/*isOpen*/ ctx[4]));
    			attr(input_1, "spellcheck", "false");
    			toggle_class(input_1, "hasTerm", /*hasTerm*/ ctx[3]);
    			attr(path0, "stroke", "none");
    			attr(path0, "d", "M0 0h24v24H0z");
    			attr(path0, "fill", "none");
    			attr(circle, "cx", "10");
    			attr(circle, "cy", "10");
    			attr(circle, "r", "7");
    			attr(circle, "class", "s0");
    			attr(path1, "class", "s0");
    			attr(path1, "d", "m21 21-6-6");
    			attr(path2, "class", "s1");
    			attr(path2, "d", "M18 6 6 18M6 6l12 12");
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
    			toggle_class(svg, "isOpen", /*isOpen*/ ctx[4]);
    			attr(button, "class", "search-trigger");
    			attr(button, "id", "search-trigger");
    			attr(button, "title", button_title_value = `Click to ${/*isOpen*/ ctx[4] ? 'close' : 'open'} the search field`);
    			attr(div0, "class", "wrapper grid");
    			attr(div1, "class", "search-results");
    			toggle_class(div1, "hasTerm", /*hasTerm*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, input_1, anchor);
    			/*input_1_binding*/ ctx[19](input_1);
    			insert(target, t0, anchor);
    			insert(target, button, anchor);
    			append(button, svg);
    			append(svg, path0);
    			append(svg, circle);
    			append(svg, path1);
    			append(svg, path2);
    			insert(target, t1, anchor);
    			insert(target, div1, anchor);
    			append(div1, div0);
    			if_block.m(div0, null);
    			/*div1_binding*/ ctx[22](div1);

    			if (!mounted) {
    				dispose = [
    					listen(window, "keydown", /*handleKeyDown*/ ctx[11]),
    					listen(input_1, "input", /*handleInput*/ ctx[8]),
    					listen(input_1, "keydown", /*handleKeyDownInput*/ ctx[12]),
    					listen(input_1, "blur", /*handleBlur*/ ctx[15]),
    					listen(button, "click", /*handleTriggerClick*/ ctx[14])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*isOpen*/ 16 && input_1_aria_hidden_value !== (input_1_aria_hidden_value = Boolean(!/*isOpen*/ ctx[4]))) {
    				attr(input_1, "aria-hidden", input_1_aria_hidden_value);
    			}

    			if (dirty[0] & /*hasTerm*/ 8) {
    				toggle_class(input_1, "hasTerm", /*hasTerm*/ ctx[3]);
    			}

    			if (dirty[0] & /*isOpen*/ 16) {
    				toggle_class(svg, "isOpen", /*isOpen*/ ctx[4]);
    			}

    			if (dirty[0] & /*isOpen*/ 16 && button_title_value !== (button_title_value = `Click to ${/*isOpen*/ ctx[4] ? 'close' : 'open'} the search field`)) {
    				attr(button, "title", button_title_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}

    			if (dirty[0] & /*hasTerm*/ 8) {
    				toggle_class(div1, "hasTerm", /*hasTerm*/ ctx[3]);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d(detaching) {
    			if (detaching) detach(input_1);
    			/*input_1_binding*/ ctx[19](null);
    			if (detaching) detach(t0);
    			if (detaching) detach(button);
    			if (detaching) detach(t1);
    			if (detaching) detach(div1);
    			if_block.d();
    			/*div1_binding*/ ctx[22](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    const idField = 'id';

    function instance($$self, $$props, $$invalidate) {
    	let resultsTotal;
    	let hasAnyResults;
    	let input; // Input field
    	let results; // Input field
    	let resultsMembers = []; // Filtered items
    	let resultsEvents = []; // Filtered items
    	let resultsProjects = []; // Filtered items
    	let hasTerm = false;
    	let isOpen = false;
    	let tabIndex = 0;
    	let isSearchBusy = false;

    	const searchOptions = {
    		fuzzy: 0.1,
    		prefix: true,
    		boost: { label: 2 }
    	};

    	const searchMembers = new MiniSearch$1({
    			idField,
    			storeFields: [idField, 'role', 'label'],
    			fields: ['label', 'role', 'events', 'projects'],
    			searchOptions
    		});

    	const searchProjects = new MiniSearch$1({
    			idField,
    			storeFields: [idField, 'label', 'dateString', 'subtitle'],
    			fields: [
    				'label',
    				'intro',
    				'links',
    				'members',
    				'projects',
    				'events',
    				'location',
    				'dateString',
    				'collaborators',
    				'subtitle'
    			],
    			searchOptions
    		});

    	const searchEvents = new MiniSearch$1({
    			idField,
    			storeFields: [idField, 'label', 'date', 'subtitle'],
    			fields: [
    				'label',
    				'intro',
    				'links',
    				'members',
    				'projects',
    				'events',
    				'location',
    				'date',
    				'collaborators',
    				'subtitle'
    			],
    			searchOptions
    		});

    	function handleInput() {
    		$$invalidate(6, isSearchBusy = true);
    		const term = trim_1(input.value);
    		$$invalidate(3, hasTerm = Boolean(term.length));

    		if (hasTerm && searchMembers.documentCount && searchEvents.documentCount && searchProjects.documentCount) {
    			$$invalidate(16, resultsMembers = searchMembers.search(term));
    			$$invalidate(17, resultsEvents = searchEvents.search(term));
    			$$invalidate(18, resultsProjects = searchProjects.search(term));
    			disableBodyScroll(results);
    			$$invalidate(6, isSearchBusy = false);
    		} else {
    			$$invalidate(16, resultsMembers = []);
    			$$invalidate(17, resultsEvents = []);
    			$$invalidate(18, resultsProjects = []);
    			enableBodyScroll(results);
    			$$invalidate(6, isSearchBusy = false);
    		}
    	}

    	function formatSubtitle(str) {
    		return truncate_1(str, { length: 180, separator: ' ' });
    	}

    	function formatTitle(str) {
    		return truncate_1(str, { length: 60, separator: ' ' });
    	}

    	onMount(async () => {
    		fetch('/content.json').then(res => res.json()).then(data => {
    			const { members, events, projects } = data;
    			searchMembers.addAll(members);
    			searchProjects.addAll(projects);
    			searchEvents.addAll(events);
    		});
    	});

    	function closeSearch() {
    		input.blur();
    		$$invalidate(2, input.value = '', input);
    		handleInput();
    		$$invalidate(4, isOpen = false);
    	}

    	function handleKeyDown(event) {
    		const { key, target } = event;

    		if (key === 'Escape') {
    			closeSearch();
    		}
    	}

    	function handleKeyDownInput(event) {
    		const { key, target, keyCode } = event;

    		if (trim_1(input.value)) {
    			if (keyCode === 40) {
    				document.getElementById(`result-index-${tabIndex}`).focus();
    			}
    		} else {
    			if (key === 'Tab') {
    				closeSearch();
    			}
    		}
    	}

    	function handleKeyDownResult(event) {
    		const { keyCode } = event;

    		if (keyCode === 40 || keyCode === 38) {
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
    			$$invalidate(4, isOpen = true);
    		}
    	}

    	function handleBlur(e) {
    		setTimeout(
    			() => {
    				if (document.activeElement.id !== 'search-trigger' && !hasTerm) {
    					$$invalidate(4, isOpen = false);
    				}
    			},
    			0
    		);
    	}

    	function input_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			input = $$value;
    			$$invalidate(2, input);
    		});
    	}

    	const blur_handler = () => $$invalidate(5, tabIndex = 0);
    	const focus_handler = (index, i) => $$invalidate(5, tabIndex = index + i);

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			results = $$value;
    			$$invalidate(1, results);
    		});
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*resultsMembers, resultsEvents, resultsProjects*/ 458752) {
    			resultsMembers.length + resultsEvents.length + resultsProjects.length;
    		}

    		if ($$self.$$.dirty[0] & /*resultsProjects, resultsEvents, resultsMembers*/ 458752) {
    			$$invalidate(0, resultsTotal = [
    				[
    					'project',
    					resultsProjects,
    					'Projects',
    					'label',
    					'subtitle',
    					'dateString',
    					0,
    					'p'
    				],
    				[
    					'event',
    					resultsEvents,
    					'Events',
    					'label',
    					'subtitle',
    					'date',
    					resultsProjects.length,
    					'e'
    				],
    				[
    					'member',
    					resultsMembers,
    					'Members',
    					'label',
    					'role',
    					false,
    					resultsProjects.length + resultsEvents.length,
    					'm'
    				]
    			]);
    		}

    		if ($$self.$$.dirty[0] & /*resultsTotal*/ 1) {
    			$$invalidate(7, hasAnyResults = resultsTotal.some(([key, results]) => results.length));
    		}
    	};

    	return [
    		resultsTotal,
    		results,
    		input,
    		hasTerm,
    		isOpen,
    		tabIndex,
    		isSearchBusy,
    		hasAnyResults,
    		handleInput,
    		formatSubtitle,
    		formatTitle,
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
