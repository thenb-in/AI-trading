const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getComments, createComment, deleteComment } = require('../views/recordCommentView');

const router = express.Router();

// Whoever can open a record can read what was said about it and add to it —
// the same reach as that record's own history. Taking a comment back is the
// author's alone, which the view enforces per comment.
router.use(authMiddleware.protect);

router.get('/', getComments);
router.post('/', createComment);
router.delete('/:id', deleteComment);

module.exports = router;
