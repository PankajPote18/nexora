// use native fetch

(async () => {
    try {
        const { Category } = require('./models');
        const categories = await Category.findAll();
        console.log('Categories:', categories.map(c => c.toJSON()));
    } catch (e) {
        console.error(e);
    }
})();
