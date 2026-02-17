const dns = require('dns');

dns.resolveSrv('_mongodb._tcp.cluster0.dtrnvnr.mongodb.net', (err, addresses) => {
    if (err) {
        console.error('SRV Resolution Error:', err);
        return;
    }
    console.log('SRV Addresses:', addresses);
});

dns.lookup('cluster0.dtrnvnr.mongodb.net', (err, address, family) => {
    if (err) {
        console.error('Lookup Error:', err);
        return;
    }
    console.log('Lookup Address:', address);
});
