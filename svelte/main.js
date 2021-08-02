import Search from './Search.svelte';
const targetSearch = document.getElementById('page-search')
if (targetSearch) new Search({ target: targetSearch });
