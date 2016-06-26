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
  r.translatedY = function*(x,y,f){
    ctx.count++;
    ctx.save();
    ctx.translate(x,y);
    var y = f();
    while(!y.next().done)yield;
    ctx.restore();
    ctx.count--;
  };
  r.rotatedY = function*(a,f){
    ctx.count++;
    ctx.save();
    ctx.rotate(a);
    var y = f();
    while(!y.next().done)yield;
    ctx.restore();
    ctx.count--;    
  };
  r.scaledY = function*(d,f){
    ctx.count++;
    ctx.save();
    ctx.scale(d,d);
    var zs = zoom;
    zoom *= d;
    var y = f();
    while(!y.next().done)yield;
    zoom = zs;
    ctx.restore();
    ctx.count--;
  };
  r.init = ()=>{
    zoom = 1;
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
  var busy = false;

  var minScore = -1;
  var minPath = null;

  var errMsg = "";

  t.available = ()=>{
    return !invalid && !busy;
  }
  t.init = (p,o)=>{
    defPoints = p;
    defOrigins = o;
  }
  t.load = (x)=>{
    points = defPoints[x];
    origin = {x:defOrigins[x].x,y:defOrigins[x].y,z:defOrigins[x].z};
    var cn = ["small5","rand20","tsp225","rand1000","tech30000"][x];
    if(cn != caseName){
      caseName = cn;
      minScore = -1;
      minPath = null;
    }
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
  t.render = function*(R){
    var count = (()=>{
      var c = 0;
      return ()=>{
        c++;
        return c%100==0;
      }
    })();
    R.base(-1,-1);
    for(var i=0;i<points.length;i++){
      var a = points[i];
      R.color("#fff");
      if(enableNumber)R.text(i,a[0],a[1],16.0);
      R.circle(a[0],a[1],1.5);
      if(count())yield;
    }
    if(!invalid){
      for(var c=0;c<path.length;c++){
        var v = path[c];
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
          if(count())yield;
        }
      }
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
    if(ok){
      score = sc;
      if(complete){
        if(minScore == -1 || minScore > score){
          minScore = score;
          minPath = JSON.parse(JSON.stringify(path));
        }
      }
    }else invalid = true,score = 0;
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
  t.randomPath = ()=>{
    var p = [];
    for(var i=0;i<points.length;i++)p.push(i);
    for(var j=0;j<p.length-1;j++){
      var k = Math.floor(Math.random()*(p.length-j-1))+1;
      var m = p[j];
      p[j] = p[k];
      p[k] = m;
    }
    path = [p];
    t.reflect();
    t.calc();
  };
  t.minScore = ()=>{
    return minScore;
  };
  t.overrideMinimum = ()=>{
    path = JSON.parse(JSON.stringify(minPath));
    t.reflect();
    t.calc();
  };
  (()=>{
    var ti = null;
    t.opt = ()=>{
      busy = true;
      var count = (()=>{
        var c = 0;
        return ()=>{
          c++;
          return c%100==0;
        }
      })();
      var kon = (function*(){
        while(1){
          var done = true;
          for(var i=0;i<path.length;i++){
            if(path[i].length==1)continue;
            for(var j=0;j<path[i].length-1;j++){
              for(var l=j+2;l<path[i].length-1;l++){
                var cd = 0;
                cd -= t.dist(path[i][j],path[i][j+1]) + t.dist(path[i][l],path[i][l+1]);
                cd += t.dist(path[i][j],path[i][l]) + t.dist(path[i][j+1],path[i][l+1]);
                if(cd < 0){
                  done = false;
                  var he = path[i].slice(0,j+1);
                  var sl = path[i].slice(j+1,l+1).reverse();
                  var tl = path[i].slice(l+1,path[i].length);
                  path[i] = [].concat(he,sl,tl);
                  if(count())yield;
                }
              }
              {
                var le = path[i].length-1;
                var cd = 0;
                cd -= t.dist(path[i][j],path[i][j+1]) + t.dist(path[i][0],path[i][le]);
                cd += t.dist(path[i][j],path[i][le]) + t.dist(path[i][j+1],path[i][0]);
                if(cd < 0){
                  done = false;
                  var he = path[i].slice(0,j+1).reverse();
                  var sl = path[i].slice(j+1,le+1);
                  path[i] = [].concat(he,sl);
                  if(count())yield;
                }
              }
            }
          }
          if(done)break;
          yield;
        }
      })();
      ti = setInterval(()=>{
        if(kon.next().done){
          busy = false;
          clearInterval(ti);
          ti = null;
        }
        t.reflect();
        t.calc();
      },30);
    };
    t.opting = ()=>{
      return ti!=null;
    };
    t.stopOpt = ()=>{
      busy = false;
      clearInterval(ti);
      ti = null;
      t.reflect();
      t.calc();
    };
  })();
  (()=>{
    var ti = null;
    t.nearestNeighbor = ()=>{
      busy = true;
      var count = (()=>{
        var c = 0;
        var d = Math.floor(points.length/100)+1;
        return ()=>{
          c++;
          return c%d==0;
        }
      })();
      var kon = (function*(){
        path = [];
        p = [];
        path.push(p);
        var cur = Math.floor(Math.random()*points.length);
        p.push(cur);
        var done = [];
        done[cur]=true;
        while(p.length!=points.length){
          var n = -1,d = -1;
          for(var i=0;i<points.length;i++){
            if(!done[i]){
              var l = t.dist(cur,i);
              if(n==-1 || d>l){
                n = i;
                d = l;
              }
            }
          }
          if(n!=-1){
            p.push(n);
            cur = n;
            done[n]=true;
          }
          if(count())yield;
        }
      })();
      ti = setInterval(()=>{
        if(kon.next().done){
          busy = false;
          clearInterval(ti);
          ti = null;
        }
        t.reflect();
        t.calc();
      },30);
    };
    t.nning = ()=>{
      return ti!=null;
    };
    t.stopNN = ()=>{
      busy = false;
      clearInterval(ti);
      ti = null;
      t.reflect();
      t.calc();
    };
  })();
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
    ctx.count = 0;
    var R = Render(ctx);
    var kTimer = null;
    return ()=>{
      if(kTimer){
        while(ctx.count>0){
          ctx.restore();
          ctx.count--;
        }
        R.init();
        clearInterval(kTimer);
      }
      ctx.clearRect(0,0,cvs.width,cvs.height);
      var kont = (function*(){
        TSP.info(R,cvs.width,cvs.height);
        R.base(-1,1);
        R.color("#fff");
        if(TSP.nning()){
          R.text("[NearestNeighbor]",10,cvs.height-10,30);
        }else{
          R.text("NearestNeighbor",10,cvs.height-10,30);
        }
        R.text("RandomPath",10,cvs.height-40,30);
        if(TSP.opting()){
          R.text("[2-opt]",10,cvs.height-70,30);
        }else{
          R.text("2-opt",10,cvs.height-70,30);
        }
        //R.text("SA",10,cvs.height-100,30);
        R.base(1,-1);
        if(TSP.minScore()!=-1){
          R.text("Minimum:"+TSP.minScore(),cvs.width-10,10,30);
        }
        var r = TSP.render(R);
        var k1 = R.translatedY(cvs.width/2,cvs.height/2,function*(){
          var k2 = R.scaledY(1/origin.z,function*(){
            var k3 = R.translatedY(-origin.x,-origin.y,function*(){
              r.next();
              while(!r.next().done)yield;
            });
            k3.next();
            while(!k3.next().done)yield;
          });
          k2.next();
          while(!k2.next().done)yield;
        });
        k1.next();
        while(!k1.next().done)yield;
      })();
      /*kont.next();
      kTimer = setInterval(()=>{
        var b = kont.next().done;
        if(b){
          clearInterval(kTimer);
          kTimer = null;
        }
      },30);*/
      while(!kont.next().done);
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
    var x = e.clientX;
    if(y>cvs.height-140 && y<cvs.height-110){
      //if(x<60 && TSP.available())TSP.SA();
    }else if(y>cvs.height-110 && y<cvs.height-70){
      if(x<110){
        if(TSP.opting())TSP.stopOpt();
        else if(TSP.available())TSP.opt();
      }
    }else if(y>cvs.height-70 && y<cvs.height-40){
      if(x<190 && TSP.available())TSP.randomPath();
    }else if(y>cvs.height-40 && y<cvs.height-10){
      if(x<250){
        if(TSP.nning())TSP.stopNN();
        else if(TSP.available())TSP.nearestNeighbor();
      }
    }else if(10<y && y<50){
      if(x>cvs.width-200 && TSP.minScore()!=-1){
        TSP.overrideMinimum();
      }
    }
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
    else{
      var cvs = document.getElementById("canvas").getBoundingClientRect();
      var y = e.clientY-cvs.top;
      var x = e.clientX;
      document.body.style.cursor = "auto";
      if(y>cvs.height-140 && y<cvs.height-110){
        //if(x<60)document.body.style.cursor = "pointer";
      }else if(y>cvs.height-110 && y<cvs.height-70){
        if(x<110)document.body.style.cursor = "pointer";
      }else if(y>cvs.height-70 && y<cvs.height-40){
        if(x<190)document.body.style.cursor = "pointer";
      }else if(y>cvs.height-40 && y<cvs.height-10){
        if(x<250)document.body.style.cursor = "pointer";
      }else if(10<y && y<50){
        if(x>cvs.width-200 && TSP.minScore()!=-1){
         　document.body.style.cursor = "pointer";
        }
      }
    }
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
    origin.z *= 1.1;
  }else{
    origin.z /= 1.1;
  }
  origin.x -= (e.clientX-cvs.left-cvs.width/2) * origin.z;
  origin.y -= (e.clientY-cvs.top-cvs.height/2) * origin.z;
  draw();
}
