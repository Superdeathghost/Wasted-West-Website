/*
 * Landing graphical interface / control script.
 *
 * (c) Daniel Moylan 2022
 */

"use strict";

// modified from Fabian von Ellerts, https://stackoverflow.com/questions/10787782/full-height-of-a-html-element-div-including-border-padding-and-margin
function outerHeight ( element ) {
    const height = element.offsetHeight,
		  style  = window.getComputedStyle( element );

    return [ 'Top', 'Bottom' ]
        .map( side => parseInt( style[ 'margin' + side ] ) )
        .reduce( ( total, side ) => total + side, height );
}

const is_undef = ( c ) => c === undefined || c === null;

// mini touch event framework
const touchy = new ( function () {
	let cur_touch = undefined;
	this.mt_ev_start = ( elm, cb ) => {
		elm.onmousedown = cb;
		elm.ontouchstart = !is_undef( cb ) ? ( ( e ) => {
			if ( is_undef( cur_touch ) ) {
				cur_touch = e.changedTouches[ 0 ];
				cb( cur_touch );
			}
		} ) : cb;
	};
	this.mt_ev_move = ( elm, cb ) => {
		elm.onmousemove = cb;
		elm.ontouchmove = !is_undef( cb ) ? ( ( e ) => {
			if ( !is_undef( cur_touch ) && cur_touch.identifier === e.changedTouches[ 0 ].identifier ) {
				cur_touch = e.changedTouches[ 0 ];
				cb( cur_touch );
			}
		} ) : cb;
	};
	const lev_end_fn = ( cb ) => {
		return ( !is_undef( cb ) ? ( ( e ) => {
			if ( !is_undef( cur_touch ) && cur_touch.identifier === e.changedTouches[ 0 ].identifier ) {
				cb( cur_touch );
				cur_touch = undefined;
			}
		} ) : cb );
	};
	this.mt_ev_end = ( elm, cb ) => {
		elm.onmouseup = cb;
		elm.ontouchend = lev_end_fn( cb );
	};
	this.mt_ev_leave = ( elm, cb ) => {
		elm.onmouseleave = cb;
		elm.ontouchcancel = lev_end_fn( cb );
	};
} )();

Math.clamp = !is_undef( Math.clamp ) ? Math.clamp : ( x, y, z ) => Math.max( Math.min( x, z ), y );

