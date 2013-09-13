varnish-brush
=============

A nodejs varnish-cache status recorder and reporter.

         ~
       /o/
     _/ /            _          _         _   _        _
    /.  \  \  / /\  |_) |\ | | (_  |_| _ |_) |_) |  | (_  |_|
    ||i./   \/ /--\ | \ | \| |  _) | |   |_) | \ \__|  _) | |
    \\\\\__ __ _ __ _ __ __ _ __ __ _ __ _ __ __ _ __ _ __ __


uses *varnish-can* (a place to dip your brush).

Collects stats from varnish servers (via varnish-can), stores data in MongoDB, and serves d3 charts displaying cache-hits, misses, percent and tree-graph of sub-domains.

