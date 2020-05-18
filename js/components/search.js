import lunr from 'lunr';
import debounce from 'lodash/debounce';

// Based on:
// https://www.raymondcamden.com/2019/10/20/adding-search-to-your-eleventy-static-site-with-lunr

export default async () => {

	const SEARCH_RESULT_LIMIT = 3;

	const searchInput = document.querySelector( '.search-input' );
	const searchResults = document.querySelector( '.search-results' );

	let docs;
	let index;

	async function load() {

		setState( 'loading', 'Loading...' );

		let result = await fetch( '/api/search.json' );
		docs = await result.json();

		index = lunr( function() {
			this.ref('id');
			this.field('title');
			this.field('content');

			docs.forEach( ( doc, index ) => {
				doc.id = index;
				this.add( doc );
			} );
		});

	}

	function search( term ) {

		// Make sure we're loaded
		if( docs ) {
			return index.search( term ).map( r => {
				return docs[r.ref];
			} ).slice(0, SEARCH_RESULT_LIMIT);
		}

	}

	function renderSearchResult( searchTerm, result ) {

		let searchTermMatcher = new RegExp( searchTerm.split(' ').join('|'), 'i' );

		let title = highlightWords( result.title, searchTermMatcher );

		let content = '';
		let contentMatch = result.content.match( searchTermMatcher );

		if( contentMatch ) {
			let start = contentMatch.index;
			let end = start + contentMatch.length;
			let value = result.content.slice( start - 40, end + 120 );

			content = '<p class="excerpt mt-2">...' + highlightWords( value, searchTermMatcher ) + '...</p>';
		}

		return `
			<a href="${result.url}" class="search-result block m-0 p-2 outline-none border-2 border-transparent rounded focus:border-blue-400 hover:bg-gray-200">
				<p class="font-semibold text-base">${title}</p>
				${content}
			</a>
			<div class="divider border-t border-gray-200 my-2"></div>
		`;

	}

	function highlightWords( string, wordExpression ) {

		return string.replace( new RegExp( wordExpression, 'gi' ), '<mark>$&</mark>' )

	}

	function setState( state, description ) {

		searchResults.dataset.state = state;

		if( typeof description === 'string' ) {
			searchResults.innerHTML = `<span class="text-gray-500">${description}</span>`;
		}

	}

	function show() {

		if( !isVisible() ) {
			searchResults.classList.add( 'show' );
			document.addEventListener( 'mousedown', onDocumentMouseDown );
			document.addEventListener( 'keydown', onDocumentKeyDown );

			// Lazy-load the first time the search field is shown
			if( !docs ) {
				load().then(
					() => {
						let searchTerm = searchInput.value.trim();
						if( searchTerm && isVisible() ) {
							search();
						}
					},
					() => {
						setState( 'loading-error', 'Failed to load search data 😭' );
					}
				);
			}
		}

	}

	function hide() {

		if( isVisible() ) {
			searchResults.classList.remove( 'show' );
			document.removeEventListener( 'mousedown', onDocumentMouseDown );
			document.removeEventListener( 'keydown', onDocumentKeyDown );
		}

	}

	function isVisible() {

		return searchResults.classList.contains( 'show' );

	}

	function moveFocus( offset=1 ) {

		let resultElements = Array.from( document.querySelectorAll( '.search-result' ) );
		let target;

		if( document.activeElement && document.activeElement.classList.contains( 'search-result' ) ) {
			target = resultElements[ resultElements.indexOf( document.activeElement ) + offset ];
		}
		else {
			target = resultElements[0];
		}

		if( target ) target.focus();

	}

	searchInput.addEventListener( 'focus', show );
	searchInput.addEventListener( 'input', debounce( event => {

		let searchTerm = searchInput.value.trim();
		if( searchTerm ) {

			let results = search( searchTerm );
			if( results.length ) {
				searchResults.innerHTML = results.map( renderSearchResult.bind( this, searchTerm ) ).join('');
				setState( 'has-results' );
			}
			else {
				setState( 'no-results', `No results for "${searchTerm}"` );
			}

		}
		else {
			setState( 'no-term', 'Enter a search term' );
		}

	}, 150 ) );

	document.addEventListener( 'keyup', event => {

		if( event.key === '/' ) {
			searchInput.focus();
			searchInput.select();
		}

	} );

	// only bound while search is visible
	function onDocumentKeyDown( event ) {

		if( event.key === 'Escape' ) {
			searchInput.blur();
			hide();
		}
		else if( event.key === 'ArrowUp' ) {
			moveFocus( -1 );
			event.preventDefault();
		}
		else if( event.key === 'ArrowDown' ) {
			moveFocus( 1 );
			event.preventDefault();
		}

	}

	function onDocumentMouseDown( event ) {

		if( !event.target.closest( '.search' ) ) {
			hide();
		}

	}

}