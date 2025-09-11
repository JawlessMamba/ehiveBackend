const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController.js');

router.get('/:category', categoryController.getCategories);
router.post('/:category', categoryController.addCategory);
router.delete('/:category/:id', categoryController.deleteCategory);

module.exports = router;
