(function(){
"use strict";

var ALIENS = [
    {name:"HEATBLAST",   species:"PYRONITE",           power:"Pyrokinesis",        img:"image/1.png"},
    {name:"FOUR ARMS",   species:"TETRAMAND",          power:"Super Strength",     img:"image/2.png"},
    {name:"XLR8",        species:"KINECELERAN",         power:"Hyper Speed",        img:"image/3.png"},
    {name:"DIAMONDHEAD", species:"PETROSAPIEN",         power:"Crystal Generation", img:"image/4.png"},
    {name:"UPGRADE",     species:"GALVANIC MECHAMORPH", power:"Tech Possession",    img:"image/5.png"},
    {name:"GHOSTFREAK",  species:"ECTONURITE",          power:"Intangibility",      img:"image/6.png"},
    {name:"RIPJAWS",     species:"PISCCISS VOLANN",     power:"Aquatic Combat",     img:"image/7.png"},
    {name:"STINKFLY",    species:"LEPIDOPTERRAN",       power:"Flight / Toxin",     img:"image/8.png"},
    {name:"WILDMUTT",    species:"VULPIMANCER",         power:"Enhanced Senses",    img:"image/9.png"},
    {name:"GREY MATTER", species:"GALVAN",              power:"Super Intelligence", img:"image/10.png"}
];

var CDMAX = 10;
var COOLDOWN = 3000;
var CIRC = 2 * Math.PI * 88;

// State
var phase = "idle"; // idle, active, transformed, cooldown
var currentAlien = 0;
var busy = false;
var cdVal = CDMAX;
var cdTimer = null;
var dialRot = 0;
var mouseX = 0;
var mouseY = 0;

// DOM
function $(id){ return document.getElementById(id); }
var flashEl = $("flash");
var statusEl = $("status-text");
var modeEl = $("mode-tag");
var indicatorEl = $("indicator");
var holoEl = $("holo");
var cfTrackEl = $("cf-track");
var holoNameEl = $("holo-name");
var holoSubEl = $("holo-sub");
var arrowsEl = $("arrows");
var pageNumEl = $("page-num");
var slamBoxEl = $("slam-box");
var timerEl = $("timer");
var timerNumEl = $("timer-num");
var timerFillEl = $("timer-fill");
var timerLabelEl = $("timer-label");
var hintEl = $("hint");
var alienBgEl = $("alien-bg");
var alienBgImgEl = $("alien-bg-img");
var alienBgTextEl = $("alien-bg-text");

// ===================== AUDIO =====================
var actx = null;
function ac(){ if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)(); return actx; }
function noise(d,v,f){
    var c=ac(),n=c.sampleRate*d,b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);
    for(var i=0;i<n;i++) a[i]=(Math.random()*2-1)*Math.exp(-i/(n*.08));
    var s=c.createBufferSource(),g=c.createGain(),fl=c.createBiquadFilter();
    s.buffer=b;fl.type="lowpass";fl.frequency.value=f||4000;g.gain.value=v||.1;
    s.connect(fl);fl.connect(g);g.connect(c.destination);s.start();
}
function tone(fr,d,ty,v,sl){
    var c=ac(),o=c.createOscillator(),g=c.createGain();
    o.type=ty||"sine";o.frequency.setValueAtTime(fr,c.currentTime);
    if(sl) o.frequency.exponentialRampToValueAtTime(sl,c.currentTime+d);
    g.gain.setValueAtTime(v||.1,c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d);
    o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+d);
}
function sfxHum(){
    var c=ac(),o=c.createOscillator(),g=c.createGain(),l=c.createOscillator(),lg=c.createGain();
    o.type="sine";o.frequency.value=55;l.type="sine";l.frequency.value=.4;lg.gain.value=8;
    l.connect(lg);lg.connect(o.frequency);o.connect(g);g.connect(c.destination);g.gain.value=.02;
    o.start();l.start();
}
function sfxActivate(){ tone(80,.6,"sawtooth",.12,400);tone(1400,.04,"square",.08);noise(.25,.1,3000);setTimeout(function(){tone(600,.3,"sine",.06,1200)},100); }
function sfxClick(){ tone(2200,.04,"sine",.07,900);noise(.02,.04,8000); }
function sfxSlam(){ tone(120,1.2,"sine",.35,25);noise(.5,.25,600);tone(200,.5,"sawtooth",.12,2000);setTimeout(function(){tone(60,.8,"sine",.2,20);noise(.3,.15,400)},80); }
function sfxBeep(fast){ tone(fast?2000:1200,fast?.05:.1,"square",.08); }
function sfxDown(){ tone(800,1.2,"sawtooth",.1,35);tone(400,.8,"sine",.06,50);noise(.4,.08,800); }

