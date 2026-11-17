/**
 * Filter Grid for Divi 5: front-end behaviour.
 *
 * The grid is rendered by PHP. This script only takes over the filters, the
 * search field and the pagination, and swaps in HTML returned by the REST API.
 */
( function () {
	'use strict';

	const SEARCH_PARAM = 'd5fg_s';
	const PAGE_PARAM = 'd5fg_page';
	const DEBOUNCE_MS = 300;

	class FilterGrid {
		/**
		 * @param {HTMLElement} root Element carrying the `data-d5fg` attribute.
		 */
		constructor( root ) {
			this.root = root;
			this.grid = root.querySelector( '.d5fg-grid' );
			this.pager = root.querySelector( '.d5fg-pagination' );
			this.status = root.querySelector( '.d5fg-status' );
			this.searchInput = root.querySelector( '.d5fg-search__input' );
			this.mode = root.dataset.pagination;
			this.multi = '1' === root.dataset.multi;
			this.nonce = root.dataset.nonce || '';
			this.controller = null;
			this.searchTimer = 0;
			this.observer = null;
			this.state = this.readState();

			root.addEventListener( 'click', ( event ) => this.onClick( event ) );
			root.addEventListener( 'change', ( event ) => this.onChange( event ) );
			root.addEventListener( 'input', ( event ) => this.onInput( event ) );
			root.addEventListener( 'submit', ( event ) => this.onSubmit( event ) );
			window.addEventListener( 'popstate', () => this.onPopState() );

			this.observeLoadMore();
		}

		/** Filter groups, one per taxonomy. */
		groups() {
			return Array.from( this.root.querySelectorAll( '.d5fg-filters' ) );
		}

		/** Reads the state from the markup rendered by the server. */
		readState() {
			const terms = {};

			this.groups().forEach( ( group ) => {
				const select = group.querySelector( '.d5fg-filter-select' );
				const selected = select
					? [ select.value ]
					: Array.from( group.querySelectorAll( '.d5fg-filter.is-active' ) ).map( ( button ) => button.dataset.term );

				terms[ group.dataset.taxonomy ] = selected.filter( Boolean );
			} );

			return {
				terms,
				s: this.searchInput ? this.searchInput.value.trim() : '',
				page: parseInt( this.root.dataset.page, 10 ) || 1,
			};
		}

		/** Reads the state from the URL, used when the visitor goes back or forward. */
		readUrl() {
			const params = new URLSearchParams( window.location.search );
			const terms = {};

			this.groups().forEach( ( group ) => {
				const value = params.get( group.dataset.param ) || '';
				terms[ group.dataset.taxonomy ] = value.split( ',' ).filter( Boolean );
			} );

			return {
				terms,
				s: this.searchInput ? ( params.get( SEARCH_PARAM ) || '' ).trim() : '',
				page: 'numbers' === this.mode ? parseInt( params.get( PAGE_PARAM ), 10 ) || 1 : 1,
			};
		}

		/** Writes the state to the URL, keeping every unrelated parameter. */
		writeUrl( replace ) {
			const url = new URL( window.location.href );

			this.groups().forEach( ( group ) => {
				const slugs = this.state.terms[ group.dataset.taxonomy ] || [];

				if ( slugs.length ) {
					url.searchParams.set( group.dataset.param, slugs.join( ',' ) );
				} else {
					url.searchParams.delete( group.dataset.param );
				}
			} );

			if ( this.searchInput ) {
				if ( this.state.s ) {
					url.searchParams.set( SEARCH_PARAM, this.state.s );
				} else {
					url.searchParams.delete( SEARCH_PARAM );
				}
			}

			if ( 'numbers' === this.mode && this.state.page > 1 ) {
				url.searchParams.set( PAGE_PARAM, String( this.state.page ) );
			} else {
				url.searchParams.delete( PAGE_PARAM );
			}

			// Commas are safe in a query string and keep shared links readable.
			const href = url.toString().replace( /%2C/g, ',' );

			if ( href === window.location.href ) {
				return;
			}

			window.history[ replace ? 'replaceState' : 'pushState' ]( { d5fg: true }, '', href );
		}

		/** Makes the controls reflect the state. */
		syncControls() {
			this.groups().forEach( ( group ) => {
				const slugs = this.state.terms[ group.dataset.taxonomy ] || [];
				const select = group.querySelector( '.d5fg-filter-select' );

				if ( select ) {
					select.value = slugs[ 0 ] || '';
					return;
				}

				group.querySelectorAll( '.d5fg-filter' ).forEach( ( button ) => {
					const term = button.dataset.term;
					const active = term ? slugs.includes( term ) : 0 === slugs.length;

					button.classList.toggle( 'is-active', active );
					button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
				} );
			} );

			if ( this.searchInput && document.activeElement !== this.searchInput ) {
				this.searchInput.value = this.state.s;
			}
		}

		onClick( event ) {
			const target = event.target instanceof Element ? event.target : null;

			if ( ! target ) {
				return;
			}

			const filter = target.closest( '.d5fg-filter' );

			if ( filter && this.root.contains( filter ) ) {
				this.toggleTerm( filter.closest( '.d5fg-filters' ).dataset.taxonomy, filter.dataset.term );
				return;
			}

			const pageLink = target.closest( '.d5fg-page[data-page]' );

			if ( pageLink && this.root.contains( pageLink ) ) {
				// Let the browser handle "open in a new tab" and similar gestures.
				if ( event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || 0 !== event.button ) {
					return;
				}

				event.preventDefault();
				this.state.page = parseInt( pageLink.dataset.page, 10 ) || 1;
				this.writeUrl( false );
				this.load( { focusGrid: true } );
				return;
			}

			if ( target.closest( '.d5fg-load-more' ) ) {
				this.loadNextPage( true );
			}
		}

		onChange( event ) {
			const select = event.target;

			if ( ! ( select instanceof HTMLSelectElement ) || ! select.classList.contains( 'd5fg-filter-select' ) ) {
				return;
			}

			this.state.terms[ select.closest( '.d5fg-filters' ).dataset.taxonomy ] = select.value ? [ select.value ] : [];
			this.applyFilters( false );
		}

		onInput( event ) {
			if ( event.target !== this.searchInput ) {
				return;
			}

			window.clearTimeout( this.searchTimer );
			this.searchTimer = window.setTimeout( () => this.applySearch(), DEBOUNCE_MS );
		}

		onSubmit( event ) {
			if ( ! ( event.target instanceof Element ) || ! event.target.classList.contains( 'd5fg-search' ) ) {
				return;
			}

			event.preventDefault();
			window.clearTimeout( this.searchTimer );
			this.applySearch();
		}

		onPopState() {
			const next = this.readUrl();

			if ( JSON.stringify( next ) === JSON.stringify( this.state ) ) {
				return;
			}

			this.state = next;
			this.syncControls();
			this.load();
		}

		toggleTerm( taxonomy, term ) {
			const current = this.state.terms[ taxonomy ] || [];
			let next;

			if ( ! term ) {
				next = [];
			} else if ( this.multi ) {
				next = current.includes( term ) ? current.filter( ( slug ) => slug !== term ) : current.concat( term );
			} else {
				next = current.includes( term ) ? [] : [ term ];
			}

			this.state.terms[ taxonomy ] = next;
			this.applyFilters( false );
		}

		applySearch() {
			const value = this.searchInput.value.trim();

			if ( value === this.state.s ) {
				return;
			}

			this.state.s = value;
			// Typing must not fill the history with one entry per keystroke.
			this.applyFilters( true );
		}

		applyFilters( replace ) {
			this.state.page = 1;
			this.syncControls();
			this.writeUrl( replace );
			this.load();
		}

		loadNextPage( moveFocus ) {
			if ( this.root.classList.contains( 'is-loading' ) ) {
				return;
			}

			this.state.page += 1;
			this.load( { append: true, focusNew: moveFocus } );
		}

		/** Builds the REST URL for the current state. */
		requestUrl() {
			const url = new URL( this.root.dataset.endpoint, window.location.href );

			url.searchParams.set( 'config', this.root.dataset.config );
			url.searchParams.set( 'sig', this.root.dataset.sig );
			url.searchParams.set( 'page', String( this.state.page ) );

			if ( this.state.s ) {
				url.searchParams.set( 's', this.state.s );
			}

			Object.keys( this.state.terms ).forEach( ( taxonomy ) => {
				if ( this.state.terms[ taxonomy ].length ) {
					url.searchParams.set( 'terms[' + taxonomy + ']', this.state.terms[ taxonomy ].join( ',' ) );
				}
			} );

			return url.toString();
		}

		async request( signal ) {
			const url = this.requestUrl();
			const options = { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } };
			let response;

			if ( this.nonce ) {
				response = await fetch( url, { ...options, headers: { ...options.headers, 'X-WP-Nonce': this.nonce } } );

				// A cached page can carry an expired nonce. The endpoint is public, so retry without it.
				if ( 403 === response.status ) {
					this.nonce = '';
					response = await fetch( url, { ...options, credentials: 'omit' } );
				}
			} else {
				response = await fetch( url, { ...options, credentials: 'omit' } );
			}

			if ( ! response.ok ) {
				throw new Error( 'HTTP ' + response.status );
			}

			return response.json();
		}

		/**
		 * Fetches and displays the results for the current state.
		 *
		 * @param {Object}  [options]
		 * @param {boolean} [options.append]    Add the items after the existing ones.
		 * @param {boolean} [options.focusNew]  Move focus to the first added item.
		 * @param {boolean} [options.focusGrid] Scroll to the grid and focus it.
		 */
		async load( options = {} ) {
			if ( this.controller ) {
				this.controller.abort();
			}

			const controller = new AbortController();
			this.controller = controller;
			this.setBusy( true );

			try {
				const data = await this.request( controller.signal );
				const firstNew = this.render( data, options.append );

				this.status.textContent = data.announce || '';

				if ( options.focusNew && firstNew ) {
					const link = firstNew.querySelector( 'a:not([tabindex="-1"])' );

					if ( link ) {
						link.focus( { preventScroll: true } );
					}
				}

				if ( options.focusGrid ) {
					if ( this.root.getBoundingClientRect().top < 0 ) {
						this.root.scrollIntoView( { block: 'start' } );
					}

					this.grid.focus( { preventScroll: true } );
				}
			} catch ( error ) {
				if ( 'AbortError' === error.name ) {
					return;
				}

				if ( options.append ) {
					this.state.page -= 1;
				}

				this.status.textContent = ( window.d5fgL10n && window.d5fgL10n.error ) || '';
			}

			if ( this.controller === controller ) {
				this.controller = null;
				this.setBusy( false );
			}
		}

		/**
		 * Puts the returned HTML in place.
		 *
		 * @return {Element|null} The first added item when appending.
		 */
		render( data, append ) {
			let firstNew = null;

			if ( append ) {
				const count = this.grid.children.length;

				this.grid.insertAdjacentHTML( 'beforeend', data.items );
				firstNew = this.grid.children[ count ] || null;
			} else {
				this.grid.innerHTML = data.items;
			}

			this.pager.innerHTML = data.pagination || '';
			this.root.dataset.page = String( this.state.page );
			this.observeLoadMore();

			this.root.dispatchEvent( new CustomEvent( 'd5fg:updated', { bubbles: true, detail: { state: this.state, total: data.total } } ) );

			return firstNew;
		}

		setBusy( busy ) {
			this.root.classList.toggle( 'is-loading', busy );
			this.grid.setAttribute( 'aria-busy', busy ? 'true' : 'false' );
		}

		/** Infinite scroll: loads the next page when the "Load more" button comes into view. */
		observeLoadMore() {
			if ( this.observer ) {
				this.observer.disconnect();
				this.observer = null;
			}

			const button = this.pager.querySelector( '.d5fg-load-more[data-infinite]' );

			if ( ! button || ! ( 'IntersectionObserver' in window ) ) {
				return;
			}

			this.observer = new IntersectionObserver(
				( entries ) => {
					if ( entries.some( ( entry ) => entry.isIntersecting ) ) {
						this.loadNextPage( false );
					}
				},
				{ rootMargin: '300px 0px' }
			);

			this.observer.observe( button );
		}
	}

	/**
	 * Starts every grid found under a node that is not started yet.
	 *
	 * @param {ParentNode} [context]
	 */
	function init( context ) {
		( context || document ).querySelectorAll( '[data-d5fg]:not([data-d5fg-ready])' ).forEach( ( root ) => {
			// The Visual Builder preview is static.
			if ( root.closest( '[data-d5fg-preview]' ) ) {
				return;
			}

			root.setAttribute( 'data-d5fg-ready', '' );
			new FilterGrid( root );
		} );
	}

	window.d5fg = { init };

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => init() );
	} else {
		init();
	}
} )();
