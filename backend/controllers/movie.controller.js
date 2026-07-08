const { Movie } = require('../models');

exports.getAll = async (req, res) => {
    try {
        const movies = await Movie.findAll({ order: [['created_at', 'DESC']] });
        res.json(movies);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching movies' });
    }
};

const { Op } = require('sequelize');

exports.getOne = async (req, res) => {
    try {
        const movie = await Movie.findByPk(req.params.id);
        if (!movie) return res.status(404).json({ message: 'Movie not found' });

        // Fetch 6 recent movies to serve as "More Like This", excluding the current one
        const related = await Movie.findAll({
            where: { id: { [Op.ne]: movie.id } },
            limit: 6,
            order: [['created_at', 'DESC']]
        });

        // Combine the movie details and related movies in the response
        const movieData = movie.toJSON();
        movieData.related = related;

        res.json(movieData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching movie details' });
    }
};

const crypto = require('crypto');

exports.create = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (!payload.id) {
            payload.id = crypto.randomUUID();
        }
        
        // Ensure arrays are stringified for TEXT columns
        if (Array.isArray(payload.genres)) {
            payload.genres = JSON.stringify(payload.genres);
        }
        if (Array.isArray(payload.cast)) {
            payload.cast = JSON.stringify(payload.cast);
        }

        const movie = await Movie.create(payload);
        res.status(201).json(movie);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating movie', error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const movie = await Movie.findByPk(req.params.id);
        if (!movie) return res.status(404).json({ message: 'Movie not found' });
        
        const payload = { ...req.body };
        if (Array.isArray(payload.genres)) {
            payload.genres = JSON.stringify(payload.genres);
        }
        if (Array.isArray(payload.cast)) {
            payload.cast = JSON.stringify(payload.cast);
        }

        await movie.update(payload);
        res.json(movie);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating movie' });
    }
};

exports.remove = async (req, res) => {
    try {
        const movie = await Movie.findByPk(req.params.id);
        if (!movie) return res.status(404).json({ message: 'Movie not found' });
        await movie.destroy();
        res.json({ message: 'Movie deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting movie' });
    }
};