// ===================== ALIEN BACKGROUND =====================
function showAlienBg(idx){
    var alien = ALIENS[idx];
    alienBgImgEl.src = alien.img;
    alienBgTextEl.textContent = alien.name;
    alienBgEl.classList.remove("red");
    // Force reflow before adding class
    void alienBgEl.offsetWidth;
    alienBgEl.classList.add("on");
}

function redAlienBg(){
    alienBgEl.classList.add("red");
}

function hideAlienBg(){
    alienBgEl.classList.remove("on");
    // After transition completes, clean up
    setTimeout(function(){
        alienBgEl.classList.remove("red");
        alienBgImgEl.src = "";
        alienBgTextEl.textContent = "";
    }, 1100);
}

// ===================== THREE.JS =====================
var scene, camera, renderer, clock;
var watchGrp, fpGrp, coreGrp, dialGrp;
var coreMat, coreLight, hgMat, particles;
var raycast, rayVec;

function init3D(){
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000005, .005);

    // Camera: high, looking way down so watch appears in bottom 30%
    camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, .1, 500);
    camera.position.set(0, 7, 7.5);
    camera.lookAt(0, -3.5, 0);

    renderer = new THREE.WebGLRenderer({ canvas: $("c"), antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;

    raycast = new THREE.Raycaster();
    rayVec = new THREE.Vector2();

    // Lights
    scene.add(new THREE.AmbientLight(0x223344, .5));
    var sun = new THREE.DirectionalLight(0xffffff, .7);
    sun.position.set(5,10,6); sun.castShadow = true; scene.add(sun);
    var rim = new THREE.DirectionalLight(0x4466ff, .25);
    rim.position.set(-5,3,-5); scene.add(rim);
    var spot = new THREE.SpotLight(0xffffff, .4, 30, Math.PI/5, .5);
    spot.position.set(0,8,6); scene.add(spot);
    var up = new THREE.PointLight(0x00ff41, .4, 12);
    up.position.set(0,-3,2); scene.add(up);

    makeWatch();
    makeParticles();
    render();

    window.addEventListener("resize", function(){
        camera.aspect = innerWidth/innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });
    $("c").addEventListener("pointerdown", onClick3D);
    $("c").addEventListener("pointermove", function(e){
        mouseX = (e.clientX/innerWidth - .5)*2;
        mouseY = (e.clientY/innerHeight - .5)*2;
    });
}

function makeWatch(){
    watchGrp = new THREE.Group();
    // Watch position: slightly above bottom
    watchGrp.position.set(0, -3.8, 0);
    watchGrp.rotation.x = -.38;
    scene.add(watchGrp);

    var bA = new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.55,metalness:.35});
    var bB = new THREE.MeshStandardMaterial({color:0x252525,roughness:.45,metalness:.4});
    var rivM = new THREE.MeshStandardMaterial({color:0x666666,metalness:.9,roughness:.15});

    [-1,1].forEach(function(side){
        for(var i=0;i<4;i++){
            var m = new THREE.Mesh(new THREE.BoxGeometry(1.5-i*.04,.32-i*.015,2), i%2===0?bA:bB);
            m.position.set(side*(2.8+i*1.2),-.08,0); m.castShadow=true; watchGrp.add(m);
        }
        for(var j=0;j<3;j++){
            var r = new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.12,8),rivM);
            r.position.set(side*(3.2+j*1.1),.12,.55); r.rotation.x=Math.PI/2; watchGrp.add(r);
            var r2=r.clone(); r2.position.z=-.55; watchGrp.add(r2);
        }
    });

    var body = new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,.65,48),
        new THREE.MeshStandardMaterial({color:0x3a3a3a,roughness:.3,metalness:.88}));
    body.castShadow=true; watchGrp.add(body);

    var eM = new THREE.MeshStandardMaterial({color:0x555555,metalness:.95,roughness:.12});
    [.28,-.28].forEach(function(y){
        var e = new THREE.Mesh(new THREE.TorusGeometry(2.63,.06,8,64),eM);
        e.rotation.x=Math.PI/2; e.position.y=y; watchGrp.add(e);
    });

    dialGrp = new THREE.Group(); watchGrp.add(dialGrp);
    var dr = new THREE.Mesh(new THREE.TorusGeometry(2.75,.16,12,64),
        new THREE.MeshStandardMaterial({color:0x4a4a4a,roughness:.25,metalness:.92}));
    dr.rotation.x=Math.PI/2; dialGrp.add(dr);

    var nM = new THREE.MeshStandardMaterial({color:0x777777,metalness:.92,roughness:.15});
    for(var i=0;i<12;i++){
        var a=(i/12)*Math.PI*2;
        var n = new THREE.Mesh(new THREE.BoxGeometry(.1,.35,.22),nM);
        n.position.set(Math.cos(a)*2.75,.12,Math.sin(a)*2.75);
        n.lookAt(new THREE.Vector3(0,.12,0)); dialGrp.add(n);
    }

    var dM = new THREE.MeshStandardMaterial({color:0x00ff41,emissive:0x00ff41,emissiveIntensity:.5});
    for(var d=0;d<10;d++){
        var da=(d/10)*Math.PI*2;
        var dot = new THREE.Mesh(new THREE.SphereGeometry(.05,8,8),dM);
        dot.position.set(Math.cos(da)*2.35,.34,Math.sin(da)*2.35); dialGrp.add(dot);
    }

    [-1,1].forEach(function(s){
        var b = new THREE.Mesh(new THREE.BoxGeometry(.25,.18,.45),
            new THREE.MeshStandardMaterial({color:0x555555,metalness:.82,roughness:.25}));
        b.position.set(s*2.78,.08,0); watchGrp.add(b);
    });

    fpGrp = new THREE.Group(); fpGrp.position.y=.33; watchGrp.add(fpGrp);
    var fp = new THREE.Mesh(new THREE.BoxGeometry(3.2,.22,3.2),
        new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:.35,metalness:.82}));
    fp.castShadow=true; fpGrp.add(fp);
    var bev = new THREE.Mesh(new THREE.BoxGeometry(3.4,.08,3.4),
        new THREE.MeshStandardMaterial({color:0x444444,metalness:.92,roughness:.15}));
    bev.position.y=.12; fpGrp.add(bev);

    hgMat = new THREE.MeshStandardMaterial({
        color:0x00ff41,emissive:0x00ff41,emissiveIntensity:.35,
        roughness:.5,metalness:.2,transparent:true,opacity:.9
    });
    var ts = new THREE.Shape(); ts.moveTo(-.75,0); ts.lineTo(0,1); ts.lineTo(.75,0); ts.closePath();
    var tH = new THREE.Mesh(new THREE.ExtrudeGeometry(ts,{depth:.05,bevelEnabled:false}),hgMat);
    tH.rotation.x=-Math.PI/2; tH.position.set(0,.17,-.08); fpGrp.add(tH);
    var bs = new THREE.Shape(); bs.moveTo(-.75,0); bs.lineTo(0,-1); bs.lineTo(.75,0); bs.closePath();
    var bH = new THREE.Mesh(new THREE.ExtrudeGeometry(bs,{depth:.05,bevelEnabled:false}),hgMat);
    bH.rotation.x=-Math.PI/2; bH.position.set(0,.17,.08); fpGrp.add(bH);

    var cMt = new THREE.MeshStandardMaterial({color:0x555555,metalness:.9,roughness:.15});
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function(p){
        var h = new THREE.Mesh(new THREE.BoxGeometry(.45,.06,.06),cMt);
        h.position.set(p[0]*1.25,.17,p[1]*1.3); fpGrp.add(h);
        var v = new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.45),cMt);
        v.position.set(p[0]*1.3,.17,p[1]*1.25); fpGrp.add(v);
    });

    coreGrp = new THREE.Group(); coreGrp.position.y=.5; fpGrp.add(coreGrp);

    coreMat = new THREE.MeshStandardMaterial({
        color:0x00ff41,emissive:0x00ff41,emissiveIntensity:.5,
        roughness:.28,metalness:.5
    });
    var core = new THREE.Mesh(new THREE.CylinderGeometry(.65,.65,.22,32),coreMat);
    core.castShadow=true; coreGrp.add(core);

    var cr = new THREE.Mesh(new THREE.TorusGeometry(.68,.035,8,32),
        new THREE.MeshStandardMaterial({color:0x888888,metalness:.95,roughness:.1}));
    cr.rotation.x=Math.PI/2; cr.position.y=.08; coreGrp.add(cr);

    coreLight = new THREE.PointLight(0x00ff41,1.8,8);
    coreLight.position.y=.5; coreGrp.add(coreLight);

    var hl = new THREE.Mesh(new THREE.CircleGeometry(.25,16),
        new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.12}));
    hl.rotation.x=-Math.PI/2; hl.position.set(-.12,.12,-.12); coreGrp.add(hl);

    var gr = new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.ShadowMaterial({opacity:.25}));
    gr.rotation.x=-Math.PI/2; gr.position.y=-4; gr.receiveShadow=true; scene.add(gr);
}

