const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
}).single('file');

router.post('/catch-file', (req, res) => {
    
    upload(req, res, function(err) {
        if (err) {
            return res.status(400).json({ 
                message: 'File upload failed',
                error: err.message 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                message: 'No file received' 
            });
        }
        
        
        
        const targetDir = '/home/jake.hatcher/Fox_ETL/input/';
        const targetPath = path.join(targetDir, req.file.originalname);

        fs.writeFile(targetPath, req.file.buffer, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Failed to save file', error: err.message });
            }
            res.json({
                message: 'File saved successfully',
                filename: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                savedTo: targetPath,
                timestamp: new Date().toISOString()
            });
        });
    });
});

module.exports = router;