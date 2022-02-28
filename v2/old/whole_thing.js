
/*
 * Landing graphical interface / control script.
 *
 * (c) Daniel Moylan 2021
 */

"use strict";

// Need to execute this on the window load, so it's in a function.
const fn = () => {
	// Getting variables. For now it's webgl2, but honestly I don't need webgl2, so I might just revert it to webgl1.
	const canvas = document.getElementById( "screen" );
	const gl = canvas.getContext( 'webgl2' );
	
	if ( canvas === undefined ) console.err( "Your browser does not support Canvas." );
	if ( gl === undefined ) console.err( "Your browser does not suppport WebGL2 (WebGL1 won't work)." );

	// initial resize before we do anything
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	
	let cw = canvas.width / 2;
	let ch = canvas.height / 2;
	
	// global mouse coord and timing variables.
	let tPrev = 0;
	let tDelta = 0;
	let mx = -1;
	let my = -1;

	// To hold the requestAnimationFrame so we can stop it.
	let animFrame = null;
	
	// This resizes the gl viewport, sets the color to all zeros (white), and enables blending so we can use opacity in an intuitive sense.
	gl.viewport( 0, 0, canvas.width, canvas.height );
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
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, fbs.tx1 );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );
		// Linear is the best filter
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		// Bind texture to fb1
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb1 );
		gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbs.tx1, 0 );
		// Create texture 2
		gl.activeTexture( gl.TEXTURE2 );
		gl.bindTexture( gl.TEXTURE_2D, fbs.tx2 );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		// Bind texture to fb2
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb2 );
		gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbs.tx2, 0 );
	}
	
	const Layer = function ( image, extra_scale ) {
		const vs = `
			attribute vec2 Apos;
			attribute vec2 AtexBk;
			varying vec2 VtexBk;
			attribute vec2 AtexFg;
			varying vec2 VtexFg;

			void main() {
				gl_Position = vec4( Apos, 0., 1. );
				VtexBk = AtexBk;
				VtexFg = AtexFg;
			}
		`;

		const fs = `
			precision mediump float;
			uniform sampler2D UtexBk;
			varying vec2 VtexBk;
			uniform sampler2D UtexFg;
			varying vec2 VtexFg;

			vec4 accurate_mix ( vec4 bk, vec4 fg ) {
				float alpha = 1.0 - fg.a;

				// Gamma correction of 2, close enough to 2.2 or whatever the ideal ratio is.
				vec3 color = sqrt( fg.rgb * fg.rgb + bk.rgb * bk.rgb * alpha );

				float out_alpha = fg.a + bk.a * alpha;
				return vec4( color, out_alpha );
			}

			void main() {
				vec4 final_color = accurate_mix( texture2D( UtexBk, VtexBk ), texture2D( UtexFg, VtexFg ) );
				gl_FragColor = vec4( final_color.rgb, 1.0 );
			}
		`;

		const program = create_program( vs, fs );
		gl.useProgram( program );

		const Apos = gl.getAttribLocation( program, "Apos" );
		const Abk = gl.getAttribLocation( program, "AtexBk" );
		const Ubk = gl.getUniformLocation( program, "UtexBk" );
		const Afg = gl.getAttribLocation( program, "AtexFg" );
		const Ufg = gl.getUniformLocation( program, "UtexFg" );

		gl.activeTexture( gl.TEXTURE1 );
		const tex_bk = gl.createTexture();

		gl.bindTexture( gl.TEXTURE_2D, tex_bk );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );

		gl.uniform1i( Ubk, 1 );

		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, fbs.tx1 );
		gl.uniform1i( Ufg, 0 );

		// Image init
		this.image = image;
		// For now we just center images at, well, the center.
		this.center_x = 1/2;//1 - 1275 / 5160;
		this.center_y = 1/2;//1 - 1419 / 2871;
		
		// Scaling the image to the width of the screen.
		this.scale_x = Math.min( 1, 2 * canvas.width / image.width );
		this.scale_y = Math.min( 1, 2 * canvas.height / image.height );

		// Percentage of the shown image to parallax scroll
		this.extra_scale = extra_scale;

		this.bk_arr = [];

		{
			const l_s = this.center_x * ( 1 - this.scale_x ) + this.extra_scale * this.scale_x;
			const b_s = this.center_y * ( 1 - this.scale_y ) + this.extra_scale * this.scale_y;
			const r_s = l_s + this.scale_x - 2 * this.extra_scale * this.scale_x;
			const t_s = b_s + this.scale_y - 2 * this.extra_scale * this.scale_y;

			this.bk_arr = new Float32Array( [
				r_s, t_s,
				r_s, b_s,
				l_s, t_s,
				l_s, b_s,
			] );
		}

		const pos_buf = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, pos_buf );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ -1, -1,
															-1,  1,
															1, -1,
															1,  1 ] ), gl.DYNAMIC_DRAW );

		const bk_buf = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, bk_buf );
		gl.bufferData( gl.ARRAY_BUFFER, this.bk_arr, gl.STATIC_DRAW );
		
		const fg_buf = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, fg_buf );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ 0, 0,
															0, 1,
															1, 0,
															1, 1 ] ), gl.STATIC_DRAW );

		const render = () => {
			gl.enableVertexAttribArray( Apos );
			gl.enableVertexAttribArray( Abk );
			gl.enableVertexAttribArray( Afg );
			
			gl.bindBuffer( gl.ARRAY_BUFFER, pos_buf );
			gl.vertexAttribPointer( Apos, 2, gl.FLOAT, false, 0, 0 );
			
			gl.bindBuffer( gl.ARRAY_BUFFER, bk_buf );
			gl.vertexAttribPointer( Abk, 2, gl.FLOAT, false, 0, 0 );
			
			gl.bindBuffer( gl.ARRAY_BUFFER, fg_buf );
			gl.vertexAttribPointer( Afg, 2, gl.FLOAT, false, 0, 0 );
			
			gl.vertexAttribDivisor( Apos, 0 );
			gl.vertexAttribDivisor( Abk, 0 );
			gl.vertexAttribDivisor( Afg, 0 );
			
			gl.bindFramebuffer( gl.FRAMEBUFFER, null );
			
			gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
			
			gl.disableVertexAttribArray( Apos );
			gl.disableVertexAttribArray( Abk );
			gl.disableVertexAttribArray( Afg );
		};
		
		const addToBkBuff = function () {
			const new_arr = this.bk_arr.map( ( elm, ind ) => { return elm + ( ind % 2 === 0 ? this.x : this.y ) } );
			gl.bindBuffer( gl.ARRAY_BUFFER, bk_buf );
			gl.bufferSubData( gl.ARRAY_BUFFER, 0, new_arr, 0, 8 );
		};
		
		const v_mult = 0.00005;
		this.x = 0;
		this.y = 0;
		
		Layer.prototype.update = function () {
			gl.useProgram( program );
				
			let velx = v_mult * ( mx - this.x / this.extra_scale / this.scale_x );
			let vely = v_mult * ( my - this.y / this.extra_scale / this.scale_y );
			
			this.x += velx * tDelta;
			this.y += vely * tDelta;

			addToBkBuff.call( this );
			render();
		};
		
		Layer.prototype.resize = function () {
			this.scale_x = Math.min( 1, 2 * canvas.width / this.image.width );
			this.scale_y = Math.min( 1, 2 * canvas.height / this.image.height );

			{
				const l_s = this.center_x * ( 1 - this.scale_x ) + this.extra_scale * this.scale_x;
				const b_s = this.center_y * ( 1 - this.scale_y ) + this.extra_scale * this.scale_y;
				const r_s = l_s + this.scale_x - 2 * this.extra_scale * this.scale_x;
				const t_s = b_s + this.scale_y - 2 * this.extra_scale * this.scale_y;

				this.bk_arr = new Float32Array( [
					r_s, t_s,
					r_s, b_s,
					l_s, t_s,
					l_s, b_s,
				] );
			}
		};

		Layer.prototype.reset = function () {
			this.x = 0;
			this.y = 0;
		};
		
	};

	let bkgd = new Layer( document.getElementById( "image" ), 0.1 );
	
	const animate = ( tNow ) => {
		tDelta = tNow - tPrev;
		
		gl.bindFramebuffer( gl.FRAMEBUFFER, null );
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb1 );
		gl.clear( gl.COLOR_BUFFER_BIT );
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb2 );
		gl.clear( gl.COLOR_BUFFER_BIT );
		
		bkgd.update();
		
		window.onmousemove = mousemove;	
		animFrame = requestAnimationFrame( animate );
		tPrev = tNow;
	};

	/*
	 * Events
	 */

	// Resize resizes the canvas and GL buffer, along with calling various functions for resizing the different components.
	const resize = () => {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		cw = canvas.width / 2;
		ch = canvas.height / 2;

		gl.bindFramebuffer( gl.FRAMEBUFFER, null );
		gl.viewport( 0, 0, canvas.width, canvas.height );
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

		size_fbs();
		bkgd.resize();
	};
	
	const mousemove = ( e ) => {
		mx = e.clientX / cw - 1;
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
};

window.onload = fn;

