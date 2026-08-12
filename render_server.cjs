const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9999;
const OUT_DIR = '/Volumes/DADAfiles/TOMFOX/top_picks_frames';

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Renderer</title>
    <style>
        body { background: #333; color: white; font-family: sans-serif; text-align: center; padding-top: 50px; }
        canvas { display: none; } /* Hide canvas to speed up rendering */
    </style>
</head>
<body>
    <h1>Rendering Frames...</h1>
    <h2 id="status">Starting...</h2>
    <canvas id="featuredSun"></canvas>
    
    <script>
        const canvas = document.getElementById('featuredSun');
        const ctx = canvas.getContext('2d', { alpha: true });
        
        const W = 1920;
        const H = 1080;
        canvas.width = W;
        canvas.height = H;

        const DEG = Math.PI / 180;
        const TWO_PI = Math.PI * 2;
        const RINGS = 4;
        const PPS = 24;
        const DUR = 30; // 30 seconds
        const DELAYS = [0, 7.5, 15, 22.5];
        const DIRS = [1, -1, 1, -1];

        const pDefs = Array.from({ length: RINGS }, (_, ri) =>
            Array.from({ length: PPS }, (_, pi) => ({
                angle: -75 + (pi * 150 / 23) + Math.sin(pi * 3.14 + ri) * 1.5,
                r: 0.5 + Math.abs(Math.sin(pi * 7 + ri)) * 3,
            }))
        );

        let sc = Math.max(W / 400, H / 80);
        let ox = (W - 400 * sc) / 2;
        let oy = H - 80 * sc;

        let sunX = 0 * sc + ox;
        let sunY = 640 * sc + oy;
        let sunR = 600 * sc;
        let glowR = 624 * sc;

        let gy1 = 80 * sc + oy;
        let gy0 = oy;

        const dGrad = ctx.createLinearGradient(sunX, gy1, sunX, gy0);
        dGrad.addColorStop(0, 'rgba(34, 46, 80, 0.9)');
        dGrad.addColorStop(0.6, 'rgba(126, 112, 54, 0.9)');
        dGrad.addColorStop(1, 'rgba(156, 137, 66, 0.9)');

        const bGrad = ctx.createLinearGradient(sunX, gy1, sunX, gy0);
        bGrad.addColorStop(0, 'rgba(34, 46, 80, 0.9)');
        bGrad.addColorStop(0.6, 'rgba(213, 193, 94, 0.9)');
        bGrad.addColorStop(1, 'rgba(233, 217, 133, 0.9)');

        const gGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
        gGrad.addColorStop(0.96, 'rgba(233,217,133,1)');
        gGrad.addColorStop(1, 'rgba(233,217,133,0)');

        const drawFrame = (t) => {
            ctx.clearRect(0, 0, W, H);

            ctx.globalAlpha = 0.3;
            ctx.fillStyle = gGrad;
            ctx.beginPath();
            ctx.arc(sunX, sunY, glowR, 0, TWO_PI);
            ctx.fill();
            ctx.globalAlpha = 1;

            for (let ri = 0; ri < RINGS; ri++) {
                const prog = ((t + DELAYS[ri]) % DUR) / DUR;

                const rOp = prog < 0.1
                    ? (prog / 0.1) * 0.8
                    : ((1 - prog) / 0.9) * 0.8;

                if (rOp > 0.001) {
                    ctx.beginPath();
                    ctx.arc(sunX, sunY, (580 + prog * 420) * sc, 0, TWO_PI);
                    ctx.strokeStyle = \`rgba(233,217,133,\${rOp.toFixed(3)})\`;
                    ctx.lineWidth = 0.3 * sc;
                    ctx.stroke();
                }

                const pOp = prog < 0.1 ? prog / 0.1 : (1 - prog) / 0.9;

                if (pOp > 0.001) {
                    const drift = DIRS[ri] * 25 * prog;
                    const pY_vb = 60 + prog * (-420);
                    const dy = (pY_vb - 640) * sc;

                    ctx.fillStyle = '#E9D985';
                    ctx.globalAlpha = pOp;

                    ctx.beginPath();
                    for (const p of pDefs[ri]) {
                        const rad = (p.angle + drift) * DEG;
                        const sinA = Math.sin(rad);
                        const cosA = Math.cos(rad);
                        const px = sunX - dy * sinA;
                        const py = sunY + dy * cosA;
                        ctx.moveTo(px + p.r * sc, py);
                        ctx.arc(px, py, p.r * sc, 0, TWO_PI);
                    }
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }

            ctx.fillStyle = dGrad;
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunR, 0, TWO_PI);
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.fillStyle = bGrad;
            ctx.beginPath();
            ctx.arc(sunX, sunY, sunR, 0, TWO_PI);
            ctx.fill();
            ctx.globalAlpha = 1;
        };

        const fps = 60;
        const totalFrames = DUR * fps; // 1800 frames

        async function start() {
            for (let i = 0; i < totalFrames; i++) {
                const exactTime = i / fps;
                drawFrame(exactTime);
                
                const dataUrl = canvas.toDataURL('image/png');
                
                document.getElementById('status').innerText = \`Saving frame \${i + 1} of \${totalFrames}...\`;
                
                await fetch('/save-frame', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        frameIndex: i,
                        image: dataUrl
                    })
                });
            }
            document.getElementById('status').innerText = "DONE! You can close this window.";
            
            await fetch('/done', { method: 'POST' });
        }
        
        setTimeout(start, 500);
    </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlContent);
    } else if (req.url === '/save-frame' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const data = JSON.parse(body);
            const base64Data = data.image.replace(/^data:image\/png;base64,/, "");
            const frameNum = String(data.frameIndex).padStart(4, '0');
            const filePath = path.join(OUT_DIR, `frame_${frameNum}.png`);
            
            fs.writeFile(filePath, base64Data, 'base64', (err) => {
                if (err) console.error(err);
                res.writeHead(200);
                res.end();
            });
        });
    } else if (req.url === '/done') {
        console.log("All frames generated successfully! The Node server will now exit.");
        res.writeHead(200);
        res.end();
        process.exit(0);
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`Open this URL in Chrome to automatically render the PNG sequence.`);
});