const __mailfn_init = () => {
	const _name = document.querySelector( '#contact-form input[name="Name"]' );
	const _email = document.querySelector( '#contact-form input[name="Email"]' );
	const _phone = document.querySelector( '#contact-form input[name="Phone"]' );
	const _content = document.querySelector( '#contact-form textarea' );
	const output = document.querySelector( '#page-contact p' );
	const original_text = output.innerHTML;

	const this_fn = () => {
		let errors = "";
		const name = _name.value;
		const email = _email.value;
		const phone = _phone.value;
		const content = _content.value;

	// 	https://stackoverflow.com/questions/3968500/regex-to-validate-a-message-id-as-per-rfc2822
		if ( !email.match( /^((([a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*)|(\"(([\x01-\x08\x0B\x0C\x0E-\x1F\x7F]|[\x21\x23-\x5B\x5D-\x7E])|(\\[\x01-\x09\x0B\x0C\x0E-\x7F]))*\"))@(([a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*)|(\[(([\x01-\x08\x0B\x0C\x0E-\x1F\x7F]|[\x21-\x5A\x5E-\x7E])|(\\[\x01-\x09\x0B\x0C\x0E-\x7F]))*\])))$/ ) )
			errors += "<li>Please enter a valid (RFC2822 Compliant) email.</li><li style=\"margin-left:1.3em;list-style-type:circle;\" >\
			If you don't know what that is, just only use ascii letters, numbers, '@', and '.' in your email.</li>";
		if ( !name.match( /^[\w\u00C0-\uFFFF'\-\s]+$/u ) )
			errors += "<li>Please enter a valid name (unicode is accepted).</li>";
		if ( !phone.match( /^((\+\d)?((\(\d{3}\))|(\d{3}))[-\s\.]?\d{3}[-\s\.]?\d{4,6})|()$/ ) )
			errors += "<li>Please enter a valid phone number.</li>";

		if ( !errors ) {
			content.replace( "\n", "%0A" );
			content.replace( " ", "%0A" );
			content.replace( "\t", "%09" );
			content.replace( "&", "%26" );
			content.replace( "%", "%25" );
			content.replace( "?", "%3F" );
			content.replace( "=", "%3D" );
			email.replace( "&", "%26" );
			email.replace( "%", "%25" );
			email.replace( "?", "%3F" );
			email.replace( "=", "%3D" );

			window.open( 'https://mail.google.com/mail/u/0/?ui=2&tf=cm&fs=1&to=therealwastedwest@gmail.com&su=Fan%20Email&body=Name:%20'
							+ name + '%0AEmail:%20' + email + (phone ? '%0APhone:%20' : '') + (phone ? phone : '') + "%0A%0A" + content, "_blank" );
			output.innerHTML = original_text;
			return true;
		} else {
			output.innerHTML = "There are errors in your form:<br /><ul>" + errors + "</ul>";
			return false;
		}
	}

	return this_fn;
};
var mailfn;

// Need to execute this on the window load, so it's in a function.
const fn = ( __bk_image, __mid_image, __fg_image ) => {
	// deal with it
	mailfn = __mailfn_init();

	// Getting variables. For now it's webgl2, but honestly I don't need webgl2, so I might just revert it to webgl1.
	// Edit: I did revert to webgl1 and it works fine.
	const canvas = document.getElementById( "screen" );
	const gl = ( () => {
		let ret = canvas.getContext( 'webgl' );
		if ( is_undef( ret ) )	// fallback
			ret = canvas.getContext( 'experimental-webgl' );
		return ret;
	} )();

	if ( is_undef( canvas ) ) console.err( "Your browser does not support Canvas." );
	if ( is_undef( gl ) ) console.err( "Your browser does not suppport WebGL." );
	// console.log( gl.getParameter( gl.VERSION ) );

	let cw = canvas.clientWidth / 2;
	let ch = canvas.clientHeight / 2;

	// global mouse coord and timing variables.
	let tPrev = 0;
	let tDelta = 0;
	let mx = -1;
	let my = -1;

	// To hold the requestAnimationFrame so we can stop it.
	let animFrame = null;

	const gl_tex_us = [
		gl.TEXTURE0,
		gl.TEXTURE1,
		gl.TEXTURE2,
		gl.TEXTURE3,
		gl.TEXTURE4,
		gl.TEXTURE5,
		gl.TEXTURE6,
		gl.TEXTURE7
	];

	// This resizes the gl viewport, sets the color to all zeros, and enables blending so we can use opacity in an intuitive sense.
	gl.viewport( 0, 0, canvas.clientWidth, canvas.clientHeight );
	gl.clearColor( 0.0, 0.0, 0.0, 0.0 );
	gl.clearDepth( 1.0 );					// Clear everything
	gl.enable( gl.BLEND );					// Enable bLENDING
	gl.disable( gl.DEPTH_TEST );
	gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );

	// Simple helper function to compiler a shader.
	const compile_shader = ( src, type ) => {
		const ret = gl.createShader( type );
		gl.shaderSource( ret, src );
		gl.compileShader( ret );

		return ret;
// 		if ( gl.getShaderParameter( ret, gl.COMPILE_STATUS ) )
// 			return ret;
// 		else {
// 			The error message outputs the type of shader or undefined, this works for my purposes even though I miss others like the geometry shader.
// 			const typStr = type === gl.VERTEX_SHADER ? "vertex shader" : ( type === gl.FRAGMENT_SHADER ?
// 					"fragment shader" : "undefined shader" );
// 			console.error( "a(n) " + typStr + " shader did not compile: " + gl.getShaderInfoLog( ret ) );
// 		}
	};

	// Simple helper function to compiler a program.
	const create_program = ( vss, fss ) => {
		const ret = gl.createProgram();

		// calls compile_shader for the two shaders
		{
			const vs = compile_shader( vss, gl.VERTEX_SHADER );
			const fs = compile_shader( fss, gl.FRAGMENT_SHADER );

			gl.attachShader( ret, vs );
			gl.attachShader( ret, fs );
		}

		gl.linkProgram( ret );
		return ret;
// 		if ( gl.getProgramParameter( ret, gl.LINK_STATUS ) )
// 			return ret;
// 		else
// 			console.error( "a program did not link: " + gl.getProgramInfoLog( ret ) );
	};

	// The first framebuffer stores the circles which are then rendered on the background.
	// The second framebuffer then store the rendered image and does postprocessing effects on it,
	// but I haven't gotten to that yet.
	const fbs = {
		"fb1" : gl.createFramebuffer(),
		"tx1" : gl.createTexture(),
		"fb2" : gl.createFramebuffer(),
		"tx2" : gl.createTexture()
	};

	// Set up for the framebuffers
	const size_fbs = () => {
		// Create texture 1
		gl.activeTexture( gl.TEXTURE3 );
		gl.bindTexture( gl.TEXTURE_2D, fbs.tx1 );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, canvas.clientWidth, canvas.clientHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );
		// Linear is the best filter
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
		// Bind texture to fb1
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb1 );
		gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbs.tx1, 0 );
		// Create texture 2
		gl.activeTexture( gl.TEXTURE4 );
		gl.bindTexture( gl.TEXTURE_2D, fbs.tx2 );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, canvas.clientWidth, canvas.clientHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
		// Bind texture to fb2
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb2 );
		gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbs.tx2, 0 );
	}

	const Layer = function ( image, extra_scale, bk_tex_u, fg_tex_u, out_fb, v_mult ) {
		this.bk_tex_u = bk_tex_u;
		this.fg_tex_u = fg_tex_u;
		this.fb = out_fb;
		this.bk_arr = null;

		// Create the program and get prog vars
		this.program = create_program( Layer.vs, Layer.fs );
		gl.useProgram( this.program );

		this.Abk = gl.getAttribLocation( this.program, "AtexBk" );
		this.Ubk = gl.getUniformLocation( this.program, "UtexBk" );
		this.Afg = gl.getAttribLocation( this.program, "AtexFg" );
		this.Ufg = gl.getUniformLocation( this.program, "UtexFg" );
		this.Uug = gl.getUniformLocation( this.program, "UuseFg" );

		// Create vertex buffers
		this.bk_buf = gl.createBuffer();
		this.fg_buf = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, this.bk_buf );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array([0,0,0,0,0,0,0,0]), gl.DYNAMIC_DRAW );
		gl.bindBuffer( gl.ARRAY_BUFFER, this.fg_buf );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array([1,-1,1,1,-1,-1,-1,1]), gl.STATIC_DRAW );

		// Set foreground and background textures, if we don't have a fg Uug lets us know
		gl.uniform1i( this.Ubk, this.bk_tex_u );
		if ( this.fg_tex_u == -1 )
			gl.uniform1i( this.Uug, false );
		else {
			gl.uniform1i( this.Uug, true );
			gl.uniform1i( this.Ufg, this.fg_tex_u );
		}

		// Create the background texture for our image (fg is a framebuffer, if provided).
		gl.activeTexture( gl_tex_us[ bk_tex_u ] )
		this.tex_bk = gl.createTexture();
		gl.bindTexture( gl.TEXTURE_2D, this.tex_bk );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

		// Width
		this.width = image.width;
		this.height = image.height;
		// Percentage of the shown image to parallax scroll
		this.extra_scale = extra_scale;
		this.v_multx = 0.0005 * v_mult * this.extra_scale;
		this.v_multy = this.v_multx * image.height / image.width;
		this.x = 0;
		this.y = 0;
	};

	Layer.vs = `
		attribute vec2 AtexBk;
		varying vec2 VtexBk;
		attribute vec2 AtexFg;
		varying vec2 VtexFg;

		void main () {
			// I noted that Apos equaled AtexFg, so AtexFg has replaced it.
			gl_Position = vec4( AtexFg, 0., 1. );
			// But not quite
			vec2 vbuf = vec2( max( AtexFg.x, 0. ), max( AtexFg.y, 0. ) );
			VtexBk = AtexBk;
			VtexFg = vbuf;
		}
	`;

	Layer.fs = `
		precision mediump float;
		uniform sampler2D UtexBk;
		varying vec2 VtexBk;
		uniform sampler2D UtexFg;
		varying vec2 VtexFg;

		uniform bool UuseFg;

		vec4 accurate_mix ( vec4 bk, vec4 fg ) {
			float alpha = 1.0 - fg.a;

			// Gamma correction of 2, close enough to 2.2 or whatever the ideal ratio is.
			vec3 color = sqrt( fg.rgb * fg.rgb + bk.rgb * bk.rgb * alpha );

			float out_alpha = fg.a + bk.a * alpha;
			return vec4( color, out_alpha );
		}

		void main () {
			vec4 final_color;
			if ( UuseFg )
				final_color = accurate_mix( texture2D( UtexBk, VtexBk ), texture2D( UtexFg, VtexFg ) );
			else
				final_color = texture2D( UtexBk, VtexBk );
			gl_FragColor = final_color;
		}
	`;

	Layer.prototype.update = function () {
		gl.useProgram( this.program );

		let velx = this.v_multx * ( mx - this.x / this.scale_x );
		let vely = this.v_multy * ( my - this.y / this.scale_y );

		this.x += velx * tDelta;
		this.y += vely * tDelta;

		const new_arr = this.bk_arr.map( ( elm, ind ) => { return elm + ( ind % 2 === 0 ? this.x : this.y ) } );
		gl.bindBuffer( gl.ARRAY_BUFFER, this.bk_buf );
		gl.bufferSubData( gl.ARRAY_BUFFER, 0, new_arr, 0, 8 );
	}

	Layer.prototype.scale = function () {
		// Scaling the image to the width of the screen.
		const sf = 1 + 2 * this.extra_scale;
		const cwr = canvas.clientWidth / this.width * sf;
		const chr = canvas.clientHeight / this.height * sf;
		let l_s;
		let b_s;
		let r_s;
		let t_s;

		if ( cwr < chr ) {
			const new_w = this.width * chr;
			this.scale_x = ( new_w - canvas.clientWidth ) / new_w / 2;
			this.scale_y = 1;
			l_s = this.scale_x;
			b_s = 0 + this.extra_scale;
			r_s = 1 - this.scale_x;
			t_s = 1 - this.extra_scale;
		} else {
			const new_h = this.height * cwr;
			this.scale_x = 1;
			this.scale_y = ( new_h - canvas.clientHeight ) / new_h / 2;
			l_s = 0 + this.extra_scale;
			b_s = this.scale_y;
			r_s = 1 - this.extra_scale;
			t_s = 1 - this.scale_y;
		}

		// console.log( l_s + ", " + b_s + ", " + r_s + ", " + t_s );

		this.bk_arr = new Float32Array( [
			r_s, t_s,
			r_s, b_s,
			l_s, t_s,
			l_s, b_s,
		] );

		this.scale_x *= this.extra_scale;
		this.scale_y *= this.extra_scale;
	}

	Layer.prototype.render = function () {
		gl.useProgram( this.program );

		gl.enableVertexAttribArray( this.Abk );
		gl.enableVertexAttribArray( this.Afg );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.bk_buf );
		gl.vertexAttribPointer( this.Abk, 2, gl.FLOAT, false, 0, 0 );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.fg_buf );
		gl.vertexAttribPointer( this.Afg, 2, gl.FLOAT, false, 0, 0 );

		gl.bindFramebuffer( gl.FRAMEBUFFER, this.fb );

		gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

		gl.disableVertexAttribArray( this.Abk );
		gl.disableVertexAttribArray( this.Afg );
	}

	Layer.prototype.reset = function () {
		this.x = 0;
		this.y = 0;
	}

