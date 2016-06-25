var LoadFrom = (url,cb)=>{
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if(this.readyState == 4 && this.status == 200){
      cb(this.responseText);
    }
  };
  xhr.open('GET',"/Handmade-TSP"+url);
  xhr.send();
};

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
  r.base = (x,y)=>{
    if(x<0){
      ctx.textAlign = "left";
    }else{
      ctx.textAlign = "right";
    }
    if(y<0){
      ctx.textBaseline = "top";
    }else{
      ctx.textBaseline = "bottom";
    }
    return r;
  };
  r.text = (t,x,y,s)=>{
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

var TSP = (()=>{
  var t = {};
  var defPoints = [];
  var defOrigins = [];

  var points = [];
  var pathIxs = [];
  var caseName = "";
  var score = 0;
  var path = [];
  var invalid = false;
  var complete = false;
  var enableNumber = true;

  var errMsg = "";

  t.available = ()=>{
    return !invalid;
  }
  t.init = (p,o)=>{
    defPoints = p;
    defOrigins = o;
  }
  t.load = (x)=>{
    points = defPoints[x];
    origin = {x:defOrigins[x].x,y:defOrigins[x].y,z:defOrigins[x].z};
    caseName = ["small5","rand20","tsp225","rand1000","tech30000"][x];
    t.calc();
  };
  t.switchNum = ()=>{
    if(enableNumber){
      enableNumber = false;
      document.getElementById("number").innerHTML = "[Number Off]";
    }else{
      enableNumber = true;
      document.getElementById("number").innerHTML = "[Number On]";
    }
    draw();
  };
  t.render = (R)=>{
    R.base(-1,-1);
    points.forEach((a,i)=>{
      R.color("#fff");
      if(enableNumber)R.text(i,a[0],a[1],16.0);
      R.circle(a[0],a[1],1.5);
    });
    if(!invalid){
      path.forEach((v,c)=>{
        var t = c / path.length * 2 * Math.PI;
        var h = Math.PI * 2 / 3;
        var r = ((Math.sin(t+h)+1)*255/2) | 0;
        var g = ((Math.sin(t+0)+1)*255/2) | 0;
        var b = ((Math.sin(t-h)+1)*255/2) | 0;
        R.color("rgb("+r+","+g+","+b+")");
        R.circle(points[v[0]][0],points[v[0]][1],2.0);
        for(var i=0;i<v.length-1;i++){
          R.circle(points[v[i+1]][0],points[v[i+1]][1],2.0);
          R.line(points[v[i]][0],points[v[i]][1],points[v[i+1]][0],points[v[i+1]][1]);
        }
      });
      if(complete){
        R.line(points[path[0][0]][0],points[path[0][0]][1],points[path[0][path[0].length-1]][0],points[path[0][path[0].length-1]][1]);
      }
    }
  };
  t.info = (R,w,h)=>{
    R.base(-1,-1);
    R.color("#fff");
    R.text(caseName,10,10,30);
    if(complete)R.color("#ff0");
    if(!invalid)R.text("Score:"+score,10,40,30);
    R.base(1,1); 
    R.color("#f70");
    R.text(errMsg,w-10,h-10,30);
  };
  t.fetch = ()=>{
    var ok = true;
    var done = [];
    var p = [];
    errMsg = "";
    document.getElementById("input").value.split("\n").forEach((row)=>{
      if(!ok || row=="")return;
      var q = [];
      row.split(" ").forEach((i)=>{
        if(!ok || i=="")return;
        ix = parseInt(i);
        if(isNaN(ix))errMsg="Format Error",ok=false;
        else{
          if(done[ix]){
            errMsg = "Duplicated point : " + ix;
            ok = false;
          }else{
            q.push(ix);
            done[ix] = true;
          }
        }
      });
      if(ok && q.length>0)p.push(q);
    });
    if(ok){
      path = p;
      t.calc(p);
    }else{
      score = 0;
      invalid = true;
      if(draw)draw();
    }
  }
  t.reflect = ()=>{
    var str = "";
    path.forEach((v)=>{
      v.forEach((i)=>{
        str += i + " ";
      });
      str += "\n";
    });
    document.getElementById("input").value = str;
  };
  t.dist = (i,j)=>{
    var dx = points[i][0] - points[j][0];
    var dy = points[i][1] - points[j][1];
    return Math.round(Math.sqrt(dx*dx+dy*dy));
  }
  t.calc = ()=>{
    var ok = true;
    var sc = 0;
    invalid = false;
    complete = false;
    errMsg = "";
    pathIxs = [];
    path.forEach((v,ix)=>{
      if(!ok)return;
      if(v[0] >= points.length){
        ok = false;
        errMsg = "Invalid point : " + v[0];
        return;
      }
      pathIxs[v[0]] = {i:ix,j:0};
      for(var i=0;i<v.length-1;i++){
        if(v[i+1] >= points.length){
          ok = false;
          errMsg = "Invalid point : " + v[i+1];
          break;
        }
        sc += t.dist(v[i],v[i+1]);
        pathIxs[v[i+1]] = {i:ix,j:i+1};
      }
    });
    if(ok && path.length==1 && path[0][0]!=path[0][path[0].length-1] && path[0].length==points.length){
      complete = true;
      sc += t.dist(path[0][0],path[0][path[0].length-1]);
    }
    if(ok)score = sc;
    else invalid = true,score = 0;
    if(draw)draw();
  };
  t.nearest = (x,y,r)=>{
    var i = -1;
    var l = 0;
    for(var j=0;j<points.length;j++){
      var dx = points[j][0]-x, dy = points[j][1]-y;
      var len = Math.sqrt(dx*dx+dy*dy);
      if(len < r){
        if(i==-1 || l > len){
          i = j;
          l = len;
        }
      }
    }
    return i;
  };
  t.pathIx = (i)=>{
    if(pathIxs[i]){
      return pathIxs[i];
    }else{
      return {i:-1};
    }
  };
  t.insert = (p)=>{
    var ix = -1,jx = 0;
    var sc = 0;
    path.forEach((v,vx)=>{
      for(var i=0;i<v.length-1;i++){
        var s = -t.dist(v[i],v[i+1])+t.dist(v[i],p)+t.dist(p,v[i+1]);
        if(ix==-1 || sc > s){
          ix = vx;
          jx = i+1;
          sc = s;
        }
      }
      if(v.length==1 || v[0]!=v[v.length-1]){
        var s;
        s = t.dist(p,v[0]);
        if(ix==-1 || sc > s){
          ix = vx;
          jx = 0;
          sc = s;
        }
        s = t.dist(v[v.length-1],p);
        if(ix==-1 || sc > s){
          ix = vx;
          jx = v.length;
          sc = s;
        }
      }
    });
    if(ix==-1){
      path.push([p]);
    }else{
      path[ix].splice(jx,0,p);
      score += sc;
    }
    t.reflect();
    t.calc();
  };
  t.connectTo = (i,j)=>{
    var p = pathIxs[j];
    if(p.j==0){
      path[p.i].unshift(i);
    }else{
      path[p.i].push(i);
    }
    t.reflect();
    t.calc();
  };
  t.direct = (i)=>{
    path.push([i]);
    t.reflect();
    t.calc();
  };
  t.delete = (i)=>{
    var p = pathIxs[i];
    path[p.i].splice(p.j,1);
    var p2 = path[p.i].splice(p.j,path[p.i].length-p.j);
    if(p2.length>0){
      path.push(p2);
    }
    if(path[p.i].length==0){
      path.splice(p.i,1);
    }
    t.reflect();
    t.calc();
  };
  t.onBound = (i)=>{
    if(pathIxs[i].j == 0 || pathIxs[i].j == path[pathIxs[i].i].length-1){
      return true;
    }else{
      return false;
    }
  }
  t.unite = (i,j)=>{
    var p1 = pathIxs[i];
    var p2 = pathIxs[j];
    if(p1.j==0){
      if(p2.j==0){
        path[p1.i] = path[p1.i].reverse().concat(path[p2.i]);
      }else{
        path[p1.i] = path[p1.i].reverse().concat(path[p2.i].reverse());
      }
    }else{
      if(p2.j==0){
        path[p1.i] = path[p1.i].concat(path[p2.i]);
      }else{
        path[p1.i] = path[p1.i].concat(path[p2.i].reverse());
      }
    }
    path.splice(p2.i,1);
    t.reflect();
    t.calc();
  };
  t.same = (i,j)=>{
    return pathIxs[i].i == pathIxs[j].i;
  }
  return t;
})();

var origin = {x:0,y:0,z:1};

var draw;

function initialize(){
  var au = ["/small5.in","/rand20.in","/tsp225.in","/rand1000.in","/tech30000.in"];
  var cnt = 0;
  var points = [], origins = [];
  au.forEach((v,i)=>{
    LoadFrom(v,((i)=>(x)=>{
      points[i] = [];
      origins[i] = [];
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
        points[i].push(a);
      });
      var z = ((ya-yi)+(xa-xi))/600;
      origins[i] = {x:(xi+xa)/2,y:(yi+ya)/2,z:z};
      cnt++;
      if(cnt==5){
        TSP.init(points,origins);
        TSP.load(2);
        draw();
      }
    })(i));
  });
}

