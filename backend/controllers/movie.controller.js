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

exports.getOne = async (req, res) => {
    try {
        const movie = await Movie.findByPk(req.params.id);
        if (!movie) return res.status(404).json({ message: 'Movie not found' });
        res.json(movie);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching movie details' });
    }
};

exports.create = async (req, res) => {
    try {
        const movie = await Movie.create(req.body);
        res.status(201).json(movie);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating movie' });
    }
};

exports.update = async (req, res) => {
    try {
        const movie = await Movie.findByPk(req.params.id);
        if (!movie) return res.status(404).json({ message: 'Movie not found' });
        await movie.update(req.body);
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
