const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.set('view engine', 'ejs');

// Middleware to parse request bodies (for contact form submission)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Multer setup to handle file uploads
const storage = multer.memoryStorage();  // Save the image in memory for now
const upload = multer({ storage: storage });

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Harsh123@sql',
    database: 'hospital_db'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Serve static files (for CSS and other assets)
app.use(express.static(path.join(__dirname, 'public')));

// Route to render homepage
app.get('/', (req, res) => {
    const sql = "SELECT id, name, image, bio, phone_number FROM doctors";

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }

        // Convert BLOB image data to Base64 for rendering images in the browser
        const doctors = results.map(doctor => ({
            id: doctor.id,
            name: doctor.name,
            image: doctor.image ? Buffer.from(doctor.image).toString('base64') : '',
            bio: doctor.bio,
            phone_number: doctor.phone_number
        }));

        res.render('index', { doctors });
    });
});

// About page
app.get('/about', (req, res) => {
    res.render('about');
});

// Contact page
app.get('/contact', (req, res) => {
    res.render('contact');
});

// Handle form submission for the contact form
app.post('/submit-contact', (req, res) => {
    const { name, email, message } = req.body;

    // Insert contact request into database
    const sql = "INSERT INTO contact_requests (name, email, message) VALUES (?, ?, ?)";
    db.query(sql, [name, email, message], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }
        res.send("Thank you for contacting us! We'll get back to you soon.");
    });
});

// Admin page to add doctor info and view contact requests
app.get('/admin', (req, res) => {
    // Check if the user is logged in
    if (!req.session.adminLoggedIn) {
        return res.redirect('/admin-login'); // Redirect to login if not logged in
    }

    // Query to fetch doctors
    const doctorsQuery = "SELECT * FROM doctors";
    db.query(doctorsQuery, (err, doctorsResults) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }

        // Query to fetch contact form submissions
        const contactQuery = "SELECT * FROM contact_requests ORDER BY created_at DESC";
        db.query(contactQuery, (err, contactResults) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Database error");
            }

            // Render the admin page with doctors and contact form data
            res.render('admin', { doctors: doctorsResults, contactRequests: contactResults });
        });
    });
});

// Admin login page (can add session authentication)
app.get('/admin-login', (req, res) => {
    res.render('admin-login');
});

// Admin login POST route (add simple login check)
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;

    // Replace with actual admin check (e.g., from the database)
    if (username === 'admin' && password === 'admin123') {
        // Store session information
        req.session.adminLoggedIn = true;
        res.redirect('/admin');
    } else {
        res.send("Invalid credentials");
    }
});

// Admin logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send("Error logging out");
        }
        res.redirect('/'); // Redirect to the homepage after logout
    });
});

// Admin route to add doctor info
app.post('/add-doctor', upload.single('image'), (req, res) => {
    const { name, bio, phone_number } = req.body;
    const image = req.file ? req.file.buffer : null;  // Get the image data from the uploaded file

    const sql = "INSERT INTO doctors (name, image, bio, phone_number) VALUES (?, ?, ?, ?)";
    db.query(sql, [name, image, bio, phone_number], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }

        console.log("Doctor added successfully!");
        res.redirect('/admin'); // Redirect back to the admin page after adding the doctor
    });
});

// Handle deleting a doctor
app.get('/delete-doctor/:id', (req, res) => {
    const doctorId = req.params.id;

    // Delete doctor from the database
    const deleteQuery = "DELETE FROM doctors WHERE id = ?";
    db.query(deleteQuery, [doctorId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }
        res.redirect('/admin');
    });
});

// Handle deleting a contact request
app.get('/delete-contact/:id', (req, res) => {
    const requestId = req.params.id;

    // Delete contact request from the database
    const deleteQuery = "DELETE FROM contact_requests WHERE id = ?";
    db.query(deleteQuery, [requestId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }
        res.redirect('/admin');
    });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