var Operate;
function initOpe(){
  Operate = (()=>{
    var o = {};
    var cvsI = document.getElementById("canvas");
    var befX, befY;
    var onWait, fstTime, dcTimer;
    var waiting = false, generator = false, lastPos;
    o.click = (x,y)=>{
      if(!TSP.available())return;
      befX = x, befY = y;
      fstTime = new Date()-0;
      var cvs = cvsI.getBoundingClientRect();
      x-=cvs.left+cvs.width/2, y-=cvs.top+cvs.height/2;
      if(y>Math.abs(cvs.height/2))return;
      x*=origin.z, y*=origin.z;
      x+=origin.x, y+=origin.y;
      var i = TSP.nearest(x,y,20*origin.z);
      waiting = false;
      onWait = false;
      if(i>=0){
        if(TSP.pathIx(i).i<0){
          waiting = true;
          lastPos = i;
        }else{
          onWait = true;
          lastPos = i;
        }
      }
    };
    o.move = (x,y)=>{
      if(!TSP.available())return;
      if(Math.abs(x-befX) + Math.abs(y-befY) < 1)return;
      var cvs = cvsI.getBoundingClientRect();
      x-=cvs.left+cvs.width/2, y-=cvs.top+cvs.height/2;
      if(y>Math.abs(cvs.height/2))return;
      x*=origin.z, y*=origin.z;
      x+=origin.x, y+=origin.y;
      if(waiting){
        waiting = false;
        TSP.direct(lastPos);
        generator = true;
      }else if(onWait){
        clearTimeout(dcTimer);
        dcTimer = 0;
        onWait = false;
        if(TSP.onBound(lastPos)){
          generator = true;
        }else{
          //
        }
      }else if(generator){
        var i = TSP.nearest(x,y,20*origin.z);
        if(i>=0){
          if(TSP.pathIx(i).i<0){
            TSP.connectTo(i,lastPos);
            lastPos = i;
          }else if(TSP.onBound(i) && !TSP.same(lastPos,i)){
            TSP.unite(i,lastPos);
            generator = false;
          }
        }
      }
    };
    o.release = (x,y)=>{
      if(!TSP.available())return;
      var cvs = cvsI.getBoundingClientRect();
      x-=cvs.left, y-=cvs.top;
      if(waiting){
        TSP.insert(lastPos);
        waiting = false;
      }else if(onWait){
        var t = new Date()-0;
        if(t-fstTime < 200){
          if(dcTimer){
            clearTimeout(dcTimer);
            dcTimer = 0;
            TSP.delete(lastPos);
          }else{
            dcTimer = setTimeout(()=>{
              if(TSP.onBound(lastPos)){
                TSP.delete(lastPos);
                TSP.insert(lastPos);
              }
              onWait = false;
              dcTimer = 0;
            },200);
          }
        }else{
          if(TSP.onBound(lastPos)){
            TSP.delete(lastPos);
            TSP.insert(lastPos);
          }
          onWait = false;
        }
      }else{
        generator = false;
      }
    };
    return o;
  })();
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
  initOpe();
  draw = (()=>{
    var cvs = document.getElementById("canvas");
    var ctx = cvs.getContext('2d');
    var R = Render(ctx);
    return ()=>{
      ctx.clearRect(0,0,cvs.width,cvs.height);
      R.translated(cvs.width/2,cvs.height/2,()=>{
        R.scaled(1/origin.z,()=>{
          R.translated(-origin.x,-origin.y,()=>{
            TSP.render(R);
          });
        });
      });
      TSP.info(R,cvs.width,cvs.height);
    };
  })();
  draw();
};