function makeParticles(){
    var N=3000, geo=new THREE.BufferGeometry();
    var pos=new Float32Array(N*3), col=new Float32Array(N*3);
    for(var i=0;i<N;i++){
        pos[i*3]=(Math.random()-.5)*140;
        pos[i*3+1]=(Math.random()-.5)*90;
        pos[i*3+2]=(Math.random()-.5)*140-20;
        col[i*3]=Math.random()*.04;
        col[i*3+1]=.08+Math.random()*.15;
        col[i*3+2]=Math.random()*.04;
    }
    geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
    geo.setAttribute("color",new THREE.BufferAttribute(col,3));
    particles = new THREE.Points(geo, new THREE.PointsMaterial({
        size:.2,vertexColors:true,transparent:true,opacity:.4,
        blending:THREE.AdditiveBlending,sizeAttenuation:true,depthWrite:false
    }));
    scene.add(particles);
}

function setParticles(green){
    if(!particles) return;
    var c=particles.geometry.attributes.color.array;
    for(var i=0;i<c.length;i+=3){
        if(green){ c[i]=Math.random()*.04; c[i+1]=.08+Math.random()*.18; c[i+2]=Math.random()*.04; }
        else{ c[i]=.15+Math.random()*.1; c[i+1]=Math.random()*.03; c[i+2]=Math.random()*.03; }
    }
    particles.geometry.attributes.color.needsUpdate=true;
}

