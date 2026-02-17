const { Resolver } = require('dns');
const resolver = new Resolver();
resolver.setServers(['8.8.8.8']);

resolver.resolveSrv('_mongodb._tcp.cluster0.dtrnvnr.mongodb.net', (err, addresses) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(JSON.stringify(addresses, null, 2));
});
