var canvas, ctx;
var backgroundCanvas, bctx;
var touchX, touchY;
var background;
const SHRINK_FACTOR = 2;

var width = document.documentElement.clientWidth * window.devicePixelRatio;
viewport = document.querySelector("meta[name=viewport]");
viewport.setAttribute('content', 'width=' + width);
document.documentElement.style.transform = 'scale( 1 / window.devicePixelRatio )';
document.documentElement.style.transformOrigin = 'top left';

window.onload = function (e) {
    canvas = document.getElementById('canvas');
    backgroundCanvas = document.getElementById('backgroundCanvas');

    var scaling = window.devicePixelRatio;
    if (scaling < 2.1) {
        scaling = 1;
    }

    canvas.width = window.innerWidth * 0.95 * scaling;
    canvas.height = window.innerHeight * 0.75 * scaling;
    backgroundCanvas.width = canvas.width;
    backgroundCanvas.height = canvas.height;

    ctx = canvas.getContext('2d');
    bctx = backgroundCanvas.getContext('2d');
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker
            .register("/serviceWorker.js")
            .then(res => console.log("service worker registered"))
            .catch(err => console.log("service worker not registered", err))
    })
}

function showElement(element) {
    element.style.display = "block";
}

function hideElement(element) {
    element.style.display = "none";
}

function drawDot(ctx, x, y) {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
}

function sketchpad_touchStart() {
    getTouchPos();
    drawDot(ctx, touchX, touchY);
    // Prevents an additional mousedown event being triggered
    event.preventDefault();
}

function sketchpad_touchMove(e) {
    getTouchPos(e);
    drawDot(ctx, touchX, touchY);
    // Prevent a scrolling action as a result of this touchmove triggering.
    event.preventDefault();
}

function getTouchPos(e) {
    if (e.touches) {
        if (e.touches.length == 1) {
            var touch = e.touches[0];
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

                alert("Upload complete! Draw on the image to indicate the area to be removed.");
            }
        };

        reader.readAsDataURL(input.files[0]);
        showElement(document.getElementById("process"));
        hideElement(document.getElementById("upload"));
        showElement(document.getElementById("refresh"));

        canvas.addEventListener('touchstart', sketchpad_touchStart, false);
        canvas.addEventListener('touchmove', sketchpad_touchMove, false);
    }
}

function processImage(e) {
    var resizedCanvas = document.createElement("canvas");
    var resizedContext = resizedCanvas.getContext("2d");

    resizedCanvas.height = canvas.height / SHRINK_FACTOR;
    resizedCanvas.width = canvas.width / SHRINK_FACTOR;

    resizedContext.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
    var mask = resizedCanvas.toDataURL();

    resizedContext.globalCompositeOperation = "destination-over";
    resizedContext.drawImage(background, 0, 0, resizedCanvas.width, resizedCanvas.height);
    var image = resizedCanvas.toDataURL();

    data = { 'image': image, 'mask': mask };

    showElement(document.getElementsByClassName("loading")[0]);

    fetch('https://94020dfc7164.ngrok.io/process?' + Date.now(), {
        method: 'POST',
        body: JSON.stringify(data),
    })
        .then(response => response.blob())
        .then(image => {
            var reader = new FileReader();
            reader.readAsDataURL(image);
            reader.onloadend = function () {
                var base64data = reader.result;

                //hide canvases and process button, close loading overlay 
                hideElement(document.getElementById("process"));
                hideElement(document.getElementById("canvas"));
                hideElement(document.getElementById("backgroundCanvas"));
                hideElement(document.getElementsByClassName("loading")[0]);

                //show output image and resize to fit screen
                var finalImage = document.getElementById("output");
                finalImage.src = base64data;
                showElement(finalImage);
                finalImage.onload = () => {
                    finalImage.width = finalImage.width * SHRINK_FACTOR;
                }
            }

            alert("Processing complete! Press and hold on the image to save it.");
        })
        .catch(err => {
            hideElement(document.getElementsByClassName("loading")[0]);
            alert("Unable to connect to the server. Please try again later.");
            location.reload();
        });
}