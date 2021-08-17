<script>
  import { onMount } from 'svelte';
  import Fuse from 'fuse.js';
  import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
  import trim from 'lodash/trim';
  import uniq from 'lodash/uniq';
  import get from 'lodash/get';

  let input; // Input field
  let results; // Input field
  let resultsMembers = []; // Filtered items
  let resultsEvents = []; // Filtered items
  let resultsProjects = []; // Filtered items
  let fuseMembers; // Fuse instance
  let fuseEvents; // Fuse instance
  let fuseProjects; // Fuse instance
  let hasTerm = false;
  let pageHeader;
  let isOpen = false;
  let tabIndex = 0;

  $: resultsTotalLength = resultsMembers.length + resultsEvents.length + resultsProjects.length

  $: resultsTotal = [
    ['project', resultsProjects, 'Projects', 'title', 'intro', 0],
    ['event', resultsEvents, 'Events', 'title', 'intro', resultsProjects.length],
    ['member', resultsMembers, 'Members', 'name', 'role', resultsProjects.length + resultsEvents.length]
  ]

  function handleInput () {
    const term = trim(input.value)
    hasTerm = Boolean(term.length);
    if (hasTerm && fuseMembers && fuseEvents && fuseEvents) {
      resultsMembers = fuseMembers.search(term).map((d) => d.item);
      resultsEvents = fuseEvents.search(term).map((d) => d.item);
      resultsProjects = fuseProjects.search(term).map((d) => d.item);
      disableBodyScroll(results);
    } else {
      resultsMembers = [];
      resultsEvents = [];
      resultsProjects = [];
      enableBodyScroll(results);
    }
  }

  onMount (async () => {
    fetch('/content.json')
      .then(res => res.json())
      .then(data => {
        const { members, events, projects } = data;
        fuseMembers = new Fuse(members, { threshold: 0.4, keys: [{ name: 'name', weight: 2 }, 'role', 'slug'] });
        fuseEvents = new Fuse(events, { threshold: 0.4, keys: [{ name: 'title', weight: 2 }, { name: 'intro', weight: 1.5 }, 'description', 'members', 'slug'] });
        fuseProjects = new Fuse(projects, { threshold: 0.4, keys: [{ name: 'title', weight: 2 }, { name: 'intro', weight: 1.5 }, 'description', 'members', 'slug'] });
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
    // console.log({ event })
    const { key, target, keyCode } = event;
    if (trim(input.value)) {
      if (keyCode === 40) {
        document.getElementById(`result-index-${tabIndex}`).focus();
        // event.preventDefault();
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
  aria-hidden={Boolean(!isOpen)}>

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
    <circle cx="10" cy="10" r="7" class="s0"></circle>
    <line x1="21" y1="21" x2="15" y2="15" class="s0"></line>
    <line x1="18" y1="6" x2="6" y2="18" class="s1"></line>
    <line x1="6" y1="6" x2="18" y2="18" class="s1"></line>
  </svg>
</button>

<div class="search-results grid" class:hasTerm={hasTerm} bind:this={results}>
  <div class="grid-wide">
    {#each resultsTotal as [id, results, noun, title, subtitle, index]}
    {#if results.length}
    <section>
      <h2 id="{`results-${id}`}" aria-label={`Search results for ${noun}`}>{ noun } <small class="search-result-counter">{ results.length }</small></h2>
      <div role="feed" aria-busy="false" aria-labelledby="results-projects">
        {#each results as result, i}
        <a
          role="article"
          href="/{ get(result, 'slug') }"
          aria-posinset="{ i + 1 }"
          aria-setsize="{ results.length }"
          tabindex="0"
          aria-labelledby="{ `search-result-${id}-${i}` }"
          id={`result-index-${index + i}`}
          on:blur={ () => tabIndex = 0 }
          on:focus={ () => tabIndex = index + i }
          on:keydown={handleKeyDownResult}>
          <span class="result-title" id={ `search-result-${id}-${i}` }>{ get(result, title) }</span>
          <span class="result-subtitle">{ get(result, subtitle) }</span>
        </a>
        {/each}
      </div>
    </section>
    {/if}
    {/each}
  </div>
</div>
