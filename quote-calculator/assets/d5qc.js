/**
 * Quote Calculator for Divi 5: front-end behaviour.
 *
 * Every step is rendered by PHP. This script shows one step at a time, applies
 * the conditions, updates the indicative estimate and sends the request. The
 * estimate uses the same algorithm as D5QC\Calculator; the server computes the
 * stored total again.
 */
( function () {
	'use strict';

	const L10N = window.d5qcL10n || {};
	const NBSP = ' ';

	/** Replaces %s, %d and %1$s placeholders, like sprintf for the strings we use. */
	function format( template, ...values ) {
		let index = 0;

		return String( template || '' ).replace( /%(?:(\d+)\$)?[sd]/g, ( match, position ) => {
			const value = position ? values[ position - 1 ] : values[ index++ ];

			return undefined === value ? '' : String( value );
		} );
	}

	/** Rounds half away from zero, as PHP's round() does. */
	function round( value ) {
		return Math.sign( value ) * Math.round( Math.abs( value ) );
	}

	function cents( amount ) {
		return round( Number( amount ) * 100 );
	}

	/** Formats cents the French way: 1 234,50 €. */
	function money( value, settings ) {
		const decimals = 0 === Number( settings.decimals ) ? 0 : 2;
		const fixed = ( Math.abs( value ) / 100 ).toFixed( decimals );
		const parts = fixed.split( '.' );
		const integer = parts[ 0 ].replace( /\B(?=(\d{3})+(?!\d))/g, NBSP );
		const sign = value < 0 && Number( fixed ) !== 0 ? '-' : '';
		const number = sign + integer + ( parts[ 1 ] ? ',' + parts[ 1 ] : '' );

		return 'before' === settings.currency_position ? settings.currency + number : number + NBSP + settings.currency;
	}

	/** Tells whether a condition is met by the answers given so far. */
	function conditionMet( condition, answers ) {
		if ( ! condition ) {
			return true;
		}

		const answer = answers[ condition.question ];

		if ( undefined === answer || null === answer ) {
			return false;
		}

		return [].concat( answer ).some( ( value ) => condition.values.includes( value ) );
	}

	/** Computes the estimate in cents. Mirror of D5QC\Calculator::compute(). */
	function compute( config, answers ) {
		const settings = config.settings;
		let ht = cents( settings.base_price );

		config.steps.forEach( ( step ) => {
			step.questions.forEach( ( question ) => {
				if ( ! question.options || undefined === answers[ question.id ] ) {
					return;
				}

				const selected = [].concat( answers[ question.id ] );

				question.options.forEach( ( option ) => {
					if ( ! selected.includes( option.id ) || 'none' === option.price.type ) {
						return;
					}

					let amount = cents( option.price.amount );

					if ( 'unit' === option.price.type ) {
						const quantity = Number( answers[ option.price.quantity ] );

						amount = round( amount * ( Number.isFinite( quantity ) ? quantity : 0 ) );
					}

					ht += amount;
				} );
			} );
		} );

		ht = Math.max( 0, ht );

		const vat = round( ( ht * settings.vat_rate ) / 100 );

		return { ht, vat, ttc: ht + vat };
	}

	/** Returns the estimate as displayed. Mirror of D5QC\Calculator::display(). */
	function display( estimate, settings ) {
		const range = settings.range_percent / 100;
		const amount = ( total ) =>
			0 === range || 0 === total
				? money( total, settings )
				: format( L10N.range, money( round( total * ( 1 - range ) ), settings ), money( round( total * ( 1 + range ) ), settings ) );

		if ( 'ht' === settings.price_mode ) {
			return format( L10N.ht, amount( estimate.ht ) );
		}

		if ( 'both' === settings.price_mode ) {
			return format( L10N.both, amount( estimate.ht ), amount( estimate.ttc ) );
		}

		return format( L10N.ttc, amount( estimate.ttc ) );
	}

	/** Formats a number for a message: 0,5 rather than 0.5. */
	function number( value ) {
		return String( Number( value ) ).replace( '.', ',' );
	}

	class QuoteForm {
		/**
		 * @param {HTMLElement} root Element carrying the `data-d5qc` attribute.
		 */
		constructor( root ) {
			this.root = root;
			this.config = JSON.parse( root.dataset.config );
			this.form = root.querySelector( '.d5qc-form' );
			this.alert = root.querySelector( '.d5qc-alert' );
			this.total = root.querySelector( '.d5qc-total__amount' );
			this.consent = root.querySelector( '.d5qc-consent' );
			this.prev = root.querySelector( '.d5qc-button--prev' );
			this.next = root.querySelector( '.d5qc-button--next' );
			this.submitButton = root.querySelector( '.d5qc-button--submit' );
			this.success = root.querySelector( '.d5qc-success' );
			this.nonce = root.dataset.nonce || '';
			this.current = 0;
			this.sending = false;
			this.questions = {};

			this.config.steps.forEach( ( step ) => {
				step.questions.forEach( ( question ) => {
					this.questions[ question.id ] = question;
				} );
			} );

			this.form.addEventListener( 'change', () => this.refresh() );
			this.form.addEventListener( 'input', () => this.refresh() );
			this.form.addEventListener( 'submit', ( event ) => {
				event.preventDefault();
				this.send();
			} );
			this.next.addEventListener( 'click', () => this.goNext() );
			this.prev.addEventListener( 'click', () => this.goPrevious() );

			// Enter in a text field moves forward instead of submitting the whole form.
			this.form.addEventListener( 'keydown', ( event ) => {
				if ( 'Enter' === event.key && event.target instanceof HTMLInputElement && 'checkbox' !== event.target.type && 'radio' !== event.target.type ) {
					event.preventDefault();

					if ( ! this.next.hidden ) {
						this.goNext();
					} else {
						this.send();
					}
				}
			} );

			this.refresh();
		}

		stepElement( step ) {
			return this.root.querySelector( '.d5qc-step[data-step="' + step.id + '"]' );
		}

		questionElement( id ) {
			return this.root.querySelector( '[data-question="' + id + '"]' );
		}

		/** Reads the raw answer of one question from its controls. */
		readAnswer( question ) {
			const element = this.questionElement( question.id );

			if ( ! element ) {
				return undefined;
			}

			if ( 'single' === question.type ) {
				const checked = element.querySelector( 'input:checked' );

				return checked ? checked.value : undefined;
			}

			if ( 'multiple' === question.type ) {
				const values = Array.from( element.querySelectorAll( 'input:checked' ) ).map( ( input ) => input.value );

				return values.length ? values : undefined;
			}

			if ( 'contact' === question.type ) {
				const fields = {};

				element.querySelectorAll( '[data-field]' ).forEach( ( input ) => {
					fields[ input.dataset.field ] = input.value.trim();
				} );

				return fields;
			}

			const input = element.querySelector( 'input' );
			const value = input ? input.value.trim() : '';

			return '' === value ? undefined : value;
		}

		/**
		 * Reads the answers of the visible questions, applying the conditions in order.
		 *
		 * @return {{answers: Object, steps: Object[], questions: Object}} Answers, visible steps and visible questions.
		 */
		read() {
			const answers = {};
			const steps = [];
			const visibleQuestions = {};

			this.config.steps.forEach( ( step ) => {
				if ( ! conditionMet( step.condition, answers ) ) {
					return;
				}

				steps.push( step );

				step.questions.forEach( ( question ) => {
					if ( ! conditionMet( question.condition, answers ) ) {
						return;
					}

					visibleQuestions[ question.id ] = true;

					const answer = this.readAnswer( question );

					if ( undefined !== answer ) {
						answers[ question.id ] = answer;
					}
				} );
			} );

			return { answers, steps, questions: visibleQuestions };
		}

		/** Applies the conditions, the step display, the navigation and the estimate. */
		refresh() {
			const state = this.read();

			this.config.steps.forEach( ( step ) => {
				step.questions.forEach( ( question ) => {
					const element = this.questionElement( question.id );

					if ( element ) {
						element.hidden = ! state.questions[ question.id ];
					}
				} );
			} );

			// The current step may have disappeared after an earlier answer changed.
			const ids = state.steps.map( ( step ) => step.id );
			const currentId = this.config.steps[ this.current ] && this.config.steps[ this.current ].id;

			if ( ! ids.includes( currentId ) ) {
				this.current = this.config.steps.findIndex( ( step ) => step.id === ids[ ids.length - 1 ] );
			}

			this.config.steps.forEach( ( step, index ) => {
				this.stepElement( step ).hidden = index !== this.current;
			} );

			const position = ids.indexOf( this.config.steps[ this.current ].id );
			const last = position === ids.length - 1;

			this.prev.hidden = 0 === position;
			this.next.hidden = last;
			this.submitButton.hidden = ! last;
			this.consent.hidden = ! last;
			this.updateProgress( position + 1, ids.length );
			this.updateTotal( state.answers );

			return state;
		}

		updateProgress( current, count ) {
			const track = this.root.querySelector( '.d5qc-progress__track' );
			const text = format( L10N.stepOf, current, count );

			track.setAttribute( 'aria-valuenow', String( current ) );
			track.setAttribute( 'aria-valuemax', String( count ) );
			track.setAttribute( 'aria-valuetext', text );
			track.style.setProperty( '--d5qc-progress', String( count ? current / count : 0 ) );
			this.root.querySelector( '.d5qc-progress__text' ).textContent = text;
		}

		updateTotal( answers ) {
			const text = display( compute( this.config, answers ), this.config.settings );

			if ( this.total && text !== this.total.textContent ) {
				this.total.textContent = text;

				// A short highlight shows that the estimate changed.
				this.total.classList.remove( 'is-updated' );
				void this.total.offsetWidth;
				this.total.classList.add( 'is-updated' );
			}
		}

		/** Validates the visible questions of one step. Mirror of D5QC\Answers. */
		validateStep( step, answers ) {
			const errors = {};

			step.questions.forEach( ( question ) => {
				const element = this.questionElement( question.id );

				if ( ! element || element.hidden ) {
					return;
				}

				const answer = answers[ question.id ];

				if ( 'single' === question.type && question.required && undefined === answer ) {
					errors[ question.id ] = L10N.choose;
				} else if ( 'multiple' === question.type && question.required && undefined === answer ) {
					errors[ question.id ] = L10N.chooseSome;
				} else if ( 'text' === question.type && question.required && undefined === answer ) {
					errors[ question.id ] = L10N.fill;
				} else if ( 'quantity' === question.type ) {
					const error = this.quantityError( question, answer );

					if ( error ) {
						errors[ question.id ] = error;
					}
				} else if ( 'contact' === question.type ) {
					Object.assign( errors, this.contactErrors( question, answer || {} ) );
				}
			} );

			return errors;
		}

		quantityError( question, answer ) {
			if ( undefined === answer ) {
				return question.required ? L10N.number : '';
			}

			const value = Number( String( answer ).replace( ',', '.' ) );

			if ( ! Number.isFinite( value ) ) {
				return L10N.number;
			}

			if ( value < question.min || value > question.max ) {
				return format( L10N.between, number( question.min ), number( question.max ) );
			}

			const steps = ( value - question.min ) / question.step;

			return Math.abs( steps - Math.round( steps ) ) > 1e-6 ? format( L10N.multiple, number( question.step ) ) : '';
		}

		contactErrors( question, values ) {
			const errors = {};
			const patterns = {
				email: [ /^[^\s@]+@[^\s@]+\.[^\s@]+$/, L10N.email ],
				phone: [ /^[0-9 +().-]{6,20}$/, L10N.phone ],
				postcode: [ /^[A-Za-z0-9 -]{3,10}$/, L10N.postcode ],
			};

			Object.keys( question.fields ).forEach( ( field ) => {
				const rules = question.fields[ field ];
				const value = values[ field ] || '';
				const key = question.id + '.' + field;

				if ( ! rules.enabled ) {
					return;
				}

				if ( '' === value && rules.required ) {
					errors[ key ] = L10N.fill;
				} else if ( '' !== value && patterns[ field ] && ! patterns[ field ][ 0 ].test( value ) ) {
					errors[ key ] = patterns[ field ][ 1 ];
				}
			} );

			return errors;
		}

		/** Shows the errors of the current step, or clears them. */
		showErrors( errors, scope ) {
			( scope || this.root ).querySelectorAll( '.d5qc-error' ).forEach( ( element ) => {
				const message = errors[ element.dataset.errorFor ] || '';

				element.textContent = message;
				element.hidden = '' === message;
			} );

			( scope || this.root ).querySelectorAll( '.d5qc-question, .d5qc-field, .d5qc-consent' ).forEach( ( element ) => {
				const key = element.classList.contains( 'd5qc-field' )
					? element.querySelector( '[data-field]' ).name.replace( /\[(\w+)\]$/, '.$1' )
					: element.dataset.question || 'consent';
				const invalid = Boolean( errors[ key ] );

				element.classList.toggle( 'has-error', invalid );
				element.querySelectorAll( 'input, textarea' ).forEach( ( input ) => {
					if ( 'hidden' !== input.type && ! input.closest( '.d5qc-hp' ) ) {
						input.setAttribute( 'aria-invalid', invalid ? 'true' : 'false' );
					}
				} );
			} );

			this.alert.classList.remove( 'is-status' );
			this.alert.textContent = Object.keys( errors ).length ? L10N.fix : '';
		}

		/** Moves focus to the first field in error. */
		focusFirstError() {
			const error = this.root.querySelector( '.d5qc-error:not([hidden])' );
			const container = error && error.closest( '.d5qc-field, .d5qc-question, .d5qc-consent' );
			const input = container && container.querySelector( 'input:not([tabindex="-1"]), textarea' );

			if ( input ) {
				input.focus();
			}
		}

		showStep( index ) {
			this.current = index;
			this.refresh();

			const title = this.stepElement( this.config.steps[ index ] ).querySelector( '.d5qc-step__title' );

			if ( title ) {
				title.focus();
			}
		}

		goNext() {
			const state = this.refresh();
			const step = this.config.steps[ this.current ];
			const errors = this.validateStep( step, state.answers );

			this.showErrors( errors, this.stepElement( step ) );

			if ( Object.keys( errors ).length ) {
				this.focusFirstError();
				return;
			}

			const position = state.steps.indexOf( step );
			const following = state.steps[ position + 1 ];

			if ( following ) {
				this.showStep( this.config.steps.indexOf( following ) );
			}
		}

		goPrevious() {
			const state = this.read();
			const position = state.steps.indexOf( this.config.steps[ this.current ] );

			if ( position > 0 ) {
				this.showErrors( {}, this.stepElement( this.config.steps[ this.current ] ) );
				this.showStep( this.config.steps.indexOf( state.steps[ position - 1 ] ) );
			}
		}

		async send() {
			if ( this.sending ) {
				return;
			}

			const state = this.refresh();
			const step = this.config.steps[ this.current ];
			const errors = this.validateStep( step, state.answers );
			const consent = this.root.querySelector( '.d5qc-consent__input' );

			if ( ! consent.checked ) {
				errors.consent = L10N.consent;
			}

			this.showErrors( errors, this.form );

			if ( Object.keys( errors ).length ) {
				this.focusFirstError();
				return;
			}

			this.sending = true;
			this.submitButton.disabled = true;
			this.alert.textContent = L10N.sending;
			this.alert.classList.add( 'is-status' );

			const payload = {
				form: Number( this.root.dataset.form ),
				token: this.root.dataset.token,
				answers: state.answers,
				consent: true,
				website: this.root.querySelector( '.d5qc-hp input' ).value,
			};

			try {
				const response = await this.request( payload );
				const data = await response.json().catch( () => ( {} ) );

				if ( response.ok && data.success ) {
					this.done( data );
					return;
				}

				this.serverErrors( data );
			} catch ( error ) {
				this.alert.classList.remove( 'is-status' );
				this.alert.textContent = L10N.failed;
			}

			this.sending = false;
			this.submitButton.disabled = false;
		}

		async request( payload ) {
			const options = {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify( payload ),
			};

			if ( this.nonce ) {
				const response = await fetch( this.root.dataset.endpoint, { ...options, headers: { ...options.headers, 'X-WP-Nonce': this.nonce } } );

				// A cached page can carry an expired nonce. The endpoint is public, so retry without it.
				if ( 403 !== response.status ) {
					return response;
				}

				this.nonce = '';
			}

			return fetch( this.root.dataset.endpoint, { ...options, credentials: 'omit' } );
		}

		/** Shows the errors returned by the server, on the step that holds the first one. */
		serverErrors( data ) {
			const fields = ( data && data.data && data.data.fields ) || {};
			const keys = Object.keys( fields );

			this.alert.classList.remove( 'is-status' );

			if ( ! keys.length ) {
				this.alert.textContent = ( data && data.message ) || L10N.failed;
				return;
			}

			const first = keys[ 0 ].split( '.' )[ 0 ];
			const index = 'consent' === first ? -1 : this.config.steps.findIndex( ( step ) => step.questions.some( ( question ) => question.id === first ) );

			if ( index >= 0 && index !== this.current ) {
				this.current = index;
				this.refresh();
			}

			this.showErrors( fields, this.form );
			this.alert.textContent = data.message || L10N.fix;
			this.focusFirstError();
		}

		done( data ) {
			this.form.hidden = true;
			this.success.querySelector( '.d5qc-success__message' ).textContent = data.message || '';
			this.success.querySelector( '.d5qc-success__estimate' ).textContent = data.estimate ? format( L10N.finalEstimate, data.estimate ) : '';
			this.success.hidden = false;
			this.success.focus();

			this.root.dispatchEvent( new CustomEvent( 'd5qc:sent', { bubbles: true } ) );
		}
	}

	/**
	 * Starts every quote form found under a node that is not started yet.
	 *
	 * @param {ParentNode} [context]
	 */
	function init( context ) {
		( context || document ).querySelectorAll( '[data-d5qc]:not([data-d5qc-ready])' ).forEach( ( root ) => {
			// The Visual Builder preview is static.
			if ( root.closest( '[data-d5qc-preview]' ) || ! root.querySelector( '.d5qc-form' ) ) {
				return;
			}

			root.setAttribute( 'data-d5qc-ready', '' );
			new QuoteForm( root );
		} );
	}

	window.d5qc = { init, compute, display, money };

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => init() );
	} else {
		init();
	}
} )();
