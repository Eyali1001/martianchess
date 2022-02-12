const express = require('express')
const app = express()
const port = 3000
const http = require('http')
const server = http.createServer(app)
const { Server } = require("socket.io")
const io = new Server(server)

var sessions = {}

app.use(express.static('.'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/game.html')
})

io.on('connection', (socket) => {
    console.log(sessions)
    socket.on('game secret', (msg) => {
        console.log('got ' + msg)
        if (msg in sessions && sessions[msg].length==1){
            sessions[msg].push(socket.id)
            // send them both shit (who starts and that)
            io.to(sessions[msg][0]).emit('start game','0')
            io.to(sessions[msg][1]).emit('start game','1')
        }else if (!(msg in sessions)){
            sessions[msg] = [socket.id]
        }
    })
    socket.on("move", (msg) => {
        console.log('got move');
        //we got a move from one of the sides.
        //format is id:room id:move
        var parsed = msg.split(":")
        console.log(parsed);
        var from = parseInt(parsed[0])
        
        var to = 1^from
        if (!(parsed[1] in sessions)){return}
        io.to(sessions[parsed[1]][to]).emit('gotmove', parsed[2])
    })
    console.log('someones here')
})

server.listen(3000, () => {
  console.log(`serving peeps on 3000`)
})

