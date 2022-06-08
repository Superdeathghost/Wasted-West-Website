<!DOCTYPE html>
<html>
	<head>

		<title>Tales Of The Wasted West</title>
		<meta name="description" content="An original high fantasy Western featuring gunslingers, monsters, and mechanical contraptions of new, Tales of the Wasted West is an independent audio drama produced by students from the University of Maryland, College Park and Baltimore County. Be sure to catch the latest episodes here and at WMUC, UMD's student-run radio station." />
		<meta charset="utf-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

		<link rel="stylesheet" type="text/css" href="index.css" />
		<link href="fonts.css" type="text/css" rel="stylesheet" />
		<link rel="stylesheet" href="email.css" type="text/css" />

	</head>
	<body>

		<script src="control-email-subset.js">Your browser needs to support javascript for you to view this site!</script>

		<div id="content">
			<div id="over-canvas">
				<div id="nav">
					<div id="link-home"><a class="link link--io" href="index.html">The Wasted West</a></div>
				</div>
				<div id="main">
					<div class="page-container"><p class="main-p">
						<?php
							if ( !empty( $_POST[ 'Submit' ] ) ) {
								$name = $_POST[ 'Name' ];
								$email = $_POST[ 'Email' ];
								$phone = $_POST[ 'Phone' ];
								$content = $_POST[ 'Content' ];

								$error = "";

								if ( empty( $content ) ) {
									$error .= "<li><p>No content.</p></li>";
								}
								if ( empty( $name ) || preg_match( "/^[\w\x{00C0}-\x{00FF}'\-\s]*$/u", $name ) != 1 ) {
									$error .= "<li><p>Name is missing or has invalid characters.</p></li>";
								}
								if ( !empty( $phone ) && preg_match( "/^(\+\d)?((\(\d{3}\))|(\d{3}))[-\s\.]?\d{3}[-\s\.]?\d{4,6}$/", $phone ) != 1 ) {
									$error .= "<li><p>Phone number is invalid.</p></li>";
								}
								if ( empty( $email ) || filter_var( $email, FILTER_VALIDATE_EMAIL ) == false ) {
									$error .= "<li><p>Email is missing or invalid.</p><p style=\"font-size:0.8em;\">&emsp;&emsp;- Don't use comments, domains without dots, or quotes.</p></li>";
								}
								if ( empty( $error ) ) {
									$message  = "Name: " . $name .
												"\nEmail: " . $email .
												"\nPhone: " . $phone .
												"\n\n" . $content;
									$headers  = 'Content-Type: text/plain; charset=utf-8' . "\r\n" .
												'Content-Transfer-Encoding: base64' . "\r\n" .
												'From: <noreply@thewastedwest.rf.gd>' . "\r\n" .
                                                'Reply-To: <noreply@thewastedwest.rf.gd>' . "\r\n";
									preg_replace( "/(?<!\r)\n/", "\r\n", $message );
									$message = wordwrap($message, 70, "\r\n");
									if ( mail( "<therealwastedwest@gmail.com>", "Website Forum Email", $message, $headers, "-fnoreply@thewastedwest.rf.gd" ) != true ) {
										$error .= "<li>Server could not send email.</li>";
									}
								}
								if ( empty( $error ) ) {
									echo "Email sent.<br \>";
								} else {
									echo "There were errors in sending the email:</p><ul>" . $error . "</ul><p class=\"main-p\">";
								}
							} else {
								echo "This page is only for the contact forum.<br \>";
							}
						?>
					Click <a href="index.html">here</a> or on the main link to return to the site.</p></div>
				</div>
			</div>

			<canvas id="screen">Update your browser</canvas>
		</div>
	</body>
</html>
