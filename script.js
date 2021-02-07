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
                // bctx.drawImage(background, 0, 0);

    
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
            }
        };

        reader.readAsDataURL(input.files[0]);
        init();
    }
}

function saveImage(e) {
    var image = canvas.toDataURL(encoderOptions = 1);
    var link = document.createElement('a');
    link.download = "mask.png";
    link.href = image;
    link.click();

    ctx.globalCompositeOperation = "destination-over";
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    image = canvas.toDataURL(encoderOptions = 1);
    link.download = "input.png";
    link.href = image;
    link.click();
}