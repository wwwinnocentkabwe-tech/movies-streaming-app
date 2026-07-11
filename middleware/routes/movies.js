// routes/movies.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Movie = require('../../models/Movie');
const authMiddleware = require('../auth');
const roleMiddleware = require('../role');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../Storage'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Get all movies
router.get('/', async (req, res) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get movie by ID
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new movie (admin only)
router.post('/', authMiddleware, roleMiddleware('admin'), upload.single('file'), async (req, res) => {
  try {
    const { title, genre, description, releaseYear } = req.body;
    if (!title || !genre) return res.status(400).json({ error: 'Title and genre are required' });
    const fileUrl = req.file ? req.file.filename : null;
    const movie = new Movie({ title, genre, description, releaseYear, fileUrl, uploadedBy: req.user._id });
    await movie.save();
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Download movie file
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    const filePath = path.resolve(__dirname, '../Storage', movie.fileUrl);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Stream movie with range requests
router.get('/:id/stream', authMiddleware, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    const filePath = path.resolve(__dirname, '../Storage', movie.fileUrl);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (!range) {
      res.status(416).send('Range header required');
      return;
    }

    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, fileSize - 1);

    const stream = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'video/mp4',
    });

    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 