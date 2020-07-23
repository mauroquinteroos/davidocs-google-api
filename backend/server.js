const express = require('express')
const multer = require('multer')
const cors = require('cors')
const app = express()

// Middlewares
app.use(cors())

// Multer configuration
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb('', `${file.originalname}`)
})
const upload = multer({
  storage: storage
})

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})
app.post('/files', upload.single('file'), (req, res) => {
  res.send('Archivo recibido')
})

const port = 8000
app.listen(port, () => console.log(`Server started in port ${port}`))