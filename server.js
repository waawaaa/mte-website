const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();

// Absolute path configuration to prevent OneDrive path errors
const jsonPath = path.join(__dirname, 'products.json');
const uploadDir = path.join(__dirname, 'public', 'uploads');

// Automated safety check: Build the uploads folder if it vanished
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Automated safety check: Build an empty database notebook if missing
if (!fs.existsSync(jsonPath)) {
    fs.writeFileSync(jsonPath, '[]');
}

// Set up image uploader configurations
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Fetch items route
app.get('/api/products', (req, res) => {
    try {
        const data = fs.readFileSync(jsonPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: "Failed to read database file." });
    }
});

// Post items route
app.post('/api/products', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("Please select and upload an image file.");
        }

        const products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        const newProduct = {
            id: Date.now(),
            section: req.body.section,
            subcategory: req.body.subcategory,
            name: req.body.name,
            description: req.body.description,
            image: `/uploads/${req.file.filename}`
        };
        
        products.push(newProduct);
        fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2));
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while trying to save your product.");
    }
});

// Delete items route
app.delete('/api/products/:id', (req, res) => {
    try {
        const targetId = parseInt(req.params.id);
        let products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        // Find the item to see what its image file name was
        const itemToDelete = products.find(p => p.id === targetId);
        
        if (itemToDelete) {
            // Safety Check: Erase the raw file from your storage folder so images don't accumulate junk space
            const imagePath = path.join(__dirname, 'public', itemToDelete.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        // Filter out the item and save the remaining database file back down
        products = products.filter(p => p.id !== targetId);
        fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2));
        
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while deleting the product.");
    }
});

// Dynamic Port Assignment for Render (defaults to 3000 locally)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MTE Server running beautifully on port ${PORT}`));