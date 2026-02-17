const fetch = require('node-fetch');

async function testApi() {
    try {
        const res = await fetch('http://localhost:3000/api/communities/all');
        if (!res.ok) {
            console.log('API responded with:', res.status);
            const text = await res.text();
            console.log('Body:', text);
            return;
        }
        const data = await res.json();
        console.log('Sample item from /api/communities/all:');
        if (data.length > 0) {
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log('No communities found.');
        }
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

testApi();
