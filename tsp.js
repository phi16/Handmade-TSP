var points = [];
var origin = {x:0,y:0,z:1};
var originMot = {x:0,y:0,z:1};
var caseName = "";
var score = 0;

var defPoints = [];
var defOrigins = [];

function load(x){
  points = defPoints[x];
  origin = {x:defOrigins[x].x,y:defOrigins[x].y,z:defOrigins[x].z};
  caseName = ["small5","rand20","tsp225","rand1000","tech30000"][x];
  draw();
}

var Render = (ctx)=>{
  var r = {};
  ctx.lineCap = ctx.lineJoin = "round";
  var zoom = 1;
  r.color = (c)=>{
    ctx.fillStyle = c;
    ctx.strokeStyle = c;
    return r;
  };
  r.line = (x1,y1,x2,y2)=>{
    ctx.beginPath();
    ctx.lineWidth = 1.0/zoom;
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
  }
  r.text = (t,x,y,s)=>{
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = s + "px Consolas";
    r.translated(x,y,()=>{
      r.scaled(1/zoom,()=>{
        ctx.fillText(t,0,0);
      });
    });
  };
  r.circle = (x,y,r)=>{
    ctx.beginPath();
    ctx.arc(x,y,r/zoom,0,2*Math.PI,false);
    ctx.fill();
  };
  r.translated = (x,y,f)=>{
    ctx.save();
    ctx.translate(x,y);
    f();
    ctx.restore();
  };
  r.rotated = (a,f)=>{
    ctx.save();
    ctx.rotate(a);
    f();
    ctx.restore();
  };
  r.scaled = (d,f)=>{
    ctx.save();
    ctx.scale(d,d);
    var zs = zoom;
    zoom *= d;
    f();
    zoom = zs;
    ctx.restore();
  };
  return r;
};

var draw;
function initCanvas(){
  var cvs = document.getElementById("canvas");
  var ctx = cvs.getContext('2d');
  var R = Render(ctx);
  draw = ()=>{
    ctx.clearRect(0,0,cvs.width,cvs.height);
    R.translated(cvs.width/2,cvs.height/2,()=>{
      R.scaled(1/origin.z,()=>{
        R.translated(-origin.x,-origin.y,()=>{
          points.forEach((a,i)=>{
            R.color("#fff");
            R.text(i,a[0]+1,a[1]+1,20.0);
            R.circle(a[0],a[1],2.0);
          });
        });
      });
    });
    var ok = true;
    var errMsg = "";
    var done = {};
    var befPt = -1;
    score = 0;
    var fstPoint = 0;
    var pointCnt = 0;
    var ix = -1;
    R.translated(cvs.width/2,cvs.height/2,()=>{
      R.scaled(1/origin.z,()=>{
        R.translated(-origin.x,-origin.y,()=>{
          document.getElementById("input").value.split(" ").forEach((i)=>{
            if(!ok || i=="")return;
            ix = parseInt(i);
            if(isNaN(ix) || ix>=points.length)errMsg="Format Error",ok=false;
            else{
              if(done[ix]){
                errMsg = "Duplicate point : " + ix;
                ok = false;
              }else{
                R.color("#ff0");
                R.circle(points[ix][0],points[ix][1],2.5);
                if(befPt!=-1){
                  R.line(points[befPt][0],points[befPt][1],points[ix][0],points[ix][1]);
                  var dx = points[befPt][0]-points[ix][0];
                  var dy = points[befPt][1]-points[ix][1];
                  score += Math.round(Math.sqrt(dx*dx+dy*dy));
                }else fstPoint = ix;
                pointCnt++;
                done[ix]=true;
                befPt = ix;
              }
            }
          });
          if(ix>=0 && pointCnt == points.length){
            R.line(points[fstPoint][0],points[fstPoint][1],points[ix][0],points[ix][1]);
            var dx = points[fstPoint][0]-points[ix][0];
            var dy = points[fstPoint][1]-points[ix][1];
            score += Math.round(Math.sqrt(dx*dx+dy*dy));
          }
        });
      });
    });
    R.color("#fff");
    R.text(caseName,10,10,30);
    if(pointCnt==points.length)R.color("#ff0");
    R.text("Score:"+score,10,40,30);
    R.color("#f70");
    R.text(errMsg,10,70,30);
  };
  draw();
}

var LoadFrom = (url,cb)=>{
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if(this.readyState == 4 && this.status == 200){
      cb(this.responseText);
    }
  };
  xhr.open('GET',url);
  xhr.send();
};

function initialize(){
  var au = ["/small5.in","/rand20.in","/tsp225.in","/rand1000.in","tech30000.in"];
  var cnt = 0;
  au.forEach((v,i)=>{
    LoadFrom(v,((i)=>(x)=>{
      defPoints[i] = [];
      defOrigins[i] = [];
      var y=false,xi,xa,yi,ya;
      x.split("\n").forEach((l)=>{
        var a = [];
        l.split(" ").forEach((p)=>{
          a.push(parseFloat(p));
        });
        a[1]*=-1;
        if(!y){
          y=true;
          xi=xa=a[0];
          yi=ya=a[1];
        }else{
          if(xi > a[0])xi = a[0];
          if(yi > a[1])yi = a[1];
          if(xa < a[0])xa = a[0];
          if(ya < a[1])ya = a[1];
        }
        defPoints[i].push(a);
      });
      var z = ((ya-yi)+(xa-xi))/600;
      defOrigins[i] = {x:(xi+xa)/2,y:(yi+ya)/2,z:z};
      cnt++;
      if(cnt==5){
        initCanvas();
        load(2);
      }
    })(i));
  });
}

window.onload = ()=>{
  var resize = ()=>{
    document.getElementById("canvas").width = document.getElementById("full").clientWidth;
    document.getElementById("canvas").height = document.getElementById("full").clientHeight-120;
    if(draw)draw();
  };
  resize();
  window.onresize = resize;
  initialize();
};

window.oncontextmenu=()=>false;
var drag=false,dragX,dragY;
window.onmousedown = (e)=>{
  if(e.button==2){
    drag = true;
    dragX = e.clientX;
    dragY = e.clientY;
  }
};
window.onmousemove = (e)=>{
  if(e.button==2){
    origin.x -= (e.clientX - dragX)*origin.z;
    origin.y -= (e.clientY - dragY)*origin.z;
    dragX = e.clientX;
    dragY = e.clientY;
    draw();
  }
};
window.onmouseup = (e)=>{
  if(e.button==2){
    drag = false;
  }
};
window.onmousewheel = (e)=>{
  var cvs = document.getElementById("canvas").getBoundingClientRect();
  origin.x += (e.clientX-cvs.left-cvs.width/2) * origin.z;
  origin.y += (e.clientY-cvs.top-cvs.height/2) * origin.z;
  if(e.wheelDelta < 0){
    origin.z *= 1.5;
  }else{
    origin.z /= 1.5;
  }
  origin.x -= (e.clientX-cvs.left-cvs.width/2) * origin.z;
  origin.y -= (e.clientY-cvs.top-cvs.height/2) * origin.z;
  draw();
}