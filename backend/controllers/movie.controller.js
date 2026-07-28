const { Movie } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

// List views (Home rows, Search results, admin table) don't need the two
// genuinely heavy fields — `description` and `cast` are TEXT('long') columns
// that can hold full paragraphs/JSON cast arrays; only the detail page reads
// them. videoUrl/trailerUrl/subtitleUrl are small STRING (URL) columns, not
// worth excluding, and the admin movies table's "Trailer" column reads
// videoUrl directly — keep everything except the two heavy TEXT columns.
const LIST_ATTRIBUTES = [
    'id', 'title', 'category_id', 'posterUrl', 'backdropUrl', 'videoUrl',
    'trailerUrl', 'subtitleUrl', 'rating', 'year', 'duration', 'genres',
    'isNew', 'isTrending', 'isOriginal', 'ageRating', 'created_at'
];

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 24;

exports.getAll = async (req, res) => {
    try {
        // Bulk fetch by explicit id list (used by HomePage to resolve tray/
        // continue-watching rows) — bounded by the caller-supplied ids, so no
        // pagination is applied and there's no full-table cost either way.
        if (req.query.ids) {
            const ids = req.query.ids.split(',').map((id) => id.trim()).filter(Boolean);
            const movies = await Movie.findAll({
                where: { id: { [Op.in]: ids } },
                attributes: LIST_ATTRIBUTES
            });
            return res.json({ data: movies, total: movies.length, page: 1, limit: movies.length, totalPages: 1 });
        }

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
        const offset = (page - 1) * limit;

        const where = {};
        if (req.query.category_id) {
            where.category_id = req.query.category_id;
        }
        if (req.query.search) {
            where.title = { [Op.like]: `%${req.query.search}%` };
        }

        const { rows, count } = await Movie.findAndCountAll({
            where,
            attributes: LIST_ATTRIBUTES,
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        res.json({
            data: rows,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching movies' });
    }
};

exports.getOne = async (req, res) => {
    try {
        const movie = await Movie.findByPk(req.params.id);
        if (!movie) return res.status(404).json({ message: 'Movie not found' });

        // "More Like This" — same category as the movie being viewed, using
        // the (category_id, created_at) index instead of a full-table scan.
        const related = await Movie.findAll({
            where: { category_id: movie.category_id, id: { [Op.ne]: movie.id } },
            attributes: LIST_ATTRIBUTES,
            limit: 6,
            order: [['created_at', 'DESC']]
        });

        const movieData = movie.toJSON();
        movieData.related = related;

        res.json(movieData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching movie details' });
    }
};

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
