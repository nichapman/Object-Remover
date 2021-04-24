var canvas, ctx, backgroundCanvas, bctx, touchX, touchY, background;

const CANVAS_WIDTH_PERCENTAGE = 0.95;
const CANVAS_HEIGHT_PERCENTAGE = 0.75;
const MODEL_INPUT_MAX_DIMENSION = 680;

const BACKEND_URL = "https://031cbb705808.ngrok.io";
const PROCESS_ENDPOINT = "/process";

// https://stackoverflow.com/questions/45610164/set-viewport-to-match-physical-pixels/45644115
var contentWidth = document.documentElement.clientWidth * window.devicePixelRatio;
viewport = document.querySelector("meta[name=viewport]");
viewport.setAttribute('content', 'width=' + contentWidth);
document.documentElement.style.transform = 'scale( 1 / window.devicePixelRatio )';
document.documentElement.style.transformOrigin = 'top left';

window.onload = function (e) {
    initCanvases();

    canvas.width = window.innerWidth * window.devicePixelRatio * CANVAS_WIDTH_PERCENTAGE;
    canvas.height = window.innerHeight * window.devicePixelRatio * CANVAS_HEIGHT_PERCENTAGE;
    backgroundCanvas.width = canvas.width;
    backgroundCanvas.height = canvas.height;
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker
            .register("/serviceWorker.js")
            .then(res => console.log("service worker registered"))
            .catch(err => console.log("service worker not registered", err))
    })
}

function initCanvases() {
    canvas = document.getElementById('canvas');
    backgroundCanvas = document.getElementById('backgroundCanvas');
    ctx = canvas.getContext('2d');
    bctx = backgroundCanvas.getContext('2d');
}

function showElement(element) {
    element.style.display = "block";
}

function hideElement(element) {
    element.style.display = "none";
}

// Sketchpad logic credit to: https://zipso.net/a-simple-touchscreen-sketchpad-using-javascript-and-html5/
// ------------->
function draw(e) {
    getTouchPos(e);
    drawDot(ctx, touchX, touchY);
    // Prevent a scrolling action as a result of this touchmove triggering.
    event.preventDefault();
}

function drawDot(ctx, x, y) {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
}

function getTouchPos(e) {
    if (!e)
        var e = event;

    if (e.touches) {
        if (e.touches.length == 1) {
            var touch = e.touches[0];
            touchX = touch.pageX - touch.target.offsetLeft;
            touchY = touch.pageY - touch.target.offsetTop;
        }
    }
}
// <-------------

function displayImage(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {
            background = new Image();
            background.src = e.target.result;
            background.onload = function () {
                var imageWidth = this.width;
                var imageHeight = this.height;
                var widthDownscaleFactor = 0;
                var heightDownscaleFactor = 0;
                var finalDownscaleFactor;
                var scaleDown = false;

                // calculate the scaled down width and height of the image to fit the canvas
                if (imageWidth > canvas.width) {
                    widthDownscaleFactor = imageWidth / canvas.width;
                    scaleDown = true;
                }

                if (imageHeight > canvas.height) {
                    heightDownscaleFactor = imageHeight / canvas.height ;
                    scaleDown = true;
                }

                if (scaleDown) {
                    finalDownscaleFactor = Math.max(widthDownscaleFactor, heightDownscaleFactor);
                    imageWidth /= finalDownscaleFactor;
                    imageHeight /= finalDownscaleFactor;
                }

                canvas.width = imageWidth;
                backgroundCanvas.width = imageWidth;
                canvas.height = imageHeight;
                backgroundCanvas.height = imageHeight;

                bctx.drawImage(this, 0, 0, imageWidth, imageHeight);

                alert("Upload complete! Draw on the image to indicate the area to be removed.");
            }
        };

        reader.readAsDataURL(input.files[0]);
        showElement(document.getElementById("process"));
        showElement(document.getElementById("refresh"));
        hideElement(document.getElementById("upload"));

        canvas.addEventListener('touchstart', draw, false);
        canvas.addEventListener('touchmove', draw, false);
    }
}

function processImage(e) {
    //create canvas for downsizing the image for faster processing
    var resizedCanvas = document.createElement("canvas");
    var resizedContext = resizedCanvas.getContext("2d");
    var shrinkPercentage = 1;

    //shrink image so that the biggest dimension is 680
    if (canvas.height > MODEL_INPUT_MAX_DIMENSION || canvas.width > MODEL_INPUT_MAX_DIMENSION) {
        if (canvas.height > canvas.width) {
            shrinkPercentage = MODEL_INPUT_MAX_DIMENSION / canvas.height;
        } else {
            shrinkPercentage = MODEL_INPUT_MAX_DIMENSION / canvas.width;
        }
    }

    //draw mask onto scaled down canvas
    resizedCanvas.height = canvas.height * shrinkPercentage;
    resizedCanvas.width = canvas.width * shrinkPercentage;
    resizedContext.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);

    //export the mask in dataURL format
    var mask = resizedCanvas.toDataURL();

    //draw input image behind mask
    resizedContext.globalCompositeOperation = "destination-over";
    resizedContext.drawImage(background, 0, 0, resizedCanvas.width, resizedCanvas.height);

    //export the combined mask and image in dataURL format
    var image = resizedCanvas.toDataURL();

    //show loading overlay, disable further mask drawing
    showElement(document.getElementsByClassName("loading")[0]);
    canvas.removeEventListener('touchstart', startDrawing);
    canvas.removeEventListener('touchmove', doDrawing);

    data = { 'image': image, 'mask': mask };

    fetch(BACKEND_URL + PROCESS_ENDPOINT + '?' + Date.now(), {
        method: 'POST',
        body: JSON.stringify(data),
    })
        .then(response => response.blob())
        .then(image => {
            alert("Processing complete! Press and hold on the image to save it.");

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
                    finalImage.width = finalImage.width / shrinkPercentage;
                }
            }
        })
        .catch(err => {
            //connection to the backend is unsuccessful: hide loading overlay, output error message and refresh
            hideElement(document.getElementsByClassName("loading")[0]);
            alert("Unable to connect to the server. Please try again later.");
            location.reload();
        });
}