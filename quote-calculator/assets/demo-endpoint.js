/**
 * Demo only: stands in for the WordPress REST API of the plugin.
 *
 * On a WordPress site, the request goes to /wp-json/d5qc/v1/submit, which checks
 * every answer, computes the price again, stores the request and e-mails it.
 * Here nothing is sent: this script answers with the same data format.
 */
( function () {
	'use strict';

	// Strings the plugin passes to its script through WordPress.
	window.d5qcL10n = {
		stepOf: 'Step %1$d of %2$d',
		range: '%1$s to %2$s',
		ht: '%s excl. VAT',
		ttc: '%s incl. VAT',
		both: '%1$s excl. VAT, %2$s incl. VAT',
		choose: 'Please choose an answer.',
		chooseSome: 'Please choose at least one answer.',
		fill: 'Please fill in this field.',
		number: 'Please enter a number.',
		between: 'Please enter a number between %1$s and %2$s.',
		multiple: 'Please enter a multiple of %s.',
		email: 'Please enter a valid e-mail address.',
		phone: 'Please enter a valid phone number.',
		postcode: 'Please enter a valid postcode.',
		consent: 'Please accept the processing of your data to send your request.',
		fix: 'Some answers need your attention.',
		sending: 'Sending…',
		failed: 'Your request could not be sent. Please check your connection and try again.',
		finalEstimate: 'Estimate: %s',
	};

	const realFetch = window.fetch.bind( window );

	window.fetch = function ( url, options ) {
		if ( 'demo:submit' !== url ) {
			return realFetch( url, options );
		}

		const body = JSON.parse( ( options && options.body ) || '{}' );
		const root = document.querySelector( '[data-d5qc]' );
		const config = JSON.parse( root.dataset.config );
		const estimate = window.d5qc.display( window.d5qc.compute( config, body.answers || {} ), config.settings );
		const data = {
			success: true,
			message: 'Your request has been sent. We will get back to you soon. (Demo: nothing was sent.)',
			estimate,
		};

		return new Promise( ( resolve ) => {
			setTimeout( () => resolve( new Response( JSON.stringify( data ), { status: 200, headers: { 'Content-Type': 'application/json' } } ) ), 600 );
		} );
	};
} )();
