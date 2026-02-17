const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.DATABASE_URL;

mongoose.connect(uri)
    .then(() => {
        console.log('Successfully connected!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection failed:', err);
        process.exit(1);
    });
