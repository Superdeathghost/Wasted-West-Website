
/*
 * Landing graphical interface / control script.
 *
 * (c) Daniel Moylan 2021
 */

"use strict";

// Need to execute this on the window load, so it's in a function.

const fn = ( __bk_image, __mid_image, __fg_image ) => {
	
	// Revert to webgl1 and it works fine.
	
	const canvas = document.getElementById( "screen" );
	const gl = ( () => {
		let ret = canvas.getContext( 'webgl' );
		if ( ret === undefined )	// fallback
			ret = canvas.getContext( 'experimental-webgl' );
		return ret;
	} )();
	
	if ( canvas === undefined ) console.err( "Your browser does not support Canvas." );
	if ( gl === undefined ) console.err( "Your browser does not suppport WebGL." );
	console.log( gl.getParameter( gl.VERSION ) );
	
	let cw = canvas.clientWidth / 2, ch = canvas.clientHeight / 2;
	
	// Global mouse coord and timing variables.
	let tPrev = 0, tDelta = 0, mx = -1, my = -1;

	// To hold the requestAnimationFrame so we can stop it.
	let animFrame = null;

	const gl_tex_us = [
		gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2, gl.TEXTURE3, gl.TEXTURE4, gl.TEXTURE5, gl.TEXTURE6, gl.TEXTURE7
	];

	// This resizes the gl viewport, sets the color to all zeros, and enables blending so we can use opacity in an intuitive sense.
	
	gl.viewport( 0, 0, canvas.clientWidth, canvas.clientHeight );
	gl.clearColor( 0.0, 0.0, 0.0, 0.0 );
	gl.clearDepth( 1.0 );											// Clear everything
	gl.enable( gl.BLEND );											// Enable bLENDING
	gl.disable( gl.DEPTH_TEST );
	gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );

	// Simple helper function to compiler a shader.
	const compile_shader = ( src, type ) => {
		
		const ret = gl.createShader( type );
		
		gl.shaderSource( ret, src );
		gl.compileShader( ret );

		return ret;
	};

	// Simple helper function to compile a program.
	
	const create_program = ( vss, fss ) => {
		
		const ret = gl.createProgram();

		// Calls compile_shader for the two shaders
		{
			const vs = compile_shader( vss, gl.VERTEX_SHADER );
			const fs = compile_shader( fss, gl.FRAGMENT_SHADER );

			gl.attachShader( ret, vs );
			gl.attachShader( ret, fs );
		}

		gl.linkProgram( ret );
		return ret;
 			console.error( "a program did not link: " + gl.getProgramInfoLog( ret ) );
	};

	const fbs = {
		"fb1" : gl.createFramebuffer(), "tx1" : gl.createTexture(),
		"fb2" : gl.createFramebuffer(), "tx2" : gl.createTexture()
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
		} 
		else {
			const new_h = this.height * cwr;
			this.scale_x = 1;
			this.scale_y = ( new_h - canvas.clientHeight ) / new_h / 2;
			l_s = 0 + this.extra_scale;
			b_s = this.scale_y;
			r_s = 1 - this.extra_scale;
			t_s = 1 - this.scale_y;
		}

		console.log( l_s + ", " + b_s + ", " + r_s + ", " + t_s );

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


	const bkgd = new Layer( __bk_image, 0.02, 2, 4, null, 0.9 );

	const animate = ( tNow ) => {
		tDelta = tNow - tPrev;

		gl.bindFramebuffer( gl.FRAMEBUFFER, null );
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb1 );
		gl.clear( gl.COLOR_BUFFER_BIT );
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb2 );
		gl.clear( gl.COLOR_BUFFER_BIT );


		bkgd.update();
		bkgd.render();

		window.onmousemove = mousemove;
		animFrame = requestAnimationFrame( animate );
		tPrev = tNow;
	};

	/*
	 * Events
	 */

	// Resize resizes the canvas and GL buffer, along with calling various functions for resizing the different components.
	
	const resize = () => {
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		cw = canvas.clientWidth / 2;
		ch = canvas.clientHeight / 2;

		gl.bindFramebuffer( gl.FRAMEBUFFER, null );
		gl.viewport( 0, 0, canvas.clientWidth, canvas.clientHeight );
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

		size_fbs();
		bkgd.scale();

	};

	const mousemove = ( e ) => {
		mx = -e.clientX / cw + 1;
		my = -e.clientY / ch + 1;
		window.onmousemove = null;
	};

	const mouseout = () => {
		mx = 0;
		my = 0;
		window.onmousemove = null;
	};

	const leavepage = ( e ) => {
		cancelAnimationFrame( animFrame );
		mouseout();
		bkgd.reset();
	};


	resize();
	window.onresize = resize;
	window.onbeforeunload = leavepage;
	window.pagehide = leavepage;
	window.addEventListener( 'visibilitychange', ( e ) => { if ( document.visibilityState === 'hidden' ) leavepage( e ); else animFrame = requestAnimationFrame( animate ); } );

	tPrev = performance.now();
	animFrame = requestAnimationFrame( animate );

	// Fade in
	{
		let content = document.getElementById( "content" );
		content.style.opacity = 1;
	}

	{	// Menu navigation
		const page_links = document.getElementsByClassName( "menu-link" );
		const pages = document.getElementsByClassName( "page-container" );
		const home = document.getElementById( "link-home" );
		const e_fn = ( e ) => {  };

		const nav_out = ( page ) => {
			console.log( page );
			console.log( page_links[ 3 ].onclick );
			if ( page.id === 'page-cast' && page_links[ 3 ].onclick !== undefined && page_links[ 3 ].onclick !== null ) {
				const scope = page_links[ 3 ].onclick.bind( page_links[ 3 ] );
				console.log( scope );
				setTimeout( () => scope(), 220 );
			}

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
			console.log( p_old );
			console.log( page_links[ 3 ].onclick );
			if ( p_old.id === 'page-cast' && page_links[ 3 ].onclick !== undefined && page_links[ 3 ].onclick !== null ) {
				const scope = page_links[ 3 ].onclick.bind( page_links[ 3 ] );
				console.log( scope );
				setTimeout( () => scope(), 220 );
			}

			if ( page === p_old ) return;

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
};

{
	// Initial image loading
	const bk_image = new Image(), mid_image = new Image(), fg_image = new Image();

	let bk_load = false, mid_load = true, fg_load = true, window_load = false;

	window.onload = () => { window_load = true; if ( bk_load && mid_load && fg_load ) { fn( bk_image, mid_image, fg_image ); } console.log( "window" ); };
	
	bk_image.onload = () => { bk_load = true; if ( window_load && mid_load && fg_load ) { fn( bk_image, mid_image, fg_image ); } console.log( "bk" ); };

	bk_image.crossOrigin = 'anonymous';

	let pref = "../Assets/";

	bk_image.src  = pref + "test/bkgd.jpg";

}