// 	const fg = new Layer( __fg_image, 0.08, 0, -1, fbs.fb1, 0.9 );	// fbs.fb2 is on 4
// 	const mid = new Layer( __mid_image, 0.04, 1, 3, fbs.fb2, 0.9 );	// fbs.fb1 is on 3
// 	const bkgd = new Layer( __bk_image, 0.02, 2, 4, null, 0.9 );
	const bkgd = new Layer( __bk_image, 0.02, 0, -1, null, 0.9 );

	const mousemove = ( e ) => {
		mx = -e.clientX / cw + 1;
		my = -e.clientY / ch + 1;
// 		touchy.mt_ev_move( window, null );
	};

	const mouseout = () => {
		mx = 0;
		my = 0;
		touchy.mt_ev_move( window, null );
	};

	const animate = ( tNow ) => {
		tDelta = tNow - tPrev;

		gl.bindFramebuffer( gl.FRAMEBUFFER, null );
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb1 );
		gl.clear( gl.COLOR_BUFFER_BIT );
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb2 );
		gl.clear( gl.COLOR_BUFFER_BIT );

// 		fg.update();
// 		fg.render();
// 		mid.update();
// 		mid.render();
		bkgd.update();
		bkgd.render();

		touchy.mt_ev_move( window, mousemove );
		animFrame = requestAnimationFrame( animate );
		tPrev = tNow;
	};
	// so the touches get started properly.
	touchy.mt_ev_start( window, e => true );
	touchy.mt_ev_end( window, e => true );
	touchy.mt_ev_leave( window, e => true );

	/*
	 * Events
	 */

	let active_page = undefined;
	const fix_footer = ( nav_h ) => {
		const footer = document.getElementById( 'footer' );
		const base_h = window.innerHeight - footer.clientHeight;
		const ap_h = !is_undef( active_page ) ? ( nav_h + outerHeight( active_page ) ) : 0;
		// console.log( 'bh: ' + base_h + ', ah: ' + ap_h );
		footer.style.top = ( Math.max( base_h, ap_h ) ) + 'px';
	};

	// Resize resizes the canvas and GL buffer, along with calling various functions for resizing the different components.
	const resize = () => {
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		cw = canvas.clientWidth / 2;
		ch = canvas.clientHeight / 2;

		gl.bindFramebuffer( gl.FRAMEBUFFER, null );
		gl.viewport( 0, 0, canvas.clientWidth, canvas.clientHeight );
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

		// Apparently Pale Moon doesn't support CSS min, so we're doing it with JS.
		const nav_height = document.getElementById( 'nav' ).clientHeight;
		document.documentElement.style.setProperty( '--nav-height', nav_height + "px" );

		// resizing car container with right aspect ratio
		const cc = document.getElementsByClassName( 'car-container' )[ 0 ];

		// Look I'm not proud of this but it works :/.
		if ( canvas.clientWidth > 1024 ) {
			const ccheight = Math.max( 0.68 * (canvas.clientHeight - nav_height - 48), 568 );
			const ccwidth = Math.max( 0.7 * canvas.clientWidth, 960 );
			if ( ccwidth < 3/2 * ccheight ) {
				cc.style.width = ccwidth + 'px';
				cc.style.height = (2/3 * ccwidth) + 'px';
				cc.style.fontSize = (ccwidth / 3 / 14) + 'px';
			} else {
				cc.style.width = (3/2 * ccheight) + 'px';
				cc.style.height = ccheight + 'px';
				cc.style.fontSize = (ccheight / 2 / 14) + 'px';
			}
		} else if ( canvas.clientWidth > 660 ) {
			const ccwidth = Math.max( 0.7 * canvas.clientWidth, 600 );
			cc.style.width = ccwidth + 'px';
			cc.style.height = (3/2 * ccwidth) + 'px';
			cc.style.fontSize = (ccwidth / 2 / 14) + 'px';
		} else {
			const ccwidth = Math.min( 0.95*canvas.clientWidth, Math.max( 0.7 * canvas.clientWidth, 300 ) );
			cc.style.width = ccwidth + 'px';
			cc.style.height = (6 * ccwidth) + 'px';
			cc.style.fontSize = (ccwidth / 1 / 14) + 'px';
		}

		const audio_cont = document.getElementById( 'audio-cont' );
		if ( audio_cont.style.minHeight != '' ) {
			audio_cont.style.minWidth = '';
			audio_cont.style.width = '';
			audio_cont.style.minHeight = '';
			Array.from( document.getElementsByClassName( 'audio-elms' ) ).forEach( ( e ) => {
				e.style.minWidth = ''; } );
			Array.from( document.getElementsByClassName( 'audio-control' ) ).forEach( ( e ) => {
				e.style.minWidth = ''; e.style.height = ''; } );
		}

		if ( canvas.clientWidth < 360 ) {
			const s1 = canvas.clientWidth + 'px';
			const s2 = ( 0.9 * canvas.clientWidth ) + 'px';
			const s3 = ( 320 * 320 / 0.9 / canvas.clientWidth );
			update_aud_disp( 1 );
			audio_cont.style.width = s1;
			audio_cont.style.minWidth = s1;
			audio_cont.style.minHeight = ( 20 + s3 ) + 'px';
			Array.from( document.getElementsByClassName( 'audio-elms' ) ).forEach( ( e ) => {
				e.style.minWidth = s1; } );
			Array.from( document.getElementsByClassName( 'audio-control' ) ).forEach( ( e ) => {
				e.style.minWidth = s2; e.style.height = s3 + 'px'; } );
		} else if ( canvas.clientWidth < 740 ) {
			update_aud_disp( 1 );
			audio_cont.style.minWidth = 1.1*320 + 'px';
			audio_cont.style.width = audio_cont.style.minWidth;
		} else if ( canvas.clientWidth < 1100 ) {
			update_aud_disp( 2 );
			audio_cont.style.minWidth = 2.2*320 + 'px';
			audio_cont.style.width = audio_cont.style.minWidth;
		} else {
			update_aud_disp( 3 );
			audio_cont.style.minWidth = 3.3*320 + 'px';
			audio_cont.style.width = '';
		}

		for ( let i = 0; i < update_scroll.length; i++ )
			update_scroll[ i ] = true;
		fix_footer( nav_height );

		size_fbs();
		bkgd.scale();
// 		mid.scale();
// 		fg.scale();
	};

	{
		let chromeWarning = document.getElementById( 'chrome-notice' );
		if ( !is_undef( window.chrome ) || window.navigator.userAgent.indexOf( 'Chrome' ) !== -1 ) chromeWarning.style.display = 'none';
	}

	const leavepage = ( e ) => {
		cancelAnimationFrame( animFrame );
		mouseout();
		bkgd.reset();
// 		mid.reset();
// 		fg.reset();
	};

	{	// Menu navigation
		const nav = document.getElementById( 'nav' );
		const page_links = document.getElementsByClassName( "menu-link" );
		const pages = document.getElementsByClassName( "page-container" );
		const home = document.getElementById( "link-home" );
		const e_fn = ( e ) => {  };

		const nav_out = ( page ) => {
			// console.log( page );
			// console.log( page_links[ 3 ].onclick );
			if ( page.id === 'page-cast' && !is_undef(  page_links[ 3 ].onclick ) && page_links[ 3 ].onclick !== null ) {
				const scope = page_links[ 3 ].onclick.bind( page_links[ 3 ] );
				// console.log( scope );
				setTimeout( () => scope(), 220 );
			}

			active_page = undefined;
			setTimeout( () => { fix_footer( nav.clientHeight ); }, 20 );

			page.style.opacity = 0;
			setTimeout( () => { canvas.style.opacity = 1; }, 200 );
			setTimeout( () => { page.style.display = 'none'; }, 300 );

			home.onclick = undefined;
			for ( let i = 0; i < page_links.length; i++ )
				page_links[ i ].onclick = () => undefined;

			setTimeout( () => {
				home.onclick = undefined;
				for ( let i = 0; i < page_links.length; i++ )
					page_links[ i ].onclick = () => nav_in( pages[ i ] );
			}, 300 );
		}

		const nav_in = ( page ) => {
			active_page = page;
			setTimeout( () => { fix_footer( nav.clientHeight ); }, 20 );

			page.style.display = '';
			canvas.style.opacity = 0.2;
			setTimeout( () => { page.style.opacity = 1; }, 200 );

			home.onclick = undefined;
			for ( let i = 0; i < page_links.length; i++ )
				page_links[ i ].onclick = undefined;

			setTimeout( () => {
				home.onclick = () => nav_out( page );
				for ( let i = 0; i < page_links.length; i++ )
					page_links[ i ].onclick = () => inter_page( pages[ i ], page );
			}, 500 );
		};

		const inter_page = ( page, p_old ) => {
			if ( page === p_old ) return;

			// console.log( p_old );
			// console.log( page_links[ 3 ].onclick );
			if ( p_old.id === 'page-cast' && !is_undef(  page_links[ 3 ].onclick ) && page_links[ 3 ].onclick !== null ) {
				const scope = page_links[ 3 ].onclick.bind( page_links[ 3 ] );
				// console.log( scope );
				setTimeout( () => scope(), 220 );
			}

			active_page = page;
			setTimeout( () => { fix_footer( nav.clientHeight ); }, 20 );

			p_old.style.opacity = 0;
			page.style.display = '';
			page.style.position = 'absolute';
			page.style.top = 0;
			setTimeout( () => { p_old.style.display = 'none'; }, 300 );
			setTimeout( () => {
				page.style.position = '';
				page.style.top = '';
				page.style.opacity = 1;
			}, 300 );

			home.onclick = undefined;
			for ( let i = 0; i < page_links.length; i++ )
				page_links[ i ].onclick = undefined;

			setTimeout( () => {
				home.onclick = () => nav_out( page );
				for ( let i = 0; i < page_links.length; i++ )
					page_links[ i ].onclick = () => inter_page( pages[ i ], page );
			}, 600 );
		}

		for ( let i = 0; i < page_links.length; i++ ) {
			pages[ i ].style.display = 'none';
			page_links[ i ].onclick = () => nav_in( pages[ i ] );
		}
	}

	{	// contact focus script
		const contact_inputs = document.getElementsByClassName( "input" );
		for ( let i = 0; i < contact_inputs.length; i++ ) {
			let _input = contact_inputs[ i ].children[ 0 ];
			_input.value = '';
			_input.addEventListener( 'focusin', ( e ) => {
				let input = e.target;
				let span = input.nextSibling;
				if ( span.classList[ 0 ] !== 'contact-fout' )
					span.classList.add( 'contact-fout' );
			} );
			_input.addEventListener( 'focusout', ( e ) => {
				let input = e.target;
				let span = input.nextSibling;
				if ( input.value === '' ) {
					span.classList.remove( 'contact-fout' );
					span.classList.add( 'contact-fin' );
				}
			} );
		}
	}

	{	// carousel / slideshow stuff for cast
		const car_buttons = document.getElementsByClassName( "car-button" );
		const car_divs = document.getElementsByClassName( "car-div" );
		let lnum = 0;

		const nav_to = ( num ) => {
			if ( num === lnum ) return;

			for ( let i = 0; i < car_buttons.length; i++ ) {
				car_buttons[ i ].onclick = undefined;
				setTimeout( () => { car_buttons[ i ].onclick = ( e ) => { nav_to( i ); }; }, 370 );
			}

			car_divs[ lnum ].classList.remove( 'car-div-active' );
			car_divs[ lnum ].classList.add( 'car-div-kill' );
			car_divs[ lnum ].classList.add( 'car-div-disappear' );
			let scope_bubble = () => {
				const ld = car_divs[ lnum ];
				return ( () => { ld.style.display = 'none'; } );
			};
			setTimeout( scope_bubble(), 320 );

			car_divs[ num ].classList.remove( 'car-div-kill' );
			car_divs[ num ].classList.remove( 'car-div-disappearr' );
			car_divs[ num ].classList.remove( 'car-div-disappearl' );
			car_divs[ num ].style.display = 'grid';

			if ( num > lnum ) {
				car_divs[ lnum ].classList.add( 'car-div-disappearl' );
				car_divs[ num ].classList.add( 'car-div-setr' );
			} else {
				car_divs[ lnum ].classList.add( 'car-div-disappearr' );
				car_divs[ num ].classList.add( 'car-div-setl' );
			}

			setTimeout( () => {
				car_divs[ num ].classList.remove( 'car-div-setr' );
				car_divs[ num ].classList.remove( 'car-div-setl' );
				car_divs[ num ].classList.remove( 'car-div-disappear' );
				car_divs[ num ].classList.add( 'car-div-active' );
			}, 20 );

			car_buttons[ lnum ].classList.remove( "car-active" );
			car_buttons[ num ].classList.add( "car-active" );
			lnum = num;
		};

		for ( let i = 0; i < car_buttons.length; i++ ) {
			if ( i > 0 ) {
				car_divs[ i ].classList.add( 'car-div-disappear' );
				car_divs[ i ].classList.add( 'car-div-kill' );
				car_divs[ i ].style.display = 'none';
			} else {
				car_divs[ i ].style.display = 'grid';
			}
			car_buttons[ i ].onclick = ( e ) => { nav_to( i ); };
		}
	}

	{	// fade from carousel to cast member page
		const page = document.getElementById( "page-cast" );
		const cast_lin = document.getElementById( "link-cast" );
		const carousel = document.getElementsByClassName( "car-master" )[ 0 ];
		const car_elms = document.getElementsByClassName( "car-elm" );
		const bio_disp = document.getElementsByClassName( "bio-master" )[ 0 ];
		const bio_elms = document.getElementsByClassName( "bio-elm" );
		const nav = document.getElementById( 'nav' );

		const nav_to = ( num ) => {
			window.location.hash = "#in-bio";

			// console.log( 'hash: '+window.location.hash );

			setTimeout( () => { fix_footer( nav.clientHeight ); }, 320 );

			for ( let i = 0; i < car_elms.length; i++ )
				car_elms[ i ].onclick = undefined;
			cast_lin.onclick = () => {nav_from( num )};

			bio_elms[ num ].style.display = '';
			bio_disp.style.display = '';
			bio_disp.style.position = 'absolute';

			carousel.style.opacity = '0';

			setTimeout( () => {
				carousel.style.display = 'none';
				bio_disp.style.opacity = '1';
				bio_disp.style.position = '';
				window.onhashchange = ( e ) => {
					nav_from( num );
					e.preventDefault();
				};
			}, 300 );
		}

		const nav_from = ( num ) => {
			window.location.hash = "";
			window.onhashchange = undefined;

			setTimeout( () => {
				for ( let i = 0; i < car_elms.length; i++ )
					car_elms[ i ].onclick = () => {nav_to( i );};
			}, 300 );

			setTimeout( () => { fix_footer( nav.clientHeight ); }, 320 );

			cast_lin.onclick = undefined;
			carousel.style.display = '';
			carousel.style.position = 'absolute';

			bio_disp.style.opacity = '0';

			setTimeout( () => {
				carousel.style.position = '';
				carousel.style.opacity = '1';
				bio_disp.style.display = 'none';
				bio_elms[ num ].style.display = 'none';
			}, 300 );
		}

		for ( let i = 0; i < bio_elms.length; i++ )
			bio_elms[ i ].style.display = 'none';
		for ( let i = 0; i < car_elms.length; i++ )
			car_elms[ i ].onclick = () => {nav_to( i );};
		bio_disp.style.display = 'none';
		bio_disp.style.opacity = '0';
	}

	// how many elms to display at one time
	let update_aud_disp = undefined;
	{
		const left_but = document.getElementById( "audio-cont-l" );
		const right_but = document.getElementById( "audio-cont-r" );
		const audio_elms = document.getElementsByClassName( "audio-elms" );
		let cur_elm = 0;
		let aud_disp_elms = 0;

		const nav = ( l_or_r ) => {
			left_but.onclick = undefined; right_but.onclick = undefined;
			setTimeout( () => {
				left_but.onclick = ( e ) => { nav( -1 ); };
				right_but.onclick = ( e ) => { nav( 1 ); };
			}, 240 );
// 			setTimeout( () => { update_scrollers(); }, 420 );

			const new_elm = cur_elm + l_or_r;
			if ( new_elm > audio_elms.length - aud_disp_elms || new_elm < 0 ) return;

			let o_elm;
			let n_elm;
			if ( l_or_r === 1 ) {
				o_elm = cur_elm;
				n_elm = cur_elm + aud_disp_elms;
				for ( let i = o_elm+1; i <= n_elm; i++ )
					update_scroll[ i ] = true;
			} else {
				o_elm = cur_elm + aud_disp_elms - 1;
				n_elm = new_elm;
				for ( let i = n_elm; i < o_elm; i++ )
					update_scroll[ i ] = true;
			}

			// shift all elms to the left or right (except the new one)
			for ( let i = 0; i < n_elm; i++ )
				audio_elms[ i ].style.left = ( ( i - new_elm ) * 100 / aud_disp_elms ) + '%';
			for ( let i = n_elm + 1; i < audio_elms.length; i++ )
				audio_elms[ i ].style.left = ( ( i - new_elm ) * 100 / aud_disp_elms ) + '%';

			// console.log( audio_elms[ n_elm ].style.left );

			// display the new one
			audio_elms[ n_elm ].style.display = '';

			// fade out old elm
			audio_elms[ o_elm ].style.opacity = 0;
			let scope_bubble = () => {
				const ld = audio_elms[ o_elm ];
				return ( () => { ld.style.display = 'none'; } );
			};
			setTimeout( scope_bubble(), 190 );

			// after new one is displayed, set it's properties so the animations play correctly.
			setTimeout( () => {
				audio_elms[ n_elm ].style.opacity = 1;
				audio_elms[ n_elm ].style.left = ( ( n_elm - new_elm ) * 100 / aud_disp_elms ) + '%';
			}, 5 );

			cur_elm = new_elm;
		};

		update_aud_disp = ( elms_disp ) => {
			aud_disp_elms = elms_disp;
			for ( let i = 0; i < audio_elms.length; i++ ) {
				if ( i > cur_elm + aud_disp_elms - 1 ) {
					audio_elms[ i ].style.opacity = 0;
					audio_elms[ i ].style.display = 'none';
				} else {
					audio_elms[ i ].style.opacity = 1;
					audio_elms[ i ].style.display = '';
				}
				audio_elms[ i ].style.left = ( ( i - cur_elm ) * 100 / aud_disp_elms ) + '%';
			}
		};

		update_aud_disp( 3 );
		left_but.onclick = ( e ) => { nav( -1 ); };
		right_but.onclick = ( e ) => { nav( 1 ); };
	}

	// audio ctl
	let update_scroll = [];
	{
		const players = document.getElementsByClassName( "audio-control" );
		const srcs = document.querySelectorAll( 'audio' );
		const pps = document.getElementsByClassName( "aud-pp" );
		const pauses = document.getElementsByClassName( "aud-pause" );
		const plays = document.getElementsByClassName( "aud-play" );
		// position and volume bars
		const bpos = document.getElementsByClassName( "aud-pos" );
		const bvol = document.getElementsByClassName( "aud-vol" );
		// position and volume sliders
		const spos = Array.from( bpos ).map( e => e.children[ 0 ] );
		const svol = Array.from( bvol ).map( e => e.children[ 0 ] );

		const mute_svg = document.getElementsByClassName( "aud-mt-umt" );
		const mute = document.getElementsByClassName( "aud-mute" );
		const unmute = document.getElementsByClassName( "aud-unmute" );

		const bpos_left = new Array( bpos.length ).fill( 0 );
		const bvol_left = new Array( bpos.length ).fill( 0 );
		update_scroll = new Array( bpos.length ).fill( true );
		const get_off = ( pos_vol, i ) => {
			if ( update_scroll[ i ] === true ) {
				const bpos_box = bpos[ i ].getBoundingClientRect();
				const bvol_box = bvol[ i ].getBoundingClientRect();
				bpos_left[ i ] = bpos_box.left;
				bvol_left[ i ] = bvol_box.left;
				update_scroll[ i ] = false;
			}
			return pos_vol ? bvol_left[ i ] : bpos_left[ i ];
		};

		const page_listen = document.getElementById( 'page-listen' );

		const slider_offset = 0;

		const mute_unmute = ( i ) => {
			if ( srcs[ i ].muted === true ) {
				mute[ i ].style.display = 'none';
				unmute[ i ].style.display = '';
				srcs[ i ].muted = false;
			} else {
				mute[ i ].style.display = '';
				unmute[ i ].style.display = 'none';
				srcs[ i ].muted = true;
			}
		}

		const update_time = ( i ) =>
			spos[ i ].style.left = Math.clamp( srcs[ i ].currentTime * bpos[ i ].clientWidth /
											   srcs[ i ].duration, -slider_offset,
											   bpos[ i ].clientWidth - slider_offset ) + 'px';

		const drag_slider_time = ( e, i ) => {
			const slen = Math.clamp( e.clientX - get_off( 0, i ) - slider_offset, -slider_offset, bpos[ i ].offsetWidth - slider_offset );
			// console.log( 'slen: ' + slen );
			// console.log( 'e.clientX: ' + e.clientX );
			srcs[ i ].currentTime = ( slen / bpos[ i ].offsetWidth ) * srcs[ i ].duration;
			slider_stub( spos[ i ], bpos[ i ], slen, i );
			touchy.mt_ev_move( players[ i ], ( e ) => drag_slider_time( e, i ) );
		};
		const drag_slider_vol = ( e, i ) => {
			const slen = Math.clamp( e.clientX - get_off( 1, i ) - slider_offset, -slider_offset, bvol[ i ].offsetWidth- slider_offset );
			srcs[ i ].volume = slen / bvol[ i ].offsetWidth;
			slider_stub( svol[ i ], bvol[ i ], slen, i );
			touchy.mt_ev_move( players[ i ], ( e ) => drag_slider_vol( e, i ) );
		};
		const slider_stub = ( slider, bar, slen, i ) => {
			slider.style.left = slen + 'px';
			touchy.mt_ev_leave( players[ i ], () => drag_cancel( i ) );
			touchy.mt_ev_end( players[ i ], () => drag_cancel( i ) );
		};

		const pp = ( i ) => {
			if ( srcs[ i ].paused ) {
				pauses[ i ].style.display = 'none';
				plays[ i ].style.display = 'block';
				srcs[ i ].play();
			} else {
				pauses[ i ].style.display = 'block';
				plays[ i ].style.display = 'none';
				srcs[ i ].pause();
			}
		};

		const pb_ended = ( i ) => {
			const chs = pps[ i ].children;
			pauses[ i ].style.display = 'block';
			plays[ i ].style.display = 'none';
		};

		const drag_cancel = ( i ) => {
			touchy.mt_ev_move( players[ i ], undefined );
			touchy.mt_ev_leave( players[ i ], undefined );
			touchy.mt_ev_end( players[ i ], undefined );
		};

		for ( let i = 0; i < players.length; i++ ) {
			const perm_i = i;
			touchy.mt_ev_start( bpos[ i ], ( e ) => drag_slider_time( e, i ) );
			touchy.mt_ev_start( bvol[ i ], ( e ) => drag_slider_vol( e, i ) );
			touchy.mt_ev_start( spos[ i ], ( e ) => drag_slider_time( e, i ) );
			touchy.mt_ev_start( svol[ i ], ( e ) => drag_slider_vol( e, i ) );
			mute_svg[ i ].onclick = ( e ) => { mute_unmute( i ) };
			svol[ i ].style.left = 100 + '%';
			pps[ i ].onclick = () => pp( i );
			srcs[ i ].ontimeupdate = () => update_time( i );
			srcs[ i ].onended = () => pb_ended( i );
			plays[ i ].style.display = 'none';
			mute[ i ].style.display = 'none';
		}
	}

	resize();
	window.onresize = resize;
	window.onbeforeunload = leavepage;
	window.pagehide = leavepage;
	window.addEventListener( 'visibilitychange', ( e ) => { if ( document.visibilityState === 'hidden' ) leavepage( e ); else animFrame = requestAnimationFrame( animate ); } );

	tPrev = performance.now();
	animFrame = requestAnimationFrame( animate );

	// fade in
	{
		let content = document.getElementById( "content" );
		content.style.opacity = 1;
	}
};

