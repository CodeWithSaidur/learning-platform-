const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const communitySchema = new mongoose.Schema({
    name: { type: String, required: true },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const Community = mongoose.models.Community || mongoose.model("Community", communitySchema);

async function test() {
    await mongoose.connect(process.env.DATABASE_URL);
    const all = await Community.find().limit(1);
    console.log('JSON.stringify(all[0]):');
    console.log(JSON.stringify(all[0]));
    process.exit(0);
}
test();
