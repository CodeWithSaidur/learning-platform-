const { Resolver } = require('dns');
const resolver = new Resolver();
resolver.setServers(['8.8.8.8']);

resolver.resolveSrv('_mongodb._tcp.cluster0.dtrnvnr.mongodb.net', (err, addresses) => {
    if (err) {
        console.error('SRV Resolution Error (Google DNS):', err);
        return;
    }
    console.log('SRV Addresses (Google DNS):', addresses);

    // Try to lookup the first address
    if (addresses.length > 0) {
        resolver.resolve4(addresses[0].name, (err, ips) => {
            if (err) {
                console.error(`Lookup Error for ${addresses[0].name}:`, err);
            } else {
                console.log(`IPs for ${addresses[0].name}:`, ips);
            }
        });
    }
});
