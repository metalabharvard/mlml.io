<script>
	import { onMount } from 'svelte';
	import Fuse from 'fuse.js';
	import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
	import trim from 'lodash/trim';
	import uniq from 'lodash/uniq';

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

	function handleTriggerClick () {
		if (isOpen) {
			closeSearch();
		} else {
			input.focus();
			isOpen = true;
		}
	}

	function handleBlur () {
		if (!hasTerm) {
			closeSearch();
		}
	}
</script>

<svelte:window on:keydown={handleKeyDown} />

<input
	type="search"
	id="page-search-input"
	placeholder="Search for events, members, projects, …"
	bind:this={input}
	on:input={handleInput}
	on:blur={handleBlur}
	role="search"
	class:hasTerm={hasTerm}>

<button class="search-trigger" on:click={handleTriggerClick}>
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
		stroke-linejoin="round">
	  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
	  <circle cx="10" cy="10" r="7"></circle>
	  <line x1="21" y1="21" x2="15" y2="15"></line>
	</svg>
</button>

<div class="search-results grid" class:hasTerm={hasTerm} bind:this={results}>
	<div class="grid-wide">
		{#if resultsProjects.length}
		<h2>Projects ({ resultsProjects.length })</h2>
		<ul class="plain" role="feed">
			{#each resultsProjects as { title, slug, intro }}
			<li>
				<a href="/{ slug }">
					<span class="result-title">{ title }</span>
					<span class="result-subtitle">{ intro }</span>
				</a>
			</li>
			{/each}
		</ul>
		{/if}
		{#if resultsEvents.length}
		<h2>Events ({ resultsEvents.length })</h2>
		<ul class="plain" role="feed">
			{#each resultsEvents as { title, slug, intro }}
			<li>
				<a href="/{ slug }">
					<span class="result-title">{ title }</span>
					<span class="result-subtitle">{ intro }</span>
				</a>
			</li>
			{/each}
		</ul>
		{/if}
		{#if resultsMembers.length}
		<h2>Members ({ resultsMembers.length })</h2>
		<ul class="plain" role="feed">
			{#each resultsMembers as { name, slug, role }}
			<li>
				<a href="/{ slug }">
					<span class="result-title">{ name }</span>
					<span class="result-subtitle">{ role }</span>
				</a>
			</li>
			{/each}
		</ul>
		{/if}
	</div>
</div>

<!-- <input type="text" on:input={handleInput} placeholder={placeholder} bind:this={input} class="search" role="search" /> -->

