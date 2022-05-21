const fn = function () {

	Math.clamp = ( x, y, z ) => Math.max( Math.min( x, z ), y );

	{
		const players = document.getElementsByClassName( "aud-ctl" );
		const srcs = document.querySelectorAll( 'audio' );
		const pps = document.getElementsByClassName( "aud-pp" );
		// position and volume bars
		const bpos = document.getElementsByClassName( "aud-pos" );
		const bvol = document.getElementsByClassName( "aud-vol" );
		// position and volume sliders
		const spos = Array.from( bpos ).map( e => e.children[ 0 ] );
		const svol = Array.from( bvol ).map( e => e.children[ 0 ] );

		const update_time = ( i ) => spos[ i ].style.left = Math.clamp(
															srcs[ i ].currentTime *
															bpos[ i ].offsetWidth /
															srcs[ i ].duration,
															-6, bpos[ i ].offsetWidth
															- 6 ) + 'px';

		const drag_slider_time = ( e, i ) => {
			const slen = Math.clamp( e.clientX - bpos[ i ].offsetLeft - 6, -6, bpos[ i ].offsetWidth - 6 );
			srcs[ i ].currentTime = ( slen / bpos[ i ].offsetWidth ) * srcs[ i ].duration;
			slider_stub( spos[ i ], bpos[ i ], slen, i );
			players[ i ].onmousemove = ( e ) => drag_slider_time( e, i );
		};
		const drag_slider_vol = ( e, i ) => {
			const slen = Math.clamp( e.clientX - bvol[ i ].offsetLeft - 6, -6, bvol[ i ].offsetWidth - 6 );
			srcs[ i ].volume = ( slen / bvol[ i ].offsetWidth );
			slider_stub( svol[ i ], bvol[ i ], slen, i );
			players[ i ].onmousemove = ( e ) => drag_slider_vol( e, i );
		};
		const slider_stub = ( slider, bar, slen, i ) => {
			slider.style.left = slen + 'px';
			players[ i ].onmouseleave = () => drag_cancel( i );
			players[ i ].onmouseup = () => drag_cancel( i );
		}

		const pp = ( i ) => {
			const chs = pps[ i ].children;
			if ( srcs[ i ].paused ) {
				chs[ 0 ].style.display = 'none';
				chs[ 1 ].style.display = 'block';
				srcs[ i ].play();
			} else {
				chs[ 0 ].style.display = 'block';
				chs[ 1 ].style.display = 'none';
				srcs[ i ].pause();
			}
		};

		const pb_ended = ( i ) => {
			const chs = pps[ i ].children;
			chs[ 0 ].style.display = 'block';
			chs[ 1 ].style.display = 'none';
		};

		const drag_cancel = ( i ) => {
			players[ i ].onmousemove = undefined;
			players[ i ].onmouseleave = undefined;
			players[ i ].onmouseup = undefined;
		};

		for ( let i = 0; i < players.length; i++ ) {
			bpos[ i ].onmousedown = ( e ) => drag_slider_time( e, i );
			bvol[ i ].onmousedown = ( e ) => drag_slider_vol( e, i );
			spos[ i ].onmousedown = ( e ) => drag_slider_time( e, i );
			svol[ i ].onmousedown = ( e ) => drag_slider_vol( e, i );
			pps[ i ].onclick = () => pp( i );
			srcs[ i ].ontimeupdate = () => update_time( i );
			srcs[ i ].onended = () => pb_ended( i );
		}
	}
}

window.onload = fn;