window.oncontextmenu = (e)=>{
  var cvs = document.getElementById("canvas").getBoundingClientRect();
  var y = e.clientY-cvs.top;
  if(y<0 || y>cvs.height)return true;
  return false;
}
var drag=false,dragX,dragY;
var lClick = false;
window.onmousedown = (e)=>{
  var cvs = document.getElementById("canvas").getBoundingClientRect();
  var y = e.clientY-cvs.top;
  if(y<0 || y>cvs.height)return;
  if(e.button==2){
    drag = true;
    dragX = e.clientX;
    dragY = e.clientY;
  }else{
    Operate.click(e.clientX,e.clientY);
    lClick = true;
  }
};
window.onmousemove = (e)=>{
  if(e.button==2){
    if(drag){
      origin.x -= (e.clientX - dragX)*origin.z;
      origin.y -= (e.clientY - dragY)*origin.z;
      dragX = e.clientX;
      dragY = e.clientY;
      draw();
    }
  }else{
    if(lClick)Operate.move(e.clientX,e.clientY);
  }
};
window.onmouseup = (e)=>{
  if(e.button==2){
    drag = false;
  }else{
    Operate.release(e.clientX,e.clientY);
    lClick = false;
  }
};
window.onmousewheel = (e)=>{
  var cvs = document.getElementById("canvas").getBoundingClientRect();
  var y = e.clientY-cvs.top;
  if(y<0 || y>cvs.height)return;
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
