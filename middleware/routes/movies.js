// routes/movies.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Movie = require('../../models/Movie');
const authMiddleware = require('../auth');
const roleMiddleware = require('../role');
const { validationRules, handleValidationErrors } = require('../validators');

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalMovies = await Movie.countDocuments();
    const movies = await Movie.find().skip(skip).limit(limit);

res.json({
      movies,
      totalPages: Math.ceil(totalMovies / limit),
      currentPage: page,
      totalMovies
    });
  } catch (err) {
    console.error('Get movies error:', err);
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
    console.error('Add movie error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
// Rate a movie (1-5 stars) — one rating per user, re-rating updates it in place
router.post(
  '/:id/rate',
  authMiddleware,
  validationRules.rating,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { rating } = req.body;
      const movie = await Movie.findById(req.params.id);
      if (!movie) return res.status(404).json({ error: 'Movie not found' });

      const existingRating = movie.ratings.find(r => r.user.toString() === req.user._id.toString());
      if (existingRating) {
        existingRating.rating = rating;
      } else {
        movie.ratings.push({ user: req.user._id, rating });
      }

      const total = movie.ratings.reduce((sum, r) => sum + r.rating, 0);
      movie.averageRating = total / movie.ratings.length;

      await movie.save();
      res.json({ averageRating: movie.averageRating, ratingCount: movie.ratings.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);
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