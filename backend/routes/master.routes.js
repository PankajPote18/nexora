const express = require('express');
const router = express.Router();
const { 
    genreController, 
    languageController, 
    ageCertificateController, 
    matureThemeController, 
    badgeController, 
    vendorController
} = require('../controllers/master.controller');
const cacheControl = require('../middleware/cacheControl.middleware');

const createRoutes = (path, controller) => {
    router.get(path, cacheControl(), controller.getAll);
    router.get(`${path}/:id`, cacheControl(), controller.getById);
    router.post(path, controller.create);
    router.put(`${path}/:id`, controller.update);
    router.delete(`${path}/:id`, controller.delete);
};

createRoutes('/genres', genreController);
createRoutes('/languages', languageController);
createRoutes('/age-certificates', ageCertificateController);
createRoutes('/mature-themes', matureThemeController);
createRoutes('/badges', badgeController);
createRoutes('/vendors', vendorController);

module.exports = router;
