/* Particle */
var particle = new Particle();
let mfa_token;

$(document).ready(function () {
    $('#timepicker').mdtimepicker(); //Initializes the time picker
    // This function is called when the page loads
    
    $('#loginForm').submit(function (e) {
        // The Login button on the login page was clicked (or Return pressed)
        e.preventDefault();

        // Hide the login page so the button goes away
        $('#loginDiv').css('display', 'none');
        $('#loginFailedDiv').css('display', 'none');
        sessionStorage.particleUser = $('#userInput').val();

        // Attempt to log into the Particle cloud
        /*$.ajax({
            data: {
                'client_id': 'particle',
                'client_secret': 'particle',
                'expires_in': 3600,
                'grant_type': 'password',
                'password': $('#passwordInput').val(),
                'username': $('#userInput').val()
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status === 403) {
                    // Got a 403 error, MFA required. Show the MFA/OTP page.
                    mfa_token = jqXHR.responseJSON.mfa_token;
                    $('#otpDiv').css('display', 'inline');
                    return;
                }
                console.log('error ' + textStatus, errorThrown);
                $('#loginDiv').css('display', 'inline');
                $('#loginFailedDiv').css('display', 'inline');
            },
            method: 'GET',
            success: function (data) {
                loginSuccess(data.access_token);
            },
            url: 'https://api.particle.io/oauth/token',
        });*/

        $.ajax({
            url: 'https://api.particle.io/oauth/token',
            method: 'POST',
            data: $.param({
                'client_id': 'particle',
                'client_secret': 'particle',
                'expires_in': 3600,
                'grant_type': 'password',
                'password': $('#passwordInput').val(),
                'username': $('#userInput').val()
            }), // Use $.param to encode the data
            contentType: 'application/x-www-form-urlencoded', // Set content type
            success: function (data) {
                loginSuccess(data.access_token); // Success callback
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status === 403) {
                    // MFA required
                    mfa_token = jqXHR.responseJSON.mfa_token;
                    $('#otpDiv').css('display', 'inline');
                    return;
                }
                console.log('error ' + textStatus, errorThrown);
                $('#loginDiv').css('display', 'inline');
                $('#loginFailedDiv').css('display', 'inline');
            }
        });
    });

    $('#otpForm').submit(function (e) {
        // Login on the OTP/MFA form
        e.preventDefault();

        $('#otpDiv').css('display', 'none');

        $.ajax({
            data: {
                'client_id': 'particle',
                'client_secret': 'particle',
                'grant_type': 'urn:custom:mfa-otp',
                'mfa_token': mfa_token,
                'otp': $('#otpInput').val()
            },
            error: function (jqXHR, textStatus, errorThrown) {
                // Invalid MFA token
                $('#loginDiv').css('display', 'inline');
                $('#loginFailedDiv').css('display', 'inline');
            },
            method: 'POST',
            success: function (data) {
                console.log(data);
                loginSuccess(data.access_token);
            },
            url: 'https://api.particle.io/oauth/token',
        });

    });

    $('#logoutButton').on('click', function (e) {
        // Logout button clicked
        e.preventDefault();

        // Delete the access token from local session storage
        const accessToken = sessionStorage.particleToken;
        delete sessionStorage.particleToken;
        delete sessionStorage.particleUser;

        // Invalidate the token on the cloud side
        $.ajax({
            data: {
                'access_token': accessToken
            },
            method: 'DELETE',
            complete: function () {
                // Show the login page
                $('#mainDiv').css('display', 'none');
                $('#loginDiv').css('display', 'inline');
                $('#loginFailedDiv').css('display', 'none');
            },
            url: 'https://api.particle.io/v1/access_tokens/current',
        });
    });

    $('#ledOnButton').on('click', function (e) {
        e.preventDefault();
        ledControl('on');
    });
    $('#ledOffButton').on('click', function (e) {
        e.preventDefault();
        ledControl('off');
    });

    if (sessionStorage.particleToken) {
        // We have a Particle access token in the session storage. Probably
        // refreshed the page, so try to use it. You don't need to log in
        // every time, you can reuse the access token if it has not expired.
        $('#loginDiv').css('display', 'none');
        getDevices();
    }
});