function setWatch(r,g,b){
    gsap.to(coreMat.color,{r:r,g:g,b:b,duration:.5});
    gsap.to(coreMat.emissive,{r:r,g:g,b:b,duration:.5});
    gsap.to(coreLight.color,{r:r,g:g,b:b,duration:.5});
    gsap.to(hgMat.color,{r:r,g:g,b:b,duration:.5});
    gsap.to(hgMat.emissive,{r:r,g:g,b:b,duration:.5});
}

function setUIGreen(){
    modeEl.style.borderColor = "rgba(0,255,65,.25)";
    modeEl.style.color = "var(--g)";
    indicatorEl.style.background = "var(--g)";
    indicatorEl.style.boxShadow = "0 0 5px var(--g),0 0 12px var(--g)";
}
function setUIRed(){
    modeEl.style.borderColor = "var(--r)";
    modeEl.style.color = "var(--r)";
    indicatorEl.style.background = "var(--r)";
    indicatorEl.style.boxShadow = "0 0 5px var(--r),0 0 12px var(--r)";
}

function onClick3D(e){
    rayVec.x = (e.clientX/innerWidth)*2-1;
    rayVec.y = -(e.clientY/innerHeight)*2+1;
    raycast.setFromCamera(rayVec, camera);
    var hits = raycast.intersectObjects(watchGrp.children, true);
    if(hits.length > 0 && !busy && phase === "idle"){
        var found = false;
        for(var h=0; h<hits.length; h++){
            var obj = hits[h].object;
            while(obj){
                if(obj === fpGrp || obj === coreGrp){ found=true; break; }
                obj = obj.parent;
            }
            if(found) break;
        }
        if(found) doActivate();
    }
}

