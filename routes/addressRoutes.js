const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require('../controllers/addressController');

router.use(protect);

router.route('/').get(getAddresses).post(addAddress);
router.route('/:id').put(updateAddress).delete(deleteAddress);
router.patch('/:id/default', setDefaultAddress);

module.exports = router;