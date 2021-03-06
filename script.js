var canvas, ctx;
var backgroundCanvas, bctx;
var touchX, touchY;
var background;

function drawDot(ctx, x, y) {
    ctx.fillStyle = "white";

    // Draw a filled circle
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2, true);
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

// Get the touch position relative to the top-left of the canvas
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

function init() {
    canvas = document.getElementById('canvas');
    backgroundCanvas = document.getElementById('backgroundCanvas');

    if (canvas.getContext)
        ctx = canvas.getContext('2d');

    if (backgroundCanvas.getContext) {
        bctx = backgroundCanvas.getContext('2d');
    }

    if (ctx) {
        canvas.addEventListener('touchstart', sketchpad_touchStart, false);
        canvas.addEventListener('touchmove', sketchpad_touchMove, false);
    }
}

function displayImage(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {
            background = new Image();
            background.src = e.target.result;

            background.onload = function () {
                canvas.width = screen.width * 0.85;
                canvas.height = screen.height * 0.7;
                backgroundCanvas.width = screen.width * 0.85;
                backgroundCanvas.height = screen.height * 0.7;

                var canvasWidth = backgroundCanvas.width;

                var imageRatio = this.width / this.height;

                // Work out the new height of the canvas, keeping in ratio with the image
                var canvasHeight = canvasWidth / imageRatio;

                // Set the canvas' height in the style tag to be correct
                backgroundCanvas.width = canvasWidth;
                backgroundCanvas.height = canvasHeight;

                // Set the canvas' height in the style tag to be correct
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                // Draw the image at the right width/height
                bctx.drawImage(this, 0, 0, canvasWidth, canvasHeight);

                setTimeout(function () {
                    alert("Upload complete! Draw on the image to indicate the area to be removed.");
                }, 0);
            }
        };

        reader.readAsDataURL(input.files[0]);
        document.getElementById("process").style.display = "block";
        document.getElementById("upload").style.display = "none";

        init();
    }
}

function saveImage(e) {
    var image = canvas.toDataURL(encoderOptions = 1);
    var link = document.createElement('a');
    link.href = image;
    link.download = 'mask.png';
    link.click();

    ctx.globalCompositeOperation = "destination-over";
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    image = canvas.toDataURL(encoderOptions = 1);
    link.href = image;
    link.download = 'input.png';
    link.click();
}

function processImage(e) {
    var mask = canvas.toDataURL(encoderOptions = 1);

    ctx.globalCompositeOperation = "destination-over";
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    var image = canvas.toDataURL(encoderOptions = 1);

    data = { 'image': image, 'mask': mask };

    fetch('http://138.38.168.89:5000/process', {
        method: 'POST',
        body: JSON.stringify(data),
    })
        .then(response => {
            console.log(response)
        })
        .catch(err => {
            console.log(err)
        })

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bctx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);

    document.getElementsByClassName("loader")[0].style.visibility = "visible";

    //https://inpainting-306514.ew.r.appspot.com/
    //http://138.38.168.89:5000
    //http://192.168.0.35:5000
    fetch('http://138.38.168.89:5000/getOutput?' + Date.now())
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

                document.getElementById("process").style.display = "none";

                document.body.innerHTML = "<img id=\"output\" src=\"" + base64data + "\">";

                setTimeout(function () {
                    alert("Processing complete! Press and hold on the image to save it.");
                }, 0)
            }
        })
}