function render(){
    requestAnimationFrame(render);
    var t = clock.getElapsedTime();

    if(particles){
        particles.rotation.y = t*.01;
        var p = particles.geometry.attributes.position.array;
        for(var i=1;i<p.length;i+=3) p[i]+=Math.sin(t+p[i-1]*.06)*.0012;
        particles.geometry.attributes.position.needsUpdate=true;
    }

    if(coreMat){
        var pulse;
        if(phase==="idle") pulse=.4+Math.sin(t*1.8)*.2;
        else if(phase==="transformed") pulse=.7+Math.sin(t*8)*.3;
        else pulse=.5+Math.sin(t*2.5)*.15;
        coreMat.emissiveIntensity=pulse;
        coreLight.intensity=1+pulse;
    }

    camera.position.x += (mouseX*.4 - camera.position.x)*.005;
    camera.position.y += (7+mouseY*.15 - camera.position.y)*.005;
    camera.lookAt(0,-3.5,0);

    renderer.render(scene,camera);
}

// ===================== COVERFLOW =====================
function buildCF(){
    cfTrackEl.innerHTML = "";
    for(var i=0; i<ALIENS.length; i++){
        (function(idx){
            var card = document.createElement("div");
            card.className = "cf-card";
            card.setAttribute("data-i", idx);

            var img = document.createElement("img");
            img.src = ALIENS[idx].img;
            img.alt = ALIENS[idx].name;
            img.draggable = false;
            img.onerror = function(){
                this.style.display="none";
                var fb = document.createElement("div");
                fb.style.cssText = "color:var(--g);font-size:10px;text-align:center;padding:15px;line-height:1.4";
                fb.innerHTML = ALIENS[idx].name + "<br><small style='font-size:7px;opacity:.4'>" + ALIENS[idx].img + "</small>";
                card.appendChild(fb);
            };
            card.appendChild(img);

            card.addEventListener("click", function(){
                if(phase !== "active" || busy) return;
                var target = parseInt(card.getAttribute("data-i"));
                if(target !== currentAlien) goTo(target);
            });

            cfTrackEl.appendChild(card);
        })(i);
    }
    layoutCF(currentAlien, false);
}

function layoutCF(active, anim){
    var cards = cfTrackEl.querySelectorAll(".cf-card");
    var w = window.innerWidth;
    var sp = w<500 ? 105 : w<700 ? 135 : 175;

    for(var i=0; i<cards.length; i++){
        var card = cards[i];
        var diff = i - active;
        var abs = Math.abs(diff);

        card.classList.remove("on");
        if(diff===0) card.classList.add("on");

        var tx, ry, sc, z, op;
        if(diff===0){ tx=0; ry=0; sc=1; z=100; op=1; }
        else if(abs===1){ tx=diff*sp; ry=-diff*55; sc=.6; z=-30; op=.75; }
        else if(abs===2){ tx=diff*sp*1.5; ry=-diff*63; sc=.4; z=-65; op=0; }
        else{ tx=diff*sp*1.6; ry=-diff*68; sc=.25; z=-90; op=0; }

        if(anim){
            gsap.to(card, {x:tx, rotateY:ry, scale:sc, z:z, opacity:op, duration:.5, ease:"power2.out", overwrite:true});
        } else {
            card.style.transform = "translate3d("+tx+"px,0,"+z+"px) rotateY("+ry+"deg) scale("+sc+")";
            card.style.opacity = op;
        }
        card.style.zIndex = diff===0 ? 100 : 50-abs;
        card.style.pointerEvents = abs<=2 ? "auto" : "none";
    }
}