function loginSuccess(token) {
    console.log(token);
    sessionStorage.particleToken = token;
    if (!sessionStorage.particleToken) {
        // No token available, prompt for login
        $('#loginDiv').css('display', 'inline');
    } else {
        // Token exists, continue with the app
        getDevices();
    }
}

function getDevices() {
    // Request the device list from the cloud
    particle.listDevices({ auth: sessionStorage.particleToken }).then(
        function (data) {
            console.log(data);
            // Success! Show the main page
            $('#mainDiv').css('display', 'grid');

            // Load the device selector popup
            loadDeviceList(data.body);
        },
        function (err) {
            // Failed to retrieve the device list. The token may have expired
            // so prompt for login again.
            $('#mainDiv').css('display', 'none');
            $('#loginDiv').css('display', 'inline');
            $('#loginFailedDiv').css('display', 'inline');
        }
    );
}

function loadDeviceList(deviceList) {
    let html = '';

    $('#userSpan').text(sessionStorage.particleUser);

    deviceList.forEach(function (dev) {
        // For each device in the user's account, see if the device supports the "led" function call
        // Also note whether it's online or not.
        if (dev.functions) {
            html += '<option value="' + dev.id + '">' + dev.name + (dev.online ? '' : ' (offline)') + '</option>';
        }
    });
    $('#deviceSelect').html(html);

    if (html == '') {
        $('#statusSpan').text('No device are running led control firmware');
    }
    else {
        $('#statusSpan').text('');
    }
}

function weatherMode(cmd) {
    // Used to turn on or off the LED by using the Particle.function "led"
    const deviceId = $('#deviceSelect').val();

    $('#statusSpan').text('');

    particle.callFunction({ deviceId, name: 'weatherReactive', argument: cmd, auth: sessionStorage.particleToken }).then(
        function (data) {
            $('#statusSpan').text('Call completed');
        },
        function (err) {
            $('#statusSpan').text('Error calling device: ' + err);
        }
    );
}

function motionSense(cmd) {
    // Used to turn on or off the LED by using the Particle.function "led"
    const deviceId = $('#deviceSelect').val();

    $('#statusSpan').text('');

    particle.callFunction({ deviceId, name: 'motionReactive', argument: cmd, auth: sessionStorage.particleToken }).then(
        function (data) {
            $('#statusSpan').text('Call completed');
        },
        function (err) {
            $('#statusSpan').text('Error calling device: ' + err);
        }
    );
}

function effectSelect(cmd) {
    // Used to turn on or off the LED by using the Particle.function "led"
    const deviceId = $('#deviceSelect').val();

    $('#statusSpan').text('');

    particle.callFunction({ deviceId, name: 'setMode', argument: cmd, auth: sessionStorage.particleToken }).then(
        function (data) {
            $('#statusSpan').text('Call completed');
        },
        function (err) {
            $('#statusSpan').text('Error calling device: ' + err);
        }
    );
}

function playMorse(cmd) {
    // Used to turn on or off the LED by using the Particle.function "led"
    const deviceId = $('#deviceSelect').val();

    $('#statusSpan').text('');

    particle.callFunction({ deviceId, name: 'playMorse', argument: cmd, auth: sessionStorage.particleToken }).then(
        function (data) {
            $('#statusSpan').text('Call completed');
        },
        function (err) {
            $('#statusSpan').text('Error calling device: ' + err);
        }
    );
}

document.getElementById('sendGreeting').addEventListener('click', function() {
    // Get the content of the editable div
    var textValue = document.getElementById('greetingText').innerText;
    
    // Call the function with the value of the text div
    playMorse(textValue);
});

document.getElementById('presetButton').addEventListener('click', function() {
    $('.messages').hide();
    $('.presets').show();
});

document.getElementById('messageButton').addEventListener('click', function() {
    $('.presets').hide();
    $('.messages').show();
});

function musicReactive(cmd) {
    // Used to turn on or off the LED by using the Particle.function "led"
    const deviceId = $('#deviceSelect').val();

    $('#statusSpan').text('');

    particle.callFunction({ deviceId, name: 'musicReactive', argument: cmd, auth: sessionStorage.particleToken }).then(
        function (data) {
            $('#statusSpan').text('Call completed');
        },
        function (err) {
            $('#statusSpan').text('Error calling device: ' + err);
        }
    );
}