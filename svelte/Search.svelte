<script>
  import { onMount } from 'svelte';
  import MiniSearch from 'minisearch';
  import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
  import trim from 'lodash/trim';
  import uniq from 'lodash/uniq';
  import get from 'lodash/get';
  import truncate from 'lodash/truncate';

  let input; // Input field
  let results; // Input field
  let resultsMembers = []; // Filtered items
  let resultsEvents = []; // Filtered items
  let resultsProjects = []; // Filtered items
  let hasTerm = false;
  let pageHeader;
  let isOpen = false;
  let tabIndex = 0;
  let isSearchBusy = false;

  const idField = 'id';

  const searchOptions = {
    fuzzy: 0.1,
    prefix: true,
    boost: { label: 2 }
  };

  const searchMembers = new MiniSearch({
    idField,
    storeFields: [idField, 'role', 'label'],
    fields: ['label', 'role', 'events', 'projects'],
    searchOptions
  });

  const searchProjects = new MiniSearch({
    idField,
    storeFields: [idField, 'label', 'dateString', 'subtitle'],
    fields: ['label', 'intro', 'links', 'members', 'projects', 'events', 'location', 'dateString', 'collaborators', 'subtitle'],
    searchOptions
  });

  const searchEvents = new MiniSearch({
    idField,
    storeFields: [idField, 'label', 'date', 'subtitle'],
    fields: ['label', 'intro', 'links', 'members', 'projects', 'events', 'location', 'date', 'collaborators', 'subtitle'],
    searchOptions
  });

  $: resultsTotalLength = resultsMembers.length + resultsEvents.length + resultsProjects.length

  $: resultsTotal = [
    ['project', resultsProjects, 'Projects', 'label', 'subtitle', 'dateString', 0, 'p'],
    ['event', resultsEvents, 'Events', 'label', 'subtitle', 'date', resultsProjects.length, 'e'],
    ['member', resultsMembers, 'Members', 'label', 'role', false, resultsProjects.length + resultsEvents.length, 'm']
  ]

  $: hasAnyResults = resultsTotal.some(([key, results]) => results.length)

  function handleInput () {
    isSearchBusy = true;
    const term = trim(input.value)
    hasTerm = Boolean(term.length);
    if (hasTerm && searchMembers.documentCount && searchEvents.documentCount && searchProjects.documentCount) {
      resultsMembers = searchMembers.search(term)
      resultsEvents = searchEvents.search(term)
      resultsProjects = searchProjects.search(term)
      disableBodyScroll(results);
      isSearchBusy = false;
    } else {
      resultsMembers = [];
      resultsEvents = [];
      resultsProjects = [];
      enableBodyScroll(results);
      isSearchBusy = false;
    }
  }

  function formatSubtitle (str) {
    return truncate(str, { length: 180, separator: ' ' })
  }

  function formatTitle (str) {
    return truncate(str, { length: 60, separator: ' ' })
  }

  onMount (async () => {
    fetch('/content.json')
      .then(res => res.json())
      .then(data => {
        const { members, events, projects } = data;
        searchMembers.addAll(members);
        searchProjects.addAll(projects);
        searchEvents.addAll(events);
      });
  })

  function closeSearch () {
    input.blur();
    input.value = '';
    handleInput();
    isOpen = false;
  }

  function handleKeyDown (event) {
    const { key, target } = event;
    if (key === 'Escape') {
      closeSearch();
    }
  }

  function handleKeyDownInput (event) {
    const { key, target, keyCode } = event;
    if (trim(input.value)) {
      if (keyCode === 40) {
        document.getElementById(`result-index-${tabIndex}`).focus();
      }
    } else {
      if (key === 'Tab') {
        closeSearch();
      }
    }
  }

  function handleKeyDownResult (event) {
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

  function handleTriggerClick () {
    if (isOpen) {
      closeSearch();
    } else {
      input.focus();
      isOpen = true;
    }
  }

  function handleBlur (e) {
    setTimeout(() => {
      if (document.activeElement.id !== 'search-trigger' && !hasTerm) {
        isOpen = false;
      }
    }, 0);
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<input
  type="search"
  id="page-search-input"
  placeholder="Type to search…"
  bind:this={input}
  on:input={handleInput}
  on:keydown={handleKeyDownInput}
  on:blur={handleBlur}
  role="search"
  class:hasTerm={hasTerm}
  aria-hidden={Boolean(!isOpen)}
  spellcheck="false">

<button
  class="search-trigger"
  id="search-trigger"
  on:click={handleTriggerClick}
  title={`Click to ${isOpen ? 'close' : 'open'} the search field`}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="trigger-icon icon icon-tabler icon-tabler-search"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    stroke-width="2"
    stroke="currentColor"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
    class:isOpen={isOpen}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <circle cx="10" cy="10" r="7" class="s0"/>
    <path class="s0" d="m21 21-6-6"/>
    <path class="s1" d="M18 6 6 18M6 6l12 12"/>
  </svg>
</button>

<div class="search-results" class:hasTerm={hasTerm} bind:this={results}>
  <div class="wrapper grid">
    {#if hasAnyResults}
      {#each resultsTotal as [id, results, noun, title, subtitle, footer, index, path]}
      {#if results.length}
      <section class="grid-wide">
        <h2 id="{`results-${id}`}" aria-label={`Search results for ${noun}`}>{ noun }</h2>
        <div role="feed" aria-busy="{ isSearchBusy }" aria-labelledby="results-projects">
          {#each results as result, i}
          <a
            role="article"
            href="/{ path }/{ get(result, 'id') }"
            aria-posinset="{ i + 1 }"
            aria-setsize="{ results.length }"
            tabindex="0"
            aria-labelledby="{ `search-result-${id}-${i}` }"
            id={`result-index-${index + i}`}
            on:blur={ () => tabIndex = 0 }
            on:focus={ () => tabIndex = index + i }
            on:keydown={handleKeyDownResult}>
            <span class="result-title" id={ `search-result-${id}-${i}` }>{ formatTitle(get(result, title)) }</span>
            <span class="result-subtitle">{ formatSubtitle(get(result, subtitle)) }</span>
            <span class="result-footer">{ get(result, footer) || '' }</span>
          </a>
          {/each}
        </div>
      </section>
      {/if}
      {/each}
    {:else}
    <h2>No results found.</h2>
    {/if}
  </div>
</div>