function goTo(idx){
    if(busy) return;
    busy = true;
    sfxClick();
    currentAlien = idx;
    dialRot = (idx/ALIENS.length)*Math.PI*2;
    gsap.to(dialGrp.rotation, {y:dialRot, duration:.4, ease:"power2.out"});
    layoutCF(idx, true);
    updateText(idx);
    setTimeout(function(){ busy=false; }, 420);
}

function dial(dir){
    if(phase!=="active" || busy) return;
    goTo((currentAlien+dir+ALIENS.length)%ALIENS.length);
}

function updateText(i){
    var al = ALIENS[i];
    gsap.to(holoNameEl, {opacity:0, y:-5, duration:.08, onComplete:function(){
        holoNameEl.textContent = al.name;
        holoSubEl.textContent = al.species + " • " + al.power;
        pageNumEl.textContent = (i+1)+" / "+ALIENS.length;
        gsap.to(holoNameEl, {opacity:1, y:0, duration:.2});
    }});
    gsap.to(holoSubEl, {opacity:0, duration:.06, onComplete:function(){
        gsap.to(holoSubEl, {opacity:1, duration:.18, delay:.08});
    }});
}

// ===================== PHASES =====================
function doActivate(){
    busy = true;
    phase = "active";
    sfxActivate();

    flashEl.style.background = "radial-gradient(circle,rgba(0,255,65,.7),rgba(0,255,65,.2),transparent 70%)";
    gsap.timeline().to(flashEl,{opacity:.5,duration:.08}).to(flashEl,{opacity:0,duration:.4});

    var tl = gsap.timeline({onComplete:function(){ busy=false; doShowDialer(); }});
    tl.to(fpGrp.position, {y:1.1, duration:.5, ease:"back.out(2.5)"}, 0);
    tl.to(fpGrp.rotation, {x:-.2, duration:.5, ease:"back.out(2)"}, 0);
    tl.to(coreMat, {emissiveIntensity:.8, duration:.3}, .1);
    tl.to(coreLight, {intensity:2.5, duration:.3}, .1);

    statusEl.textContent = "OMNITRIX v10 — SELECTION MODE";
    modeEl.textContent = "ACTIVE";
    hintEl.innerHTML = '<kbd>←→</kbd> dial · <kbd>CLICK</kbd> alien · <kbd>ENTER</kbd> slam';
}

function doShowDialer(){
    currentAlien = 0;
    holoNameEl.textContent = ALIENS[0].name;
    holoSubEl.textContent = ALIENS[0].species+" • "+ALIENS[0].power;
    pageNumEl.textContent = "1 / "+ALIENS.length;

    buildCF();
    holoEl.classList.add("on");
    arrowsEl.classList.add("on");
    slamBoxEl.classList.add("on");

    var cards = cfTrackEl.querySelectorAll(".cf-card");
    for(var i=0;i<cards.length;i++){
        gsap.from(cards[i], {opacity:0, y:70, duration:.5, delay:.06+i*.025, ease:"power2.out"});
    }
}

