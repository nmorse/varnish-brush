var node_static = require('node-static');
var crypto = require('crypto');
var MongoClient = require('mongodb').MongoClient,
    db_varnishstats = null,
    db_varnishdomains = null,
    Oid = require('mongodb').ObjectID;
var io = require('socket.io').listen(parseInt(process.argv[3], 10));
var http = require('http');
var node_static_file = new(node_static.Server)('./client');
var secret = require('./secret.js');
var server = require('http').createServer(function (req, res) {
    req.addListener('end', function () {
        node_static_file.serve(req, res);
    });
});
var cache_lookup = require('./cache_server_list.js');

server.listen(process.argv[2]);

MongoClient.connect("mongodb://localhost:27017/iq", function(err, db) {
  if(err) { return console.dir(err); }
  db_varnishstats = db.collection('varnishstats');
  db_varnishdomains = db.collection('varnishdomains');
});

setInterval(function() {
    var i = 0, len = cache_lookup.length;
    for (i = 0; i < len; i+=1) {
        get_varnishstats(i);
    }
},240000);

function get_varnishstats(i) {
    var domain = cache_lookup[i].example_domain;
    var options = {
        host: domain,
        port: 8080,
        path: "/varnishstats",
        method: 'GET'
    };

    var req = http.request(options, function(res) {
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(res.headers));
        var subdom = subdomain;
        var i2 = i;
        res.setEncoding('utf8');
        res.on('data', function (r1) {
            var i3 = i2;
            var r2;
            var crypto_md5 = crypto.createHash('md5');
            var host = subdom+".smartcatalogiq.com";
            crypto_md5.update(r1+secret.password);
            r2 = "/"+crypto_md5.digest('hex');
            //console.log('BODY: ' + r1);
            //console.log('R2: ' + r2);
            var options = {
              host: host,
              port: 8080,
              path: r2,
              method: 'GET'
            };

            var req = http.request(options, function(res) {
              //res.setEncoding('utf8');
              res.on('data', function (chunk) {
                var vdata, stats = null, domains = null;
                chunk = chunk+"";
                if (!chunk || chunk.search(/^Page Not Found/i) >= 0 || chunk.search(/^\n$/m) >= 0) {return;}
                console.log('Data BODY: ' + chunk);
                vdata = JSON.parse(chunk);
                if (vdata.stats) {
                    stats = vdata.stats;
                    stats.cache_server = cache_lookup[i3].name;
                    domains = {};
                    domains.cache_server = cache_lookup[i3].name;
                    domains.domains = vdata.domains;
                }
                else {
                    stats = vdata;
                    stats.cache_server = cache_lookup[i3].name;
                }
                chunk = JSON.stringify(vdata);
                if (stats) {
                    db_varnishstats.insert(stats, {safe:true}, function(err, result) {
                        if (err) {console.log("MongoInsert error: "+err);}
                        //console.log("MongoInsert result: "+result);
                    });
                }
                if (domains) {
                    db_varnishdomains.insert(domains, {safe:true}, function(err, result) {
                        if (err) {console.log("MongoInsert error: "+err);} 
                        //console.log("MongoInsert db_varnishdomains result: "+result);
                    });
                }
              });
            });

            req.on('error', function(e) {
              console.log('problem with request(1): ' + e.message);
            });

            // write an empty body and send (end) it
            req.write('\n');
            req.write('\n');
            req.end();
      });
    });

    req.on('error', function(e) {
      console.log('problem with request(2): ' + e.message);
    });

    // write an empty body and send (end) it
    req.write('\n');
    req.write('\n');
    req.end();
}

io.set('log level', 1); // reduce logging
io.sockets.on('connection', function (socket) {
    socket.on('data_reqest', function (data) {
        //https://github.com/mongodb/node-mongodb-native/blob/master/Readme.md#find
        var limit = data.limit || 50;
        var cursor = db_varnishstats.find({"cache_server": data.cache_server}, ["cache_hit", "cache_miss"]);
        cursor.sort({"_id":-1}).limit(limit);
        cursor.toArray(function(err, docs) {
            socket.emit('data', {"cache_server": data.cache_server, "data":docs});
        });
        
    });
    socket.on('domains', function (data) {
        //https://github.com/mongodb/node-mongodb-native/blob/master/Readme.md#find
        var limit = data.limit || 50;
        var cursor = db_varnishstats.find({"cache_server": data.cache_server}, ["cache_hit", "cache_miss"]);
        cursor.sort({"_id":-1}).limit(limit);
        cursor.toArray(function(err, docs) {
            socket.emit('domains', {"cache_server": data.cache_server, "data":docs});
        });
    });
});

