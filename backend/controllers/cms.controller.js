const { CmsPage } = require('../models');

// Get a CMS page by slug
exports.getPageBySlug = async (req, res) => {
    try {
        const page = await CmsPage.findOne({ where: { slug: req.params.slug } });
        if (!page) {
            return res.status(404).json({ message: 'Page not found' });
        }
        res.json(page);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching CMS page' });
    }
};
