
var config = {
    type: Phaser.AUTO,
    width: 350,
    height: 700,
    backgroundColor: '#2d2d2d',
    parent: 'phaser-example',
    scene: {
        create: create,
        update: update
    }
};

var tilesize = 700/8;
var graphics;
var cs = [0x41bf63, 0x34523c];
var board = [];
var game = new Phaser.Game(config);
var chosenPiece = null;
var doupdate = true; // so we don't redraw all the time
var turn = 0;
var mode = 0; // 0 for local game, 1 for online
var whoami = 0; // for online play, do I go first
var roomid;


var Queen = function(pos){
    this.type = 0;
    this.pos = pos;
}
var Drone = function(pos){
    this.type = 1;
    this.pos = pos;
}
var Pawn = function(pos){
    this.type = 2;
    this.pos = pos;
}

function coors(x,y){
    return {'x':x,'y':y};
}

function validtile(t){
    return (t.x < 4 && t.x >= 0 && t.y < 8 && t.y >= 0);
}

Queen.prototype.getmoves = function(){
    var x = this.pos.x;
    var y = this.pos.y;
    var moves = []
    for(i=1; i<8; i++){
        moves.push(coors(x+i,y));
        moves.push(coors(x-i,y));
        moves.push(coors(x,y+i));
        moves.push(coors(x,y-i));
    }
    for(i=-8; i<9; i+=1){
            moves.push(coors(x+i,y+i));
            moves.push(coors(x-i,y+i));
    }
    moves = [...new Set(moves)];
    return moves.filter(validtile);

};
Drone.prototype.getmoves = function(){
    var x = this.pos.x;
    var y = this.pos.y;

    var moves = [];
    var i; var j;
    for(i=1; i<3; i++){
        moves.push(coors(x+i,y));
        moves.push(coors(x-i,y));
        moves.push(coors(x,y+i));
        moves.push(coors(x,y-i));
    }

    return moves.filter(validtile);
};
Pawn.prototype.getmoves = function(){
    var x = this.pos.x;
    var y = this.pos.y;

    var moves = [];
    var i; var j;
    for(i=-1; i<2; i+=2){
        for (j=-1; j<2; j+=2){
            moves.push(coors(x+i,y+j));
        }
    }
    return moves.filter(validtile);
    
};

//var p = new Pawn({'x':2,'y':2})

var Aps = [new Queen({'x':0,'y':0}),new Queen({'x':1,'y':0}),new Queen({'x':0,'y':1}), new Drone({'x':1,'y':1}),new Drone({'x':2,'y':0}),new Drone({'x':0,'y':2}), new Pawn({'x':2,'y':1}),new Pawn({'x':1,'y':2}),new Pawn({'x':2,'y':2})];

var Acapture = [];

var Bps = [new Queen({'x':3,'y':7}),new Queen({'x':3,'y':6}),new Queen({'x':2,'y':7}), new Drone({'x':2,'y':6}),new Drone({'x':1,'y':7}),new Drone({'x':3,'y':5}), new Pawn({'x':1,'y':6}),new Pawn({'x':1,'y':5}),new Pawn({'x':2,'y':5})];

var Bcapture = [];

var allps = Aps.concat(Bps);

var socket = io();
$("#joinbutton").click(function() {
    console.log("join clicked");
    var text = $("#input").val();
    roomid = text;
    socket.emit('game secret', text);
});
socket.on("start game", (msg) => {

    mode = 1; // means 2 people connected with same room id.
    whoami = parseInt(msg);
    $("#turn").text("Connected to room. you are  " + (whoami ? "Player 2" : "Player 1"));
});
socket.on("gotmove", (msg) => {
    if (turn==whoami){ //its my turn bro
        return;
    }
    //move format is x,y!nx,ny
    var p = msg.split("!");
    var oldpos = p[0].split(',');
    var newpos = p[1].split(',');
    var p = isoccupied(oldpos[0],oldpos[1]);
    var target = isoccupied(newpos[0], newpos[1]);
    if (target){capture(target);}
    p.pos.x = parseInt(newpos[0]);
    p.pos.y = parseInt(newpos[1]);
    turn = 1^turn;
    doupdate=true;
});

function drawPiece(p,g){
    //console.log("drawing piece at:");
    //console.log(p.pos.x);
    //console.log(p.pos.y);
    var x = p.pos.x * tilesize;
    var y = p.pos.y * tilesize;
    var sizes = [30,20,10];
    var size = sizes[p.type];
    var color = 0x5559c9;
    if (p.pos.y>3){
        color = 0xe6f562;
    }
    g.add.ellipse(x+50,y+50,size,size,color);
}


function isoccupied(x,y){
    allp = allps;
    for (i=0; i<allp.length;i++){
        if((allp[i].pos.x == x && allp[i].pos.y==y)){
            return allp[i];
        }
    }
    return null;
}