{
	// initial image loading
	const bk_image = new Image();
	const mid_image = new Image();
	const fg_image = new Image();

	let bk_load = false;
// 	let mid_load = false;
// 	let fg_load = false;
	let mid_load = true;
	let fg_load = true;
	let window_load = false;
	let fn_called = false;

	/*window.onload*/document.onreadystatechange = () => { if ( document.readyState === 'interactive' ) window_load = true; if ( bk_load && mid_load && fg_load && !fn_called ) { fn( bk_image, mid_image, fg_image ); fn_called = true; } /* console.log( "window" ); */ };
	bk_image.onload = () => { bk_load = true; if ( window_load && mid_load && fg_load && !fn_called ) { fn( bk_image, mid_image, fg_image ); fn_called = true; } /* console.log( "bk" ); */ };
// 	mid_image.onload = () => { mid_load = true; if ( bk_load && window_load && fg_load ) { fn( bk_image, mid_image, fg_image ); fn_called = true; console.log( "mid" ); } };
// 	fg_image.onload = () => { fg_load = true; if ( bk_load && mid_load && window_load ) { fn( bk_image, mid_image, fg_image ); fn_called = true; console.log( "fg" ); } };

	bk_image.crossOrigin = 'anonymous';
// 	mid_image.crossOrigin = 'anonymous';
// 	fg_image.crossOrigin = 'anonymous';

	// load all images responsively

	let pref = "../Assets/bkgd/";
	let suff = undefined;
	const s_width = window.screen.width * window.devicePixelRatio;
	const s_height = window.screen.height * window.devicePixelRatio;
	if ( s_width < s_height ) {
		if ( s_width < 720 )
			suff = "vert720p";
		else if ( s_width < 900 )
			suff = "vert900p";
		else if ( s_width < 1080 )
			suff = "vert1080p";
		else
			suff = "vert1440p";
	} else {
		if ( s_height < 720 )
			suff = "720p";
		else if ( s_height < 900 )
			suff = "900p";
		else if ( s_height < 1080 )
			suff = "1080p";
		else if ( s_height < 1440 )
			suff = "1440p";
		else
			suff = "4k";
	}

	bk_image.src  = pref + "bkgd-" + suff + ".jpg";
// 	mid_image.src = pref + "/pen2.png";
// 	fg_image.src = pref + "/pen3.png";
}

