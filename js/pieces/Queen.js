var Queen = function(pos, color){
    this.color = color;
    this.pos = pos;
}

Queen.prototype.draw = function(game){
    var tilesize = 700/8;

    game.add.triangle();
}