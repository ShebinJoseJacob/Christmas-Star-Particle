/* Particle */
var particle = new Particle();
let mfa_token;

$(document).ready(function () {
    $('#timepicker').mdtimepicker(); //Initializes the time picker
    setTimeout(function(){
        addDiv();
    },2000); 
    // This function is called when the page loads
    
    $('#loginForm').submit(function (e) {
        // The Login button on the login page was clicked (or Return pressed)
        e.preventDefault();

        // Hide the login page so the button goes away
        $('#loginDiv').css('display', 'none');
        $('#loginFailedDiv').css('display', 'none');
        sessionStorage.particleUser = $('#userInput').val();

        // Attempt to log into the Particle cloud
        $.ajax({
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
            method: 'POST',
            success: function (data) {
                loginSuccess(data.access_token);
            },
            url: 'https://api.particle.io/oauth/token',
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
    sessionStorage.particleToken = token;
    getDevices();
}

function getDevices() {
    // Request the device list from the cloud
    particle.listDevices({ auth: sessionStorage.particleToken }).then(
        function (data) {
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
        if (dev.functions.includes('led')) {
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

function ledControl(cmd) {
    // Used to turn on or off the LED by using the Particle.function "led"
    const deviceId = $('#deviceSelect').val();

    $('#statusSpan').text('');

    particle.callFunction({ deviceId, name: 'led', argument: cmd, auth: sessionStorage.particleToken }).then(
        function (data) {
            $('#statusSpan').text('Call completed');
        },
        function (err) {
            $('#statusSpan').text('Error calling device: ' + err);
        }
    );
}


/*  clock */
const hours = document.querySelector('.hours');
const minutes = document.querySelector('.minutes');
const seconds = document.querySelector('.seconds');

clock = () => {
    let today = new Date();
    let h = today.getHours() % 12 + today.getMinutes() / 59; // 22 % 12 = 10pm
    let m = today.getMinutes(); // 0 - 59
    let s = today.getSeconds(); // 0 - 59

    h *= 30; // 12 * 30 = 360deg
    m *= 6;
    s *= 6; // 60 * 6 = 360deg

    rotation(hours, h);
    rotation(minutes, m);
    rotation(seconds, s);

    // call every second
    setTimeout(clock, 500);
};

rotation = (target, val) => {
    target.style.transform = `rotate(${val}deg)`;
};

window.onload = clock();

function toggleDiv() {
    $('.components').toggle();
    $('.components2').toggle();
}

$('#timepicker').mdtimepicker().on('timechanged', function(e) {
    console.log(e.value)
    addStore(e);
});

function addTime(cmd) {
    // Used to turn on or off the LED by using the Particle.function "led"
    const deviceId = $('#deviceSelect').val();

    particle.callFunction({ deviceId, name: 'addSchedule', argument: cmd, auth: sessionStorage.particleToken }).then(
        function (data) {
            console.log('Call completed');
        },
        function (err) {
            console.log('Error calling device: ' + err);
        }
    );
}

function addStore(e) {
    addTime(e.time);
    setTimeout(() => {
        addDiv();
    }, 1000);
}

function showShort(id) {
    var idv = id
    $("#time_" + idv).toggle();
    $("#short_" + idv).toggle();

}

function removeDiv(id) {
    $("#"+id).fadeOut(1, 0).fadeTo(500, 0)
    removeTime(id.toString());
    setTimeout(() => {
        addDiv();
    }, 2000);
    
}

function removeTime(cmd){
    const deviceId = $('#deviceSelect').val();
    
    particle.callFunction({ deviceId, name: 'removeSchedule', argument: cmd, auth: sessionStorage.particleToken }).then(
        function (data) {
            console.log('Call completed');
        },
        function (err) {
            console.log('Error calling device: ' + err);
        }
    );
}

function addDiv() {
    var i = 0;
    const deviceId = $('#deviceSelect').val();
    particle.getVariable({ deviceId: deviceId, name: 'array', auth: sessionStorage.particleToken }).then(function(data) {
        const array = JSON.parse(data.body.result);
        console.log('Array retrieved:', array);

        const count = Object.keys(array).length;
        console.log(count);
        $('#wrapper').html('');
        
        while (i < count) {
            let ts = array[i];
            var H = +ts.substr(0, 2);
            var h = (H % 12) || 12;
            h = (h < 10) ? ("0" + h) : h; // leading 0 at the left for 1 digit hours
            var ampm = H < 12 ? " AM" : " PM";
            ts = h + ts.substr(2, 3) + ampm;
            console.log(ts);

            const x = `
            <div id=${i}>
                <div class="btn2 btn__secondary" onclick="showShort(${i})" id="main_${i}">
                    <div id="time_${i}">
                        ${ts}
                    </div>
                    <div class="icon2" id="short_${i}" onclick="removeDiv(${i})">
                        <div class="icon__add">
                            <ion-icon name="trash"></ion-icon>
                        </div>
                    </div>
                </div>
            </div>`;

            $('#wrapper').append(x);
            i++;
        }
    }, function(err) {
        console.log('An error occurred while getting attrs:', err);
    });
}
