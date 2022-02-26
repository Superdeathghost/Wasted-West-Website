
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
		gl.activeTexture( gl.TEXTURE3 );
		gl.bindTexture( gl.TEXTURE_2D, fbs.tx1 );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );
		// Linear is the best filter
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		// Bind texture to fb1
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb1 );
		gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbs.tx1, 0 );
		// Create texture 2
		gl.activeTexture( gl.TEXTURE4 );
		gl.bindTexture( gl.TEXTURE_2D, fbs.tx2 );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		// Bind texture to fb2
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb2 );
		gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbs.tx2, 0 );
	}
	
	class Layer {
		static vs;
		static fs;

		constructor ( image, extra_scale, bk_tex_u, fg_tex_u, out_fb, v_mult, cen_x, cen_y ) {
			this.bk_tex_u = bk_tex_u;
			this.fg_tex_u = fg_tex_u;
			this.fb = out_fb;
			this.v_mult = 0.00005 * v_mult;

			this.program = create_program( Layer.vs, Layer.fs );
			gl.useProgram( this.program );

			this.Abk = gl.getAttribLocation( this.program, "AtexBk" );
			this.Ubk = gl.getUniformLocation( this.program, "UtexBk" );
			this.Afg = gl.getAttribLocation( this.program, "AtexFg" );
			this.Ufg = gl.getUniformLocation( this.program, "UtexFg" );
			this.Uug = gl.getUniformLocation( this.program, "UuseFg" );

			this.bk_buf = gl.createBuffer();
			this.fg_buf = gl.createBuffer();
			gl.bindBuffer( gl.ARRAY_BUFFER, this.bk_buf );
			gl.bufferData( gl.ARRAY_BUFFER, new Float32Array([0,0,0,0,0,0,0,0]), gl.DYNAMIC_DRAW );
			gl.bindBuffer( gl.ARRAY_BUFFER, this.fg_buf );
			gl.bufferData( gl.ARRAY_BUFFER, new Float32Array([1,-1,1,1,-1,-1,-1,1]), gl.STATIC_DRAW );

			gl.uniform1i( this.Ubk, this.bk_tex_u );
			if ( this.fg_tex_u == -1 )
				gl.uniform1i( this.Uug, false );
			else {
				gl.uniform1i( this.Uug, true );
				gl.uniform1i( this.Ufg, this.fg_tex_u );
			}

			gl.activeTexture( gl_tex_us[ bk_tex_u ] )
			this.tex_bk = gl.createTexture();
			gl.bindTexture( gl.TEXTURE_2D, this.tex_bk );
			gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );

			this.width = image.width;
			this.height = image.height;

			// For now we just center images at, well, the center.
			this.center_x = cen_x;//1 - 1275 / 5160;
			this.center_y = cen_y;//1 - 1419 / 2871;

			// Scaling the image to the width of the screen.
			this.scale_x = Math.min( 1, 2 * canvas.width / image.width );
			this.scale_y = Math.min( 1, 2 * canvas.height / image.height );

			// Percentage of the shown image to parallax scroll
			this.extra_scale = extra_scale;

			this.bk_arr = null;

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

			this.x = 0;
			this.y = 0;
		}

		static {
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
// 						final_color = texture2D( UtexFg, VtexFg );
					else
						final_color = texture2D( UtexBk, VtexBk );
					gl_FragColor = final_color;
				}
			`;
		}
		
		update () {
			gl.useProgram( this.program );
				
			let velx = this.v_mult * ( mx - this.x / this.extra_scale / this.scale_x );
			let vely = this.v_mult * ( my - this.y / this.extra_scale / this.scale_y );
			
			this.x += velx * tDelta;
			this.y += vely * tDelta;

			const new_arr = this.bk_arr.map( ( elm, ind ) => { return elm + ( ind % 2 === 0 ? this.x : this.y ) } );
			gl.bindBuffer( gl.ARRAY_BUFFER, this.bk_buf );
			gl.bufferSubData( gl.ARRAY_BUFFER, 0, new_arr, 0, 8 );
		};
		
		resize () {
			this.scale_x = Math.min( 1, 2 * canvas.width / this.width );
			this.scale_y = Math.min( 1, 2 * canvas.height / this.height );

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

		render () {
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
		};

		reset () {
			this.x = 0;
			this.y = 0;
		};
		
	};

	let llam = new Layer( document.getElementById( "image2" ), 0.08, 0, -1, fbs.fb1, 1.5, .8, .8 );	// fbs.fb1 is on 3
	let bkgd = new Layer( document.getElementById( "image" ), 0.06, 1, 3, null, 1, .5, .5 );
	
	const animate = ( tNow ) => {
		tDelta = tNow - tPrev;
		
		gl.bindFramebuffer( gl.FRAMEBUFFER, null );
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb1 );
		gl.clear( gl.COLOR_BUFFER_BIT );
		gl.bindFramebuffer( gl.FRAMEBUFFER, fbs.fb2 );
		gl.clear( gl.COLOR_BUFFER_BIT );

		llam.update();
		llam.render();
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
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		cw = canvas.width / 2;
		ch = canvas.height / 2;

		gl.bindFramebuffer( gl.FRAMEBUFFER, null );
		gl.viewport( 0, 0, canvas.width, canvas.height );
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

		size_fbs();
		bkgd.resize();
		llam.resize();
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
// 		bkgd.reset();
// 		llam.reset();
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

