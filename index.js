const express = require('express')
const app = express()
const port = 3000

app.use(express.static('.'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/game.html')
})

app.listen(port, () => {
  console.log(`serving peeps on ${port}`)
})