function doSlam(){
    if(phase!=="active" || busy) return;
    busy = true;
    phase = "transformed";
    sfxSlam();

    // >>> SHOW ALIEN BACKGROUND <<<
    showAlienBg(currentAlien);

    // Hide holo
    gsap.to(holoEl, {opacity:0, scale:.5, duration:.18, ease:"power3.in", onComplete:function(){
        holoEl.classList.remove("on");
        holoEl.style.opacity = "";
        holoEl.style.transform = "translateX(-50%)";
    }});
    arrowsEl.classList.remove("on");
    slamBoxEl.classList.remove("on");

    // Slam faceplate
    var tl = gsap.timeline({onComplete:function(){ busy=false; doCountdown(); }});
    tl.to(fpGrp.position, {y:.1, duration:.05, ease:"power4.in"}, 0);
    tl.to(fpGrp.rotation, {x:.05, duration:.05, ease:"power4.in"}, 0);
    tl.to(fpGrp.position, {y:.33, duration:.2, ease:"bounce.out"}, .05);
    tl.to(fpGrp.rotation, {x:0, duration:.2, ease:"bounce.out"}, .05);

    // Shake canvas
    var cv = renderer.domElement;
    var shk = gsap.timeline();
    var steps = [{x:-12,y:5},{x:12,y:-5},{x:-8,y:-7},{x:8,y:7},{x:-4,y:3},{x:3,y:-2},{x:0,y:0}];
    for(var s=0;s<steps.length;s++){
        shk.to(cv.style,{transform:"translate3d("+steps[s].x+"px,"+steps[s].y+"px,0)",duration:steps[s].x===0?.1:.03,ease:"none"});
    }

    flashEl.style.background = "radial-gradient(circle,#fff,#39ff14,rgba(0,255,65,.5),transparent 80%)";
    gsap.timeline().to(flashEl,{opacity:1,duration:.04}).to(flashEl,{opacity:0,duration:.9,ease:"power2.out"});

    shockwave();
    statusEl.textContent = "TRANSFORMED → "+ALIENS[currentAlien].name;
    modeEl.textContent = "TRANSFORMED";
    hintEl.innerHTML = "<kbd>"+ALIENS[currentAlien].name+"</kbd> active — countdown";
}

function shockwave(){
    var grp = new THREE.Group();
    scene.add(grp);
    grp.position.copy(watchGrp.position); grp.position.y+=.6;
    var N=100,geo=new THREE.BufferGeometry(),pos=new Float32Array(N*3),vel=[];
    for(var i=0;i<N;i++){
        var a=Math.random()*Math.PI*2, e=(Math.random()-.5)*1.5, sp=3+Math.random()*6;
        pos[i*3]=0;pos[i*3+1]=0;pos[i*3+2]=0;
        vel.push(Math.cos(a)*sp,e*sp*.5,Math.sin(a)*sp);
    }
    geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
    var mat = new THREE.PointsMaterial({color:0x39ff14,size:.14,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false});
    grp.add(new THREE.Points(geo,mat));
    var st = performance.now();
    function tick(){
        var el=(performance.now()-st)/1000;
        if(el>1.3){scene.remove(grp);geo.dispose();mat.dispose();return;}
        var p=geo.attributes.position.array;
        for(var i=0;i<N;i++){p[i*3]+=vel[i*3]*.016;p[i*3+1]+=vel[i*3+1]*.016;p[i*3+2]+=vel[i*3+2]*.016;}
        geo.attributes.position.needsUpdate=true;
        mat.opacity=Math.max(0,1-el/.9);
        requestAnimationFrame(tick);
    }
    tick();
}

function doCountdown(){
    cdVal = CDMAX;
    timerNumEl.textContent = cdVal;
    timerFillEl.style.strokeDashoffset = "0";
    timerFillEl.style.stroke = "var(--g)";
    timerNumEl.style.color = "var(--g)";
    timerNumEl.style.textShadow = "0 0 6px var(--g)";
    timerLabelEl.textContent = "ACTIVE";
    timerEl.classList.add("on");

    var beepI = null;

    cdTimer = setInterval(function(){
        cdVal--;
        timerNumEl.textContent = cdVal;
        timerFillEl.style.strokeDashoffset = CIRC*(1-cdVal/CDMAX);

        if(cdVal > 3){
            sfxBeep(false);
        } else if(cdVal > 0){
            timerFillEl.style.stroke = "#ff3333";
            timerNumEl.style.color = "#ff3333";
            timerNumEl.style.textShadow = "0 0 6px #ff3333";
            timerLabelEl.textContent = "WARNING";
            if(!beepI){
                var speed = 250;
                function doBp(){
                    if(cdVal<=0){if(beepI)clearInterval(beepI);beepI=null;return;}
                    sfxBeep(true);
                    speed=Math.max(55,speed-28);
                    if(beepI)clearInterval(beepI);
                    beepI=setInterval(doBp,speed);
                }
                beepI=setInterval(doBp,speed);
            }
            gsap.to(coreMat.color,{r:1,g:.1,b:.1,duration:.08,yoyo:true,repeat:1});
            gsap.to(coreMat.emissive,{r:1,g:.1,b:.1,duration:.08,yoyo:true,repeat:1});
        }

        if(cdVal<=0){
            clearInterval(cdTimer); cdTimer=null;
            if(beepI){clearInterval(beepI);beepI=null;}
            doTimeout();
        }
    }, 1000);
}

