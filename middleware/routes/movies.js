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

const cloudinary = require('../cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    if (file.fieldname === 'poster') {
      return {
        folder: 'movies/posters',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      };
    }
    return {
      folder: 'movies',
      resource_type: 'video',
      allowed_formats: ['mp4', 'mov', 'avi', 'mkv'],
    };
  },
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
router.post('/', authMiddleware, roleMiddleware('admin'), upload.fields([{ name: 'file', maxCount: 1 }, { name: 'poster', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, genre, description, releaseYear } = req.body;
    if (!title || !genre) return res.status(400).json({ error: 'Title and genre are required' })
    const fileUrl = req.files?.file ? req.files.file[0].path : null;
    const posterUrl = req.files?.poster ? req.files.poster[0].path : null;
    const movie = new Movie({ title, genre, description, releaseYear, fileUrl, posterUrl, uploadedBy: req.user._id });
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
    if (!movie.fileUrl) return res.status(404).json({ error: 'File not found' });

    res.redirect(movie.fileUrl);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Stream movie with range requests
router.get('/:id/stream', authMiddleware, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    if (!movie.fileUrl) return res.status(404).json({ error: 'File not found' });
    res.redirect(movie.fileUrl);
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
// Update a movie (admin only)
router.put('/:id', authMiddleware, roleMiddleware('admin'), upload.fields([{ name: 'file', maxCount: 1 }, { name: 'poster', maxCount: 1 }]), async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    const { title, genre, description, releaseYear } = req.body;
    if (title !== undefined) movie.title = title;
    if (genre !== undefined) movie.genre = genre;
    if (description !== undefined) movie.description = description;
    if (releaseYear !== undefined) movie.releaseYear = releaseYear;

    if (req.files?.file) movie.fileUrl = req.files.file[0].path;
    if (req.files?.poster) movie.posterUrl = req.files.poster[0].path;

    await movie.save();
    res.json(movie);
  } catch (err) {
    console.error('Update movie error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
// Delete a movie (admin only)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    // Try to remove the file from Cloudinary, but don't fail the request if this errors
    if (movie.fileUrl) {
      try {
        const publicId = movie.fileUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`movies/${publicId}`, { resource_type: 'video' });
      } catch (fileErr) {
        console.error('Cloudinary delete warning:', fileErr);
      }
    }

    await Movie.findByIdAndDelete(req.params.id);
    res.json({ message: 'Movie deleted successfully' });
  } catch (err) {
    console.error('Delete movie error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router; 