//1 is lower, 0 is upper
function getowner(p){
    return [0,1][+ (p.pos.y > 3)];
}

function isvalidmove(src, dst){
    var dirx = [-1,1][+ (src.x<dst.x)];
    if (src.x==dst.x){dirx=0};
    var diry = [-1,1][+ (src.y<dst.y)];
    if (src.y==dst.y){diry=0};

    //check if this ends at empty or eats
    var end = isoccupied(dst.x, dst.y);
    if (end){
        if(getowner(end)==getowner(isoccupied(src.x,src.y))){return false;}
    }

    //check if line is free

    var currpoint = {'x': src.x+dirx, 'y':src.y+diry};
    //console.log(currpoint);
    //return false;
    while(currpoint.x != dst.x || currpoint.y != dst.y ){
        var p = isoccupied(currpoint.x, currpoint.y)
        if(p){
            //console.log("shit" + dst.x.toString());
            return false;
        }
        currpoint.x += dirx; currpoint.y += diry;
    }
    return true;
}

function drawmoves(p, g)
{
    var moves = p.getmoves();
    
    var i;
    var x;
    var y;
    for (i=0; i<moves.length; i++){
        x = moves[i].x
        y = moves[i].y
        //console.log("move at "+ x.toString() + " " + y.toString());
        if (isvalidmove(p.pos, {'x':x,'y':y})){
            //console.log("we in here");
            //console.log('hmm');
            v = isoccupied(x,y);
            g.add.rectangle(x*tilesize + 50, y*tilesize + 50, tilesize, tilesize, cs[(x+y)%2]+0x555555);
            if (v){
                var size =  [30,20,10][v.type];
                g.add.ellipse(x*tilesize+50,y*tilesize+50,size,size,0xfc4503);
            }
            
        }
    }


}

function checkmove(p, dst){
    var moves = p.getmoves();
    var i;
    for(i=0;i<moves.length; i++){
        x = moves[i].x
        y = moves[i].y
        if ((dst.x==x && dst.y==y) && isvalidmove(p.pos, {'x':x,'y':y})){
            return true;
        }
    }
    return false;
}

function calcscore(list){
    var result=0;
    var values = [3,2,1];
    var i;
    for(i=0;i<list.length;i++){
        result += values[list[i].type];
    }
    return result;
}

function capture(p){
    var index = allps.indexOf(p);
    allps.splice(index,1);

    ((p.pos.y > 3) ? Acapture.push(p) : Bcapture.push(p));
}

function onclick(pointer){
    doupdate = true;
    console.log('clicked!');
    var x = parseInt(pointer.x/tilesize);
    var y = parseInt(pointer.y/tilesize);
    console.log(x.toString() + ' ' + y.toString());
    var c = isoccupied(x,y);
    if (chosenPiece && checkmove(chosenPiece, {'x':x, 'y':y})){
        if (c){
            console.log("occupied!");
            //console.log('capturing at' + c.pos.x.toString() + ' ' + c.pos.y.toString());
            capture(c);
        }
        var oldpos = [chosenPiece.pos.x, chosenPiece.pos.y];
        chosenPiece.pos.x = x;
        chosenPiece.pos.y = y;
        //taking = true;
        turn = [1,0][turn];
        //emit the move that just happened
        var move = [whoami.toString(), ':', roomid, ":", oldpos[0],",",oldpos[1],"!",x,',',y];
        socket.emit('move', "".concat(...move));
        chosenPiece = null;
    } else if (c){
        if (whoami==turn && (whoami || !(c.pos.y>3))){
            chosenPiece = c;
        }
        
    }
    

}


function drawboard(g){
    //draw board lol
    var i = 0;
    var j = 0;

    for(i=0; i<4; i++){
        var row = [];
        for(j=0; j<8; j++){
            g.add.rectangle(i*tilesize + 50, j*tilesize + 50,tilesize,tilesize, cs[(i+j)%2]);
        }
    }

    var allp = allps;
    for (i=0; i<allp.length;i++){
        drawPiece(allp[i], g);
    }
    
}

function create ()
{
    
    graphics = this.add.graphics({ x: 0, y: 0 });

    this.input.on('pointerdown',onclick, this);
}

function update()
{
    if (!doupdate){
        return;
    }
    $("#score1").text(calcscore(Acapture).toString());
    $("#score2").text(calcscore(Bcapture).toString());
    if (turn==1){
        $("#turn").text("player 2's turn");
    } else {
        $("#turn").text("player 1's turn");
    }
    doupdate=false;
    drawboard(this)
    graphics.clear();
    if (chosenPiece){
        drawmoves(chosenPiece, this);
    }
    //drawClock(400, 300, timerEvent);
}