function doTimeout(){
    phase = "cooldown";
    sfxDown();
    timerEl.classList.remove("on");

    // >>> ALIEN BG GOES RED <<<
    redAlienBg();

    flashEl.style.background = "radial-gradient(circle,rgba(255,26,26,.8),rgba(255,26,26,.3),transparent 70%)";
    gsap.timeline()
        .to(flashEl,{opacity:.6,duration:.08})
        .to(flashEl,{opacity:0,duration:.5})
        .to(flashEl,{opacity:.25,duration:.1})
        .to(flashEl,{opacity:0,duration:.4});

    gsap.to(fpGrp.position,{y:.33,duration:.4,ease:"power3.in"});
    gsap.to(fpGrp.rotation,{x:0,duration:.4,ease:"power3.in"});

    setWatch(1,.1,.1);
    setParticles(false);
    setUIRed();

    statusEl.textContent = "OMNITRIX v10 — RECHARGING...";
    modeEl.textContent = "RECHARGE";

    busy = true;

    setTimeout(function(){
        // >>> HIDE ALIEN BG <<<
        hideAlienBg();

        // Full reset
        phase = "idle";
        busy = false;
        currentAlien = 0;
        dialRot = 0;
        gsap.set(dialGrp.rotation,{y:0});

        setWatch(0,1,.25);
        setParticles(true);
        setUIGreen();

        statusEl.textContent = "OMNITRIX v10 — STANDBY";
        modeEl.textContent = "STANDBY";
        hintEl.innerHTML = '<kbd>CLICK</kbd> watch · <kbd>←→</kbd> dial · <kbd>ENTER</kbd> slam';
    }, COOLDOWN);
}

// ===================== INPUT =====================
$("arrow-l").addEventListener("click", function(){ dial(-1); });
$("arrow-r").addEventListener("click", function(){ dial(1); });
$("slam-btn").addEventListener("click", function(){ doSlam(); });

document.addEventListener("keydown", function(e){
    if(e.key==="ArrowLeft"||e.key==="a") dial(-1);
    else if(e.key==="ArrowRight"||e.key==="d") dial(1);
    else if(e.key==="Enter"||e.key===" "){
        e.preventDefault();
        if(phase==="idle") doActivate();
        else if(phase==="active") doSlam();
    }
});

document.addEventListener("wheel", function(e){
    if(phase!=="active") return;
    e.preventDefault();
    dial(e.deltaY>0?1:-1);
}, {passive:false});

var touchX=0;
document.addEventListener("touchstart",function(e){touchX=e.touches[0].clientX},{passive:true});
document.addEventListener("touchmove",function(e){
    if(phase!=="active") return;
    var d=e.touches[0].clientX-touchX;
    if(Math.abs(d)>35){dial(d<0?1:-1);touchX=e.touches[0].clientX;}
},{passive:true});

// ===================== START =====================
init3D();

var humDone=false;
function startHum(){if(!humDone){sfxHum();humDone=true;}}
document.addEventListener("click",startHum,{once:true});
document.addEventListener("keydown",startHum,{once:true});

gsap.from(watchGrp.scale,{x:.01,y:.01,z:.01,duration:1.4,ease:"elastic.out(1,0.5)",delay:.3});
gsap.from(watchGrp.rotation,{y:Math.PI,duration:1.4,ease:"power3.out",delay:.3});

console.log("%c🟢 OMNITRIX ONLINE","color:#39ff14;font-size:18px;font-weight:bold");

})();
