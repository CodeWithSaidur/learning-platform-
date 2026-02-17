const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Define schema simplified
const communitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const Community = mongoose.models.Community || mongoose.model("Community", communitySchema);

async function testQuery() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected');
        const all = await Community.find();
        console.log('Found:', all.length);
        if (all.length > 0) {
            console.log('First Item JSON:', JSON.stringify(all[0].toJSON(), null, 2));
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

testQuery();
