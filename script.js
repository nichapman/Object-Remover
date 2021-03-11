var canvas, ctx;
var backgroundCanvas, bctx;
var touchX, touchY;
var background;

// Assuming <html> has `width: 100%`.
var width = document.documentElement.clientWidth * window.devicePixelRatio;
viewport = document.querySelector("meta[name=viewport]");
viewport.setAttribute('content', 'width=' + width);
document.documentElement.style.transform = 'scale( 1 / window.devicePixelRatio )';
document.documentElement.style.transformOrigin = 'top left';

window.onload = function (e) {
    canvas = document.getElementById('canvas');
    backgroundCanvas = document.getElementById('backgroundCanvas');

    var scaling = window.devicePixelRatio;
    if (!(scaling > 2.5)) {
        scaling = 1;
    }

    canvas.width = window.innerWidth * 0.9 * scaling;
    canvas.height = window.innerHeight * 0.75 * scaling;
    backgroundCanvas.width = canvas.width;
    backgroundCanvas.height = canvas.height;

    if (canvas.getContext)
        ctx = canvas.getContext('2d');

    if (backgroundCanvas.getContext) {
        bctx = backgroundCanvas.getContext('2d');
    }
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker
            .register("/serviceWorker.js")
            .then(res => console.log("service worker registered"))
            .catch(err => console.log("service worker not registered", err))
    })
}

function drawDot(ctx, x, y) {
    ctx.fillStyle = "white";
    // Draw a filled circle
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
}

function sketchpad_touchStart() {
    // Update the touch co-ordinates
    getTouchPos();
    drawDot(ctx, touchX, touchY);
    // Prevents an additional mousedown event being triggered
    event.preventDefault();
}

function sketchpad_touchMove(e) {
    // Update the touch co-ordinates
    getTouchPos(e);
    drawDot(ctx, touchX, touchY);
    // Prevent a scrolling action as a result of this touchmove triggering.
    event.preventDefault();
}

function getTouchPos(e) {
    if (!e)
        var e = event;

    if (e.touches) {
        if (e.touches.length == 1) { // Only deal with one finger
            var touch = e.touches[0]; // Get the information for finger #1
            touchX = touch.pageX - touch.target.offsetLeft;
            touchY = touch.pageY - touch.target.offsetTop;
        }
    }
}

function displayImage(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {
            background = new Image();
            background.src = e.target.result;

            background.onload = function () {
                var width = this.width;
                var height = this.height;
                var max_width = canvas.width;
                var max_height = canvas.height;

                // calculate the width and height, constraining the proportions
                if (width > height) {
                    if (width > max_width) {
                        height = Math.round(height *= max_width / width);
                        width = max_width;
                    }
                } else {
                    if (height > max_height) {
                        width = Math.round(width *= max_height / height);
                        height = max_height;
                    }
                }

                // resize the canvas and draw the image data into it
                canvas.width = width;
                canvas.height = height;
                backgroundCanvas.width = width;
                backgroundCanvas.height = height;

                bctx.drawImage(this, 0, 0, width, height);

                setTimeout(function () {
                    alert("Upload complete! Draw on the image to indicate the area to be removed.");
                }, 0);
            }
        };

        reader.readAsDataURL(input.files[0]);
        document.getElementById("process").style.display = "block";
        document.getElementById("upload").style.display = "none";

        if (ctx) {
            canvas.addEventListener('touchstart', sketchpad_touchStart, false);
            canvas.addEventListener('touchmove', sketchpad_touchMove, false);
        }
    }
}

function processImage(e) {
    var mask = canvas.toDataURL(encoderOptions = 1);

    ctx.globalCompositeOperation = "destination-over";
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    var image = canvas.toDataURL(encoderOptions = 1);

    data = { 'image': image, 'mask': mask };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bctx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    document.getElementsByClassName("loading")[0].style.display = "block";

    fetch('http://ce4a093b1cd6.ngrok.io/process?' + Date.now(), {
        method: 'POST',
        body: JSON.stringify(data),
    })
        .then(response => response.blob())
        .then(image => {
            var reader = new FileReader();
            reader.readAsDataURL(image);
            reader.onloadend = function () {
                var output = new Image();
                var base64data = reader.result;
                output.onload = function () {
                    bctx.drawImage(output, 0, 0, canvas.width, canvas.height);
                }
                output.src = base64data;

                //hide everything other reset button, display output image
                document.getElementById("process").style.display = "none";
                document.getElementById("canvas").style.display = "none";
                document.getElementById("backgroundCanvas").style.display = "none";
                document.getElementsByClassName("loading")[0].style.display = "none";
                document.getElementById("output").style.display = "block";
                document.getElementById("output").src = base64data;

                setTimeout(function () {
                    alert("Processing complete! Press and hold on the image to save it.");
                }, 0)
            }
        